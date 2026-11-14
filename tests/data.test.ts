import { describe, expect, it } from 'vitest';
import { getRadiation, getScienceCard, getSpaceWeather } from '../src/data/nasa';

const jsonResponse = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('NASA data layer', () => {
  it('shows LIVE labels for valid documented-shaped responses', async () => {
    const fetcher = async (url: RequestInfo | URL): Promise<Response> => {
      const text = String(url);
      if (text.includes('radlab')) return jsonResponse([{ absorbed_dose_rate: 0.8 }]);
      if (text.includes('osdr/data/search')) return jsonResponse({ hits: { hits: [{ _source: { 'Study Title': 'Space biology plant study', Accession: 'OSD-1', 'Space Program': 'NASA' } }] } });
      return jsonResponse([{ activityID: 'x' }]);
    };
    expect((await getSpaceWeather(fetcher, new Date('2026-01-02'))).badge).toBe('LIVE');
    expect((await getRadiation(fetcher)).badge).toBe('LIVE');
    expect((await getScienceCard(fetcher)).badge).toBe('LIVE');
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
