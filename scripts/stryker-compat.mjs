import { createHash } from 'node:crypto'
import { readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

// Temporary upstream fixes: stryker-js #6210 and #6208. Update only after real CLI verification.
const patches = [
  {
    file: '@stryker-mutator/vitest-runner/dist/src/test-helpers.js',
    before: '120ef95f006b5449019155f93c049d888f2c73b525cfd57a9131ebe3d953535e',
    after: '13db8fafa22afcbdb9370cee12e7ac7070a58e6a4298853a44346f6c9a21106f',
    transform: fixTestNames,
  },
  {
    file: '@stryker-mutator/vitest-runner/dist/src/stryker-setup.js',
    before: '11ea94ed9ba49a916fb0f6cbb365e896f4ce67958009f7a4320ceebaba14febb',
    after: '400e0e3d5b6b3cc7f1e736ff2d2b301c6231a85b93e1896d6d6a53502c11ded7',
    transform: fixTestNames,
  },
  {
    file: '@stryker-mutator/instrumenter/dist/src/util/syntax-helpers.js',
    before: 'd66d5f1e1f37a219ef77478109192940edd2fb7ad055c4e118ca4634ce9042fb',
    after: '111e23ddb4fcd7d859fdbe272a863f02b6750ffd9fff5bd4c06f297b127e69e0',
    transform: (source) => source
      .replace('return (path.isTypeAnnotation() ||', 'return (path.isTypeAnnotation() || path.isTSType() ||')
      .replace("    'TSAsExpression',\n", ''),
  },
]
function fixTestNames(source) {
  return source.replace("return nameParts.join(' ').trim();", "return nameParts.filter((part) => part !== '').join(' > ').trim();")
}
const hash = (value) => createHash('sha256').update(value).digest('hex')

export function applyCompatibilityFix(root = process.cwd()) {
  const worktree = realpathSync(root)
  function localFile(file) {
    const actual = realpathSync(join(worktree, 'node_modules', file))
    const location = relative(worktree, actual)
    if (location === '..' || location.startsWith(`..${sep}`)) {
      throw new Error(`worktree外の依存には適用できません: ${file}`)
    }
    return actual
  }
  const version = (pkg) => JSON.parse(readFileSync(localFile(`${pkg}/package.json`), 'utf8')).version
  if (!/^5\./.test(version('vitest'))) throw new Error('Vitest 5以外は互換処理を再検証してください')
  for (const pkg of ['@stryker-mutator/core', '@stryker-mutator/vitest-runner', '@stryker-mutator/instrumenter']) {
    if (version(pkg) !== '10.0.0') throw new Error(`${pkg}: 対応版は10.0.0です。互換処理を再検証してください`)
  }
  // Verify every file before writing any file. Unknown installs fail closed.
  const verified = patches.map((patch) => {
    const path = localFile(patch.file)
    const source = readFileSync(path, 'utf8')
    const digest = hash(source)
    if (digest !== patch.before && digest !== patch.after) throw new Error(`SHA256不一致: ${patch.file}`)
    const output = digest === patch.after ? source : patch.transform(source)
    if (hash(output) !== patch.after) throw new Error(`修正後SHA256不一致: ${patch.file}`)
    return { ...patch, path, output, applied: digest === patch.before }
  })
  for (const patch of verified) if (patch.applied) writeFileSync(patch.path, patch.output)
  return verified.map(({ file, before, after, applied }) => ({ file, before, after, applied }))
}
