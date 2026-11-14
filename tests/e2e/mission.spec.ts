import { expect, test } from '@playwright/test';
import axe from 'axe-core';

interface AxeViolation { id: string; impact: string | null; nodes: unknown[] }
interface AxeWindow extends Window { axe: { run: () => Promise<{ violations: AxeViolation[] }> } }

const silenceNasa = async (page: import('@playwright/test').Page): Promise<void> => {
  await page.route(/(ccmc\.gsfc\.nasa\.gov|osdr\.nasa\.gov|visualization\.osdr\.nasa\.gov)/, (route) => {
    const url = route.request().url();
    const body = url.includes('radlab')
      ? { columns: ['timestamp', 'absorbed_dose_rate'], data: [['2022-04-02T00:00', 5.2], ['2022-04-02T00:05', 5.8]] }
      : url.includes('data/search')
        ? { hits: { hits: [{ _source: { 'Study Title': 'Space plant study', Accession: 'OSD-1', 'Space Program': 'NASA' } }] } }
        : [{ flrID: 'event-1', classType: 'M1.0', beginTime: '2022-04-02T00:00Z' }];
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
};

const scanAxe = async (page: import('@playwright/test').Page): Promise<void> => {
  await page.addScriptTag({ content: axe.source });
  const violations = await page.evaluate(async () => (await (window as unknown as AxeWindow).axe.run()).violations.map((item) => ({ id: item.id, impact: item.impact, nodes: item.nodes.length })));
  expect(violations).toEqual([]);
};

const completeTutorial = async (page: import('@playwright/test').Page): Promise<void> => {
  await expect(page.getByRole('heading', { name: /one battery/i })).toBeVisible();
  await page.getByRole('button', { name: /next step/i }).click();
  await page.getByRole('button', { name: /next step/i }).click();
  await page.getByRole('button', { name: /start training/i }).click();
};

const resetTutorial = async (page: import('@playwright/test').Page): Promise<void> => {
  await page.addInitScript(() => localStorage.removeItem('outpost:tutorial-seen'));
};

const runMoonMission = async (page: import('@playwright/test').Page): Promise<void> => {
  for (let sol = 0; sol < 30; sol += 1) {
    if (sol === 15) {
      const setPower = async (name: string, value: number): Promise<void> => page.getByLabel(name).evaluate((element, nextValue) => { const input = element as HTMLInputElement; input.value = String(nextValue); input.dispatchEvent(new Event('input', { bubbles: true })); }, value);
      await setPower('Life Support power units', 4);
      await setPower('Radiation Shield power units', 1);
      await setPower('Greenhouse power units', 0);
      await setPower('Science / Comms power units', 0);
    }
    const button = page.getByRole('button', { name: /run sol/i });
    if (!(await button.isVisible())) break;
    await button.click();
  }
  await expect(page.getByRole('heading', { name: /you made it through|mission replay/i })).toBeVisible();
};

const finishMoonMission = async (page: import('@playwright/test').Page): Promise<void> => {
  await page.getByRole('button', { name: /start the 30-sol mission/i }).click();
  await runMoonMission(page);
};

test('plays a complete desktop mission with no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await silenceNasa(page);
  await resetTutorial(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?demo=1');
  await completeTutorial(page);
  await expect(page.getByRole('heading', { level: 1, name: /outpost survive the sol/i })).toBeVisible();
  await finishMoonMission(page);
  expect(errors).toEqual([]);
});

test('plays a complete mission at 375px mobile width', async ({ page }) => {
  await silenceNasa(page);
  await resetTutorial(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/?demo=1');
  await completeTutorial(page);
  await finishMoonMission(page);
  await expect(page.locator('.science-card').getByText(/real nasa science/i)).toBeVisible();
});

test('shows Earth advice arriving late on a Mars mission', async ({ page }) => {
  await silenceNasa(page);
  await resetTutorial(page);
  await page.goto('/?demo=1');
  await completeTutorial(page);
  await page.getByRole('button', { name: /mars jezero crater/i }).click();
  await page.getByRole('button', { name: /start the 30-sol mission/i }).click();
  await expect(page.getByText(/forecast/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: /upcoming sol/i })).toBeVisible();
  await expect(page.getByText(/earth’s first advice is still in transit/i)).toBeVisible();
  await page.getByRole('button', { name: /run sol 1/i }).click();
  await expect(page.getByText(/arrived .* minutes late/i)).toBeVisible();
});

test('has no axe violations on tutorial, classroom, landing, mission, and debrief screens', async ({ page }) => {
  await silenceNasa(page);
  await resetTutorial(page);
  await page.goto('/?demo=1');
  await scanAxe(page);
  await completeTutorial(page);
  await scanAxe(page);
  await page.getByRole('button', { name: /classroom \/ parent mode/i }).click();
  await scanAxe(page);
  await page.getByRole('button', { name: /back to mission select/i }).click();
  await page.getByRole('button', { name: /start the 30-sol mission/i }).click();
  await scanAxe(page);
  await runMoonMission(page);
  await scanAxe(page);
});
