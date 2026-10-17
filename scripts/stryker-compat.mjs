// StrykerJS 10.0.0 を Vitest 5 で正しく動かすための一時的な互換処理。
// このプロジェクトの node_modules にある3ファイルだけを、ミューテーションテストの実行前に書き換える。
// 上流で修正された版へ更新するときは checkVersions が止めるので、README の手順で確認してから削除する。
import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

export const expectedVersions = {
  '@stryker-mutator/vitest-runner': '10.0.0',
  '@stryker-mutator/instrumenter': '10.0.0',
}

const runnerEdits = [{
  from: "return nameParts.join(' ').trim();",
  to: "return nameParts.join(' > ' /* overstrata-board: stryker-js#6210 */).trim();",
}]

export const compatPatches = [
  // Vitest 5 はテスト名の絞り込みを「describe > test」で照合する。runner は空白区切りで名前を作るため、
  // 変異ごとの実行でテストが1件も選ばれず、全変異が Survived になる。テスト ID とカバレッジの両方をそろえる。
  {
    issue: 'stryker-js#6210',
    pkg: '@stryker-mutator/vitest-runner',
    file: 'dist/src/test-helpers.js',
    edits: runnerEdits,
  },
  {
    issue: 'stryker-js#6210',
    pkg: '@stryker-mutator/vitest-runner',
    file: 'dist/src/stryker-setup.js',
    edits: runnerEdits,
  },
  // `式 as 型` を丸ごと型として飛ばすため、`{ ... } as const` の中の定数が変異されずレポートから消える。
  // as 式は辿り、型の部分（TSType）だけを飛ばす。
  {
    issue: 'stryker-js#6208',
    pkg: '@stryker-mutator/instrumenter',
    file: 'dist/src/util/syntax-helpers.js',
    edits: [
      {
        from: "    'TSAsExpression',\n    'TSInterfaceDeclaration',",
        to: "    /* overstrata-board: stryker-js#6208 TSAsExpression */\n    'TSInterfaceDeclaration',",
      },
      {
        from: '    return (path.isTypeAnnotation() ||\n        flowTypeAnnotationNodeTypes',
        to: '    return (path.isTypeAnnotation() ||\n        path.isTSType() || /* overstrata-board: stryker-js#6208 */\n'
          + '        flowTypeAnnotationNodeTypes',
      },
    ],
  },
]

function occurrences(text, part) {
  return text.split(part).length - 1
}

/** 全置換が未適用なら適用し、全置換が適用済みなら何もしない。それ以外は止める。 */
export function applyEdits(text, edits) {
  const applied = edits.map(({ from, to }) => occurrences(text, to) === 1 && !text.includes(from))
  if (applied.every(Boolean)) return { text, state: 'already' }
  if (applied.some(Boolean)) throw new Error('一部の置換だけが適用済みです')

  let next = text
  for (const { from } of edits) {
    const count = occurrences(next, from)
    if (count !== 1) throw new Error(`置換前の文字列が${count}件あります（1件のはず）: ${JSON.stringify(from)}`)
  }
  for (const { from, to } of edits) next = next.replace(from, () => to)
  return { text: next, state: 'applied' }
}

/** 互換処理の前提とする版と一致しなければ止める。 */
export function checkVersions(installed) {
  const errors = Object.entries(expectedVersions)
    .filter(([pkg, version]) => installed[pkg] !== version)
    .map(([pkg, version]) => `${pkg} は ${version} のはずが ${installed[pkg] ?? '未導入'}`)
  if (!/^5\.\d+\.\d+$/.test(installed.vitest ?? '')) {
    errors.push(`vitest は 5 系のはずが ${installed.vitest ?? '未導入'}`)
  }
  if (errors.length > 0) {
    throw new Error(`互換処理の前提と版が違います。README の「互換処理を外す手順」を確認してください:\n${errors.join('\n')}`)
  }
}

async function readVersion(root, pkg) {
  const file = path.join(root, 'node_modules', pkg, 'package.json')
  return existsSync(file) ? JSON.parse(await readFile(file, 'utf8')).version : undefined
}

/** root/node_modules に互換処理を適用し、ファイルごとの結果を返す。 */
export async function applyCompat(root) {
  const installed = {}
  for (const pkg of [...Object.keys(expectedVersions), 'vitest']) installed[pkg] = await readVersion(root, pkg)
  checkVersions(installed)
  // 別の場所に入れ子で導入された版は書き換えられないため、配置も確かめる。
  for (const nested of ['@stryker-mutator/core/node_modules/@stryker-mutator/instrumenter',
    '@stryker-mutator/vitest-runner/node_modules/vitest']) {
    if (existsSync(path.join(root, 'node_modules', nested))) {
      throw new Error(`想定外の配置です: node_modules/${nested}`)
    }
  }

  const results = []
  for (const { issue, pkg, file, edits } of compatPatches) {
    const target = path.join(root, 'node_modules', pkg, file)
    const { text, state } = applyEdits(await readFile(target, 'utf8'), edits)
    if (state === 'applied') await writeFile(target, text)
    results.push({ issue, file: `${pkg}/${file}`, state })
  }
  return results
}
