import { describe, expect, it } from 'vitest';
import { calibrationFromData, getRadiation, getScienceCard, getSpaceWeather } from '../src/data/nasa';
import { archivedScience, archivedWeather } from '../src/data/fallback';

const jsonResponse = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('NASA data layer', () => {
  it('shows LIVE labels for valid documented-shaped responses', async () => {
    const fetcher = async (url: RequestInfo | URL): Promise<Response> => {
      const text = String(url);
      if (text.includes('radlab')) return jsonResponse({ columns: ['timestamp', 'absorbed_dose_rate'], index: [], data: [['2026-01-01T00:00', 0.8]] });
      if (text.includes('osdr/data/search')) return jsonResponse({ hits: { hits: [{ _source: { 'Study Title': 'Space biology plant study', Accession: 'OSD-1', 'Space Program': 'NASA' } }] } });
      return jsonResponse([{ activityID: 'x' }]);
    };
    expect((await getSpaceWeather(fetcher, new Date('2026-01-02'))).badge).toBe('LIVE');
    const radiation = await getRadiation(fetcher);
    expect(radiation.badge).toBe('LIVE');
    expect(radiation.unit).toBe('µGy/h');
    expect((await getScienceCard(fetcher)).badge).toBe('LIVE');
  });

  it('keeps realistic microgray-per-hour values inside the dose multiplier range', () => {
    const low = calibrationFromData({ weather: archivedWeather, science: archivedScience, radiation: { doseRateUgPerHour: 0.34, unit: 'µGy/h', badge: 'LIVE', source: 'test' } });
    const high = calibrationFromData({ weather: archivedWeather, science: archivedScience, radiation: { doseRateUgPerHour: 0.48, unit: 'µGy/h', badge: 'LIVE', source: 'test' } });
    expect(low.doseMultiplier).toBeCloseTo(0.34 / 0.42);
    expect(high.doseMultiplier).toBeCloseTo(0.48 / 0.42);
    expect(low.doseMultiplier).not.toBe(0.5);
    expect(high.doseMultiplier).not.toBe(1.6);
  });

  it('uses archived fallback for timeout, 429, malformed JSON, and empty data', async () => {
    const timeout = async (): Promise<Response> => { throw new Error('Timed out'); };
    const rateLimited = async (): Promise<Response> => jsonResponse({}, 429);
    const malformed = async (): Promise<Response> => new Response('{nope', { status: 200 });
    const empty = async (): Promise<Response> => jsonResponse([]);
    expect((await getSpaceWeather(timeout)).badge).toMatch(/^ARCHIVED/);
    expect((await getRadiation(rateLimited)).badge).toMatch(/^ARCHIVED/);
    expect((await getScienceCard(malformed)).badge).toMatch(/^ARCHIVED/);
    expect((await getRadiation(empty)).badge).toMatch(/^ARCHIVED/);
  });
});
