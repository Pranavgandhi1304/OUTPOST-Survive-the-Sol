import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const command = process.platform === 'win32' ? 'cmd.exe' : 'npm';
const args = process.platform === 'win32' ? ['/c', 'npm', 'run', 'build'] : ['run', 'build'];
const runBuild = (env: NodeJS.ProcessEnv): void => { execFileSync(command, args, { cwd: root, env, stdio: 'inherit' }); };
runBuild({ ...process.env, GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: 'x/outpost' });

const assets = join(root, 'dist', 'assets');
const bundle = readdirSync(assets).find((file) => file.endsWith('.js'));
if (!bundle) throw new Error('Pages build did not produce a JavaScript bundle.');
const text = readFileSync(join(assets, bundle), 'utf8');
if (!text.includes('/outpost/data/nasa-snapshot.json')) {
  throw new Error('Pages build does not fetch the base-URL snapshot path.');
}
console.log('Verified Pages snapshot URL: /outpost/data/nasa-snapshot.json');
// Leave the normal root build in place for the following local E2E preview.
runBuild({ ...process.env, GITHUB_ACTIONS: '', GITHUB_REPOSITORY: '' });
