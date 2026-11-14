type JsonRecord = Record<string, unknown>;

const apiKey = process.env.NASA_API_KEY || 'DEMO_KEY';
const endDate = new Date().toISOString().slice(0, 10);
const startDate = new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10);

const requestJson = async (name: string, url: string): Promise<unknown> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`${name} returned HTTP ${response.status} ${response.statusText}`);
    return await response.json() as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${name} could not be verified: ${message}`);
  } finally {
    clearTimeout(timer);
  }
};

const asRows = (name: string, value: unknown): JsonRecord[] => {
  if (Array.isArray(value) && value.every((entry) => typeof entry === 'object' && entry !== null)) return value as JsonRecord[];
  if (typeof value === 'object' && value !== null && Array.isArray((value as { data?: unknown }).data)) return asRows(name, (value as { data: unknown }).data);
  throw new Error(`${name} parsing assumption failed: expected an array or an object with a data array. Update src/data/nasa.ts before using this response.`);
};

const report = (name: string, value: unknown): JsonRecord[] => {
  const rows = asRows(name, value);
  const keys = rows[0] ? Object.keys(rows[0]).sort().join(', ') : '(empty valid array)';
  console.log(`${name}: ${Array.isArray(value) ? 'array' : 'object.data array'} with ${rows.length} record(s)`);
  console.log(`${name} sample keys: ${keys}`);
  return rows;
};

const assertDonki = (name: string, rows: JsonRecord[]): void => {
  if (rows.length > 0 && !rows.some((row) => ['activityID', 'gstID', 'catalog'].some((key) => key in row))) throw new Error(`${name} parsing assumption failed: a non-empty DONKI record did not expose a known identifier.`);
};

const main = async (): Promise<void> => {
  console.log(`Checking NASA endpoints for ${startDate} through ${endDate} using ${apiKey === 'DEMO_KEY' ? 'DEMO_KEY' : 'NASA_API_KEY'}.`);
  const donkiBase = `https://api.nasa.gov/DONKI`;
  for (const kind of ['FLR', 'CME', 'GST']) {
    const data = await requestJson(`DONKI ${kind}`, `${donkiBase}/${kind}?startDate=${startDate}&endDate=${endDate}&api_key=${apiKey}`);
    assertDonki(`DONKI ${kind}`, report(`DONKI ${kind}`, data));
  }
  const radLab = report('RadLab ISS DosTel', await requestJson('RadLab ISS DosTel', 'https://visualization.osdr.nasa.gov/radlab/api/?spacecraft=ISS&instrument=DosTel&absorbed_dose_rate&format=json'));
  if (radLab.length > 0 && !radLab.some((row) => typeof row.absorbed_dose_rate === 'number')) throw new Error('RadLab parsing assumption failed: no numeric absorbed_dose_rate field was found.');
  const osdr = report('OSDR spaceflight search', await requestJson('OSDR spaceflight search', 'https://osdr.nasa.gov/osdr/data/search?term=spaceflight&from=0&size=1'));
  if (osdr.length > 0 && !osdr.some((row) => typeof row.title === 'string' && (typeof row.Accession === 'string' || typeof row.accession === 'string'))) throw new Error('OSDR parsing assumption failed: expected title plus Accession/accession.');
  console.log('NASA response shapes match the browser data-layer assumptions.');
};

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
