import { expect, test } from '@playwright/test';
import axe from 'axe-core';

interface AxeViolation { id: string; impact: string | null; nodes: unknown[] }
interface AxeWindow extends Window { axe: { run: () => Promise<{ violations: AxeViolation[] }> } }

const silenceNasa = async (page: import('@playwright/test').Page): Promise<void> => {
  await page.route(/(api\.nasa\.gov|osdr\.nasa\.gov|visualization\.osdr\.nasa\.gov)/, (route) => {
    const url = route.request().url();
    const body = url.includes('radlab') ? [{ absorbed_dose_rate: 0.42 }] : url.includes('data/search') ? [{ title: 'Space plant study', Accession: 'OSD-1' }] : [{ activityID: 'event-1' }];
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
};

const scanAxe = async (page: import('@playwright/test').Page): Promise<void> => {
  await page.addScriptTag({ content: axe.source });
  const violations = await page.evaluate(async () => (await (window as unknown as AxeWindow).axe.run()).violations.map((item) => ({ id: item.id, impact: item.impact, nodes: item.nodes.length })));
  expect(violations).toEqual([]);
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
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: /outpost survive the sol/i })).toBeVisible();
  await finishMoonMission(page);
  expect(errors).toEqual([]);
});

test('plays a complete mission at 375px mobile width', async ({ page }) => {
  await silenceNasa(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await finishMoonMission(page);
  await expect(page.getByText(/real nasa science/i)).toBeVisible();
});

test('shows Earth advice arriving late on a Mars mission', async ({ page }) => {
  await silenceNasa(page);
  await page.goto('/');
  await page.getByRole('button', { name: /mars jezero crater/i }).click();
  await page.getByRole('button', { name: /start the 30-sol mission/i }).click();
  await expect(page.getByText(/earth’s first advice is still in transit/i)).toBeVisible();
  await page.getByRole('button', { name: /run sol 1/i }).click();
  await expect(page.getByText(/arrived .* minutes late/i)).toBeVisible();
});

test('has no axe violations on landing, mission, and debrief screens', async ({ page }) => {
  await silenceNasa(page);
  await page.goto('/');
  await scanAxe(page);
  await page.getByRole('button', { name: /start the 30-sol mission/i }).click();
  await scanAxe(page);
  await runMoonMission(page);
  await scanAxe(page);
});
