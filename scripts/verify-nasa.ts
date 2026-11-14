type JsonRecord = Record<string, unknown>;

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

const reportOsdr = (value: unknown): JsonRecord[] => {
  const hits = typeof value === 'object' && value !== null ? (value as { hits?: { hits?: unknown } }).hits?.hits : undefined;
  if (!Array.isArray(hits)) throw new Error('OSDR parsing assumption failed: expected hits.hits array. Update src/data/nasa.ts before using this response.');
  const rows = hits.map((hit) => (typeof hit === 'object' && hit !== null ? (hit as { _source?: unknown })._source : undefined)).filter((source): source is JsonRecord => typeof source === 'object' && source !== null);
  const keys = rows[0] ? Object.keys(rows[0]).sort().join(', ') : '(empty valid hits array)';
  console.log(`OSDR space-biology search: hits.hits with ${rows.length} record(s)`);
  console.log(`OSDR space-biology sample keys: ${keys}`);
  return rows;
};

const reportRadLab = (value: unknown): JsonRecord[] => {
  if (typeof value !== 'object' || value === null) throw new Error('RadLab parsing assumption failed: expected a tabular JSON object.');
  const table = value as { columns?: unknown; data?: unknown; index?: unknown };
  if (!Array.isArray(table.columns) || !table.columns.every((column): column is string => typeof column === 'string') || !Array.isArray(table.data)) throw new Error('RadLab parsing assumption failed: expected columns and data arrays. Update src/data/nasa.ts before using this response.');
  const columns = table.columns as string[];
  const data = table.data as unknown[];
  console.log(`RadLab ISS DosTel: object with columns [${columns.join(', ')}], index ${Array.isArray(table.index) ? `array(${table.index.length})` : typeof table.index}, data array(${data.length})`);
  const rows = data.map((row) => Array.isArray(row) ? Object.fromEntries(columns.map((column, index) => [column, row[index]])) : row).filter((row): row is JsonRecord => typeof row === 'object' && row !== null);
  const keys = rows[0] ? Object.keys(rows[0]).sort().join(', ') : '(empty valid data array)';
  console.log(`RadLab ISS DosTel sample keys: ${keys}`);
  return rows;
};

const assertDonki = (name: string, rows: JsonRecord[]): void => {
  if (rows.length > 0 && !rows.some((row) => ['flrID', 'activityID', 'gstID'].some((key) => key in row))) throw new Error(`${name} parsing assumption failed: a non-empty DONKI record did not expose a known identifier.`);
};

const main = async (): Promise<void> => {
  console.log(`Checking NASA endpoints for ${startDate} through ${endDate}.`);
  const donkiBase = 'https://ccmc.gsfc.nasa.gov/DONKI-API/get';
  for (const kind of ['FLR', 'CME', 'GST']) {
    const data = await requestJson(`DONKI ${kind}`, `${donkiBase}/${kind}?startDate=${startDate}&endDate=${endDate}`);
    assertDonki(`DONKI ${kind}`, report(`DONKI ${kind}`, data));
  }
  const radLabEnd = new Date().toISOString().slice(0, 16);
  const radLabStart = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 16);
  const radLabUrl = `https://visualization.osdr.nasa.gov/radlab/api/?spacecraft=ISS&instrument=DosTel&timestamp%3E=${encodeURIComponent(radLabStart)}&timestamp%3C=${encodeURIComponent(radLabEnd)}&absorbed_dose_rate&format=json`;
  const radLab = reportRadLab(await requestJson('RadLab ISS DosTel', radLabUrl));
  if (radLab.length > 0 && !radLab.some((row) => typeof row.absorbed_dose_rate === 'number')) throw new Error('RadLab parsing assumption failed: no numeric absorbed_dose_rate field was found.');
  const osdr = reportOsdr(await requestJson('OSDR space-biology search', 'https://osdr.nasa.gov/osdr/data/search?term=space%20biology&from=0&size=10'));
  if (osdr.length > 0 && !osdr.some((row) => typeof row['Study Title'] === 'string' && typeof row.Accession === 'string')) throw new Error('OSDR parsing assumption failed: expected Study Title plus Accession.');
  console.log('NASA response shapes match the browser data-layer assumptions.');
};

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
