import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import type { AddressInfo } from 'node:net';
import { chromium } from '@playwright/test';

const root = process.cwd();
const dist = join(root, 'dist');
const command = process.platform === 'win32' ? 'cmd.exe' : 'npm';
const args = process.platform === 'win32' ? ['/c', 'npm', 'run', 'build'] : ['run', 'build'];
const snapshot = JSON.stringify({
  fetchedAt: '2026-11-14T00:00:00.000Z',
  sourceUrls: ['https://example.test'],
  weather: { severity: 1, events: 1, eventClass: 'FLR · C1.0', eventDate: '2026-11-14', eventId: 'test-event' },
});
const mimeType = (path: string): string => ({ '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml' })[extname(path)] ?? 'application/octet-stream';

const runBuild = (env: NodeJS.ProcessEnv): void => { execFileSync(command, args, { cwd: root, env, stdio: 'inherit' }); };

const serveBuild = async (basePath: string): Promise<{ url: string; close: () => Promise<void> }> => {
  const server = createServer(async (request, response) => {
    const pathname = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
    if (!pathname.startsWith(basePath)) { response.writeHead(404).end(); return; }
    const relative = pathname.slice(basePath.length);
    const file = relative === '' ? 'index.html' : relative;
    const target = normalize(join(dist, file));
    if (!target.startsWith(dist)) { response.writeHead(400).end(); return; }
    try {
      response.writeHead(200, { 'content-type': mimeType(target) });
      response.end(await readFile(target));
    } catch { response.writeHead(404).end(); }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as AddressInfo).port;
  return { url: `http://127.0.0.1:${port}${basePath}`, close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())) };
};

const assertSnapshotRequest = async (basePath: string): Promise<void> => {
  const server = await serveBuild(basePath);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    let interceptedPath: string | undefined;
    await page.route('**/data/nasa-snapshot.json', async (route) => {
      interceptedPath = new URL(route.request().url()).pathname;
      await route.fulfill({ contentType: 'application/json', body: snapshot });
    });
    await page.route(/(ccmc\.gsfc\.nasa\.gov|osdr\.nasa\.gov|visualization\.osdr\.nasa\.gov)/, (route) => route.abort());
    const requested = page.waitForResponse((response) => new URL(response.url()).pathname === `${basePath}data/nasa-snapshot.json`);
    await page.goto(server.url, { waitUntil: 'domcontentloaded' });
    await requested;
    if (interceptedPath !== `${basePath}data/nasa-snapshot.json`) throw new Error(`Expected snapshot request ${basePath}data/nasa-snapshot.json, received ${interceptedPath ?? 'nothing'}.`);
    console.log(`Verified browser snapshot request: ${interceptedPath}`);
  } finally {
    await browser.close();
    await server.close();
  }
};

const main = async (): Promise<void> => {
  runBuild({ ...process.env, GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: 'x/outpost' });
  await assertSnapshotRequest('/outpost/');
  // Restore the root build that Playwright's normal preview server expects.
  runBuild({ ...process.env, GITHUB_ACTIONS: '', GITHUB_REPOSITORY: '' });
  await assertSnapshotRequest('/');
};

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
