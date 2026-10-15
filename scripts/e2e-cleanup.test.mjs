import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { chmod, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { setTimeout } from 'node:timers/promises'
import { test } from 'node:test'

// Docker CLI is the external boundary. Deterministically exercise a delayed
// creation response and failures that a real daemon cannot reliably reproduce.
// The real Docker/Chromium interruption checks are recorded separately in the PR.
const fakeDocker = `#!/usr/bin/env node
const fs = require('node:fs');
process.on('SIGINT', () => {});
process.on('SIGTERM', () => {});
const args = process.argv.slice(2);
const file = process.env.FAKE_STATE;
const state = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : {};
function save() { fs.writeFileSync(file, JSON.stringify(state)); }
function fail() { console.error('daemon unavailable'); process.exit(1); }
if (args[0] === 'compose') {
  state.project = args[2];
  const command = args[5];
  if (command === 'build') state.images = true;
  if (command === 'up') { state.app = true; state.network = true; }
  if (command === 'run') {
    save();
    fs.writeFileSync(file + '.starting', '');
    setTimeout(() => { state.runner = true; state.runnerWasCreated = true; save(); console.log('runner-id'); }, 300);
    return;
  }
  if (command === 'down') {
    state.app = false;
    // down can report success while an attached container still owns resources.
    if (!state.runner) {
      state.images = false;
      state.network = process.env.FAKE_LEFTOVER === '1';
    }
  }
  save();
} else if (args[0] === 'rm') {
  if (args[2] !== state.project + '-runner') throw Error('unowned removal');
  if (process.env.FAKE_RM_FAIL === '1') fail();
  state.runner = false; save();
} else if (args[0] === 'logs') {
  console.log('test output');
} else if (args[0] === 'wait') {
  console.log(process.env.FAKE_TEST_EXIT || '0');
} else if (['container', 'network', 'image'].includes(args[0])) {
  if (process.env.FAKE_QUERY_FAIL === '1') fail();
  const target = args.at(-1);
  if (!target.includes(state.project)) throw Error('unscoped resource query');
  const exists = args[0] === 'image' ? state.images
    : args[0] === 'network' ? state.network
    : target.includes('-runner') ? state.runner : state.app;
  if (exists) console.log('remaining-resource-id');
} else {
  throw Error('unexpected docker command: ' + args.join(' '));
}
`

async function run(t, env = {}, interrupt = false) {
  await mkdir('e2e-artifacts', { recursive: true })
  const dir = await mkdtemp(path.resolve('e2e-artifacts/cleanup-test-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  await mkdir(path.join(dir, 'scripts'))
  await writeFile(path.join(dir, 'package.json'), '{"type":"commonjs"}')
  await copyFile('scripts/e2e.sh', path.join(dir, 'scripts/e2e.sh'))
  await writeFile(path.join(dir, 'docker'), fakeDocker)
  await chmod(path.join(dir, 'docker'), 0o755)
  const stateFile = path.join(dir, 'state.json')
  const child = spawn('sh', ['scripts/e2e.sh', '--docker'], {
    cwd: dir,
    detached: true,
    env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, FAKE_STATE: stateFile, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  t.after(() => { if (child.exitCode === null) child.kill('SIGKILL') })
  let output = ''
  child.stdout.on('data', (chunk) => { output += chunk })
  child.stderr.on('data', (chunk) => { output += chunk })
  const completion = once(child, 'close')
  if (interrupt) {
    const deadline = Date.now() + 5000
    while (true) {
      try { await readFile(`${stateFile}.starting`); break } catch { /* wait for request */ }
      assert.ok(Date.now() < deadline, 'runner creation started')
      await setTimeout(10)
    }
    process.kill(-child.pid, 'SIGINT')
  }
  const [code] = await completion
  return { code, output, state: JSON.parse(await readFile(stateFile, 'utf8')) }
}

for (const code of [0, 7]) {
  test(`runner result ${code} is preserved and resources are removed`, async (t) => {
    const result = await run(t, { FAKE_TEST_EXIT: String(code) })
    assert.equal(result.code, code, result.output)
    for (const kind of ['runner', 'app', 'network', 'images']) assert.equal(result.state[kind], false)
  })
}

test('SIGINT during runner creation waits for removal before releasing network/images', async (t) => {
  const result = await run(t, {}, true)
  assert.equal(result.code, 130, result.output)
  assert.equal(result.state.runnerWasCreated, true, 'creation response completed after SIGINT')
  for (const kind of ['runner', 'app', 'network', 'images']) assert.equal(result.state[kind], false)
})

for (const failure of ['FAKE_LEFTOVER', 'FAKE_QUERY_FAIL', 'FAKE_RM_FAIL']) {
  test(`${failure}: cleanup fails with a concrete recovery command`, async (t) => {
    const result = await run(t, { [failure]: '1' })
    assert.equal(result.code, 1, result.output)
    assert.match(result.output, /後片付けを確認できませんでした/)
    assert.ok(result.output.includes(`docker rm -f "${result.state.project}-runner"`))
    assert.ok(result.output.includes(`docker compose -p "${result.state.project}"`))
    if (failure === 'FAKE_LEFTOVER') assert.match(result.output, /残存資源: network/)
  })
}
