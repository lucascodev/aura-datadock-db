import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const EXTENSION_ID = 'lucascodev.aura-datadock-db';
const OPEN_VSX_URL = 'https://open-vsx.org/api/lucascodev/aura-datadock-db';
const MARKETPLACE_URL = 'https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery';
const MARKETPLACE_FILTER_BY_NAME = 7;
const MARKETPLACE_INCLUDE_STATISTICS = 256;
const REQUEST_TIMEOUT_MS = 20_000;

const COLUMNS = [
  'date',
  'open_vsx_downloads',
  'open_vsx_reviews',
  'marketplace_installs',
  'marketplace_updates',
  'marketplace_rating_count',
  'marketplace_average_rating',
];

async function fetchJson(url, init = {}) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (!response.ok) {
    throw new Error(`${url} answered ${response.status}`);
  }
  return response.json();
}

async function readOpenVsx() {
  const data = await fetchJson(OPEN_VSX_URL);
  return {
    open_vsx_downloads: data.downloadCount,
    open_vsx_reviews: data.reviewCount,
  };
}

async function readMarketplace() {
  const data = await fetchJson(MARKETPLACE_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json;api-version=3.0-preview.1',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filters: [{ criteria: [{ filterType: MARKETPLACE_FILTER_BY_NAME, value: EXTENSION_ID }] }],
      flags: MARKETPLACE_INCLUDE_STATISTICS,
    }),
  });

  const extension = data.results?.[0]?.extensions?.[0];
  if (!extension) {
    throw new Error(`${EXTENSION_ID} was not found on the Marketplace`);
  }

  const statistics = Object.fromEntries(
    (extension.statistics ?? []).map(({ statisticName, value }) => [statisticName, value]),
  );
  return {
    marketplace_installs: statistics.install,
    marketplace_updates: statistics.updateCount,
    marketplace_rating_count: statistics.ratingcount,
    marketplace_average_rating: statistics.averagerating,
  };
}

async function collect(source, reader) {
  try {
    return await reader();
  } catch (error) {
    console.log(`::warning::Could not read ${source}: ${error.message}`);
    return {};
  }
}

function formatValue(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '';
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function upsertRow(csvPath, row) {
  const header = COLUMNS.join(',');
  const existingRows = existsSync(csvPath)
    ? readFileSync(csvPath, 'utf8').split('\n').slice(1).filter(Boolean)
    : [];
  const isSameDay = (existing) => existing.startsWith(`${row.date},`);
  const previousValues = existingRows.find(isSameDay)?.split(',') ?? [];
  const otherDays = existingRows.filter((existing) => !isSameDay(existing));

  const line = COLUMNS.map((column, index) => {
    if (column === 'date') {
      return row.date;
    }
    return formatValue(row[column]) || previousValues[index] || '';
  }).join(',');

  mkdirSync(dirname(csvPath), { recursive: true });
  writeFileSync(csvPath, [header, ...otherDays, line].join('\n') + '\n');
  return line;
}

const csvPath = process.argv[2];
if (!csvPath) {
  console.error('Usage: node scripts/collectDownloadStats.mjs <path-to-csv>');
  process.exit(1);
}

const [openVsx, marketplace] = await Promise.all([
  collect('Open VSX', readOpenVsx),
  collect('the Marketplace', readMarketplace),
]);

if (Object.keys(openVsx).length === 0 && Object.keys(marketplace).length === 0) {
  console.error('Both registries failed, nothing was written.');
  process.exit(1);
}

const date = new Date().toISOString().slice(0, 10);
console.log(upsertRow(csvPath, { date, ...openVsx, ...marketplace }));
