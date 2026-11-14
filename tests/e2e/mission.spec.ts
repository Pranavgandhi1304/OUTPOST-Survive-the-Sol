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

const setPower = async (page: import('@playwright/test').Page, name: string, value: number): Promise<void> => {
  await page.getByLabel(name).evaluate((element, nextValue) => {
    const input = element as HTMLInputElement;
    input.value = String(nextValue);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
};

const setMoonPlan = async (page: import('@playwright/test').Page, plan: { lifeSupport: number; shielding: number; greenhouse: number; science: number }): Promise<void> => {
  await setPower(page, 'Life Support power units', plan.lifeSupport);
  await setPower(page, 'Radiation Shield power units', plan.shielding);
  await setPower(page, 'Greenhouse power units', plan.greenhouse);
  await setPower(page, 'Science / Comms power units', plan.science);
};

const runMoonMission = async (page: import('@playwright/test').Page): Promise<void> => {
  for (let sol = 0; sol < 30; sol += 1) {
    await setMoonPlan(page, sol < 15
      ? { lifeSupport: 6, shielding: 3, greenhouse: 3, science: 2 }
      : { lifeSupport: 4, shielding: 1, greenhouse: 0, science: 0 });
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

test('wins the reproducible Moon demo with an explicit recording plan', async ({ page }) => {
  const daylightPlan = { lifeSupport: 6, shielding: 3, greenhouse: 3, science: 2 };
  const nightPlan = { lifeSupport: 4, shielding: 1, greenhouse: 0, science: 0 };
  console.log(`Moon demo recording plan: sols 1-15 ${JSON.stringify(daylightPlan)}; sols 16-30 ${JSON.stringify(nightPlan)}.`);
  await silenceNasa(page);
  await resetTutorial(page);
  await page.goto('/?demo=1');
  await completeTutorial(page);
  await page.getByRole('button', { name: /start the 30-sol mission/i }).click();
  for (let sol = 0; sol < 30; sol += 1) {
    await setMoonPlan(page, sol < 15 ? daylightPlan : nightPlan);
    await page.getByRole('button', { name: /run sol/i }).click();
  }
  await expect(page.getByRole('heading', { name: /you made it through 30 sols/i })).toBeVisible();
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
