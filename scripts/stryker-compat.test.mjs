import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { applyCompat, applyEdits, checkVersions, compatPatches } from './stryker-compat.mjs'

const edit = { from: "join(' ')", to: "join(' > ' /* fix */)" }

test('置換前の文字列が1回だけあれば置き換える', () => {
  assert.deepEqual(applyEdits("a.join(' ').trim()", [edit]),
    { text: "a.join(' > ' /* fix */).trim()", state: 'applied' })
})

test('適用済みなら変更しない', () => {
  const text = "a.join(' > ' /* fix */).trim()"
  assert.deepEqual(applyEdits(text, [edit]), { text, state: 'already' })
})

test('置換前・適用済みのどちらの文字列も無ければ止める', () => {
  assert.throws(() => applyEdits("a.join('-').trim()", [edit]))
})

test('置換前の文字列が複数あれば止める', () => {
  assert.throws(() => applyEdits("join(' ') join(' ')", [edit]))
})

test('一部の置換だけが適用済みの状態は止める', () => {
  const second = { from: 'b()', to: 'c() /* fix */' }
  assert.throws(() => applyEdits("a.join(' > ' /* fix */) b() c() /* fix */ b()", [edit, second]))
})

test('Stryker が 10.0.0 で Vitest が 5 系のときだけ通す', () => {
  const ok = {
    '@stryker-mutator/vitest-runner': '10.0.0',
    '@stryker-mutator/instrumenter': '10.0.0',
    vitest: '5.0.3',
  }
  assert.doesNotThrow(() => checkVersions(ok))
  assert.throws(() => checkVersions({ ...ok, '@stryker-mutator/vitest-runner': '10.0.1' }), /vitest-runner/)
  assert.throws(() => checkVersions({ ...ok, '@stryker-mutator/instrumenter': '10.1.0' }), /instrumenter/)
  assert.throws(() => checkVersions({ ...ok, vitest: '4.1.11' }), /vitest/)
  assert.throws(() => checkVersions({ ...ok, vitest: undefined }), /vitest/)
})

// 置換内容が上流 10.0.0 の実際のコードに当たることを、該当箇所の写しで確かめる。
const upstream = {
  'dist/src/test-helpers.js': `    while (currentSuite) {
        nameParts.unshift(currentSuite.name);
        currentSuite = currentSuite.suite;
    }
    return nameParts.join(' ').trim();
}`,
  'dist/src/util/syntax-helpers.js': `export function isTypeNode(path) {
    return (path.isTypeAnnotation() ||
        flowTypeAnnotationNodeTypes.includes(path.node.type) ||
        tsTypeAnnotationNodeTypes.includes(path.node.type) ||
        isDeclareVariableStatement(path) ||
        isDeclareModule(path));
}
const tsTypeAnnotationNodeTypes = Object.freeze([
    'TSAsExpression',
    'TSInterfaceDeclaration',
    'TSTypeAnnotation',
]);`,
}
upstream['dist/src/stryker-setup.js'] = upstream['dist/src/test-helpers.js']

test('上流のテスト名は Vitest 5 と同じ " > " 区切りにする（stryker-js#6210）', () => {
  const runner = compatPatches.filter((patch) => patch.pkg === '@stryker-mutator/vitest-runner')
  assert.deepEqual(runner.map((patch) => patch.file).sort(),
    ['dist/src/stryker-setup.js', 'dist/src/test-helpers.js'])
  for (const patch of runner) {
    const { text } = applyEdits(upstream[patch.file], patch.edits)
    assert.match(text, /return nameParts\.join\(' > '.*\)\.trim\(\);/)
  }
})

test('as 式は型の部分だけを飛ばし、中の実行式は変異させる（stryker-js#6208）', () => {
  const [patch] = compatPatches.filter((p) => p.pkg === '@stryker-mutator/instrumenter')
  assert.equal(patch.file, 'dist/src/util/syntax-helpers.js')
  const { text } = applyEdits(upstream[patch.file], patch.edits)
  assert.doesNotMatch(text, /'TSAsExpression'/)
  assert.match(text, /path\.isTypeAnnotation\(\) \|\|\s+path\.isTSType\(\) \|\|/)
  assert.match(text, /'TSInterfaceDeclaration'/)
})

// applyCompat は実際の一時ディレクトリの node_modules に対して動かし、書き込まれたバイトを確かめる。
async function fakeInstall(files, versions = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'stryker-compat-'))
  const all = {
    '@stryker-mutator/vitest-runner': '10.0.0',
    '@stryker-mutator/instrumenter': '10.0.0',
    vitest: '5.0.3',
    ...versions,
  }
  for (const [pkg, version] of Object.entries(all)) {
    await mkdir(path.join(root, 'node_modules', pkg), { recursive: true })
    await writeFile(path.join(root, 'node_modules', pkg, 'package.json'), JSON.stringify({ version }))
  }
  for (const { pkg, file } of compatPatches) {
    const target = path.join(root, 'node_modules', pkg, file)
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, files[file] ?? upstream[file])
  }
  return root
}

async function readTargets(root) {
  return Promise.all(compatPatches.map(({ pkg, file }) => readFile(path.join(root, 'node_modules', pkg, file), 'utf8')))
}

test('最後の対象だけ内容が未知なら、先の対象も書き換えずに失敗する', async (t) => {
  const root = await fakeInstall({ 'dist/src/util/syntax-helpers.js': 'export function isTypeNode() {}\n' })
  t.after(() => rm(root, { recursive: true, force: true }))
  const before = await readTargets(root)
  await assert.rejects(applyCompat(root), /置換前の文字列が0件/)
  assert.deepEqual(await readTargets(root), before)
})

test('版が違えば、どの対象も書き換えずに失敗する', async (t) => {
  const root = await fakeInstall({}, { '@stryker-mutator/instrumenter': '10.0.1' })
  t.after(() => rm(root, { recursive: true, force: true }))
  const before = await readTargets(root)
  await assert.rejects(applyCompat(root), /instrumenter/)
  assert.deepEqual(await readTargets(root), before)
})

test('未適用の対象に適用し、再実行では何も変えない', async (t) => {
  const root = await fakeInstall({})
  t.after(() => rm(root, { recursive: true, force: true }))
  assert.deepEqual((await applyCompat(root)).map((r) => r.state), ['applied', 'applied', 'applied'])
  const patched = await readTargets(root)
  assert.deepEqual(patched, compatPatches.map(({ file, edits }) => applyEdits(upstream[file], edits).text))
  assert.deepEqual((await applyCompat(root)).map((r) => r.state), ['already', 'already', 'already'])
  assert.deepEqual(await readTargets(root), patched)
})

test('適用済みと未適用が混ざっていれば、未適用の対象だけに適用する', async (t) => {
  const [first] = compatPatches
  const done = applyEdits(upstream[first.file], first.edits).text
  const root = await fakeInstall({ [first.file]: done })
  t.after(() => rm(root, { recursive: true, force: true }))
  assert.deepEqual((await applyCompat(root)).map((r) => r.state), ['already', 'applied', 'applied'])
  assert.deepEqual(await readTargets(root), compatPatches.map(({ file, edits }) => applyEdits(upstream[file], edits).text))
})
