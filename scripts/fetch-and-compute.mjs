// fetch-and-compute.mjs
// Pulls economy data from poe2scout and computes "what to do today" opportunities.
// Run: node scripts/fetch-and-compute.mjs
// Output: data/dashboard.json
//
// No external deps — pure Node 20 (fetch is built-in).

import fs from 'node:fs/promises';
import path from 'node:path';

const API = 'https://poe2scout.com/api';
const REALM = 'poe2';
const OUT_DIR = path.resolve('data');
const PER_PAGE = 500;

// In priority order — first match wins.
// When Aldur goes live, it will be added to the leagues list automatically.
const LEAGUE_PREFERENCE = [
  'Runes of Aldur',
  'Aldur',
  'Fate of the Vaal',
  'Rise of the Abyssal',
];

// Categories that support 3-of-same gambling/reforging (per the source guide):
//  - Soul Cores (ultimatum)
//  - Essences (essences)
//  - Catalysts are inside 'breach' category by api
// Lineage gems for "early buy + hold" strategy.
const CATEGORIES = [
  { id: 'currency',           label: 'Currency',                gambleable: false },
  { id: 'essences',           label: 'Essences',                gambleable: true  },
  { id: 'ultimatum',          label: 'Soul Cores',              gambleable: true  },
  { id: 'lineagesupportgems', label: 'Lineage Support Gems',    gambleable: false, lineage: true },
  { id: 'uncutgems',          label: 'Uncut Gems',              gambleable: false },
  { id: 'runes',              label: 'Runes',                   gambleable: false },
  { id: 'fragments',          label: 'Fragments',               gambleable: false },
  { id: 'breach',             label: 'Breach (Catalysts)',      gambleable: true  },
  { id: 'abyss',              label: 'Abyss',                   gambleable: false },
  { id: 'delirium',           label: 'Delirium',                gambleable: false },
  { id: 'ritual',             label: 'Ritual Omens',            gambleable: false },
];

async function getJSON(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'poe2-aldur-guide/1.0 (+github.com/kripakrip/poe2-aldur-startguide)' } });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText} for ${url}`);
  return r.json();
}

async function pickLeague() {
  const leagues = await getJSON(`${API}/${REALM}/Leagues`);
  // Try preferred names in order
  for (const pref of LEAGUE_PREFERENCE) {
    const hit = leagues.find(L => L.Value && L.Value.toLowerCase().includes(pref.toLowerCase()) && !/^HC /i.test(L.Value));
    if (hit) return { league: hit.Value, divine: hit.DivinePrice, chaosDiv: hit.ChaosDivinePrice, all: leagues };
  }
  // Fallback: first non-HC, non-Standard, non-Hardcore
  const hit = leagues.find(L => !/^HC /i.test(L.Value) && L.Value !== 'Standard' && L.Value !== 'Hardcore');
  if (hit) return { league: hit.Value, divine: hit.DivinePrice, chaosDiv: hit.ChaosDivinePrice, all: leagues };
  throw new Error('No suitable league found');
}

async function fetchCategory(league, catId) {
  // API silently caps perPage (observed at 25) but still reports Pages for the cap.
  // We paginate and de-dupe by ApiId at the end.
  const seen = new Map();
  let page = 1;
  while (true) {
    const data = await getJSON(`${API}/${REALM}/Leagues/${encodeURIComponent(league)}/Currencies/ByCategory?Category=${catId}&perPage=${PER_PAGE}&page=${page}`);
    const items = data.Items || [];
    let added = 0;
    for (const it of items) {
      if (it.ApiId && !seen.has(it.ApiId)) { seen.set(it.ApiId, it); added++; }
    }
    if (added === 0) break;             // exhausted: nothing new on this page
    if (page >= (data.Pages || 1)) break;
    page++;
    if (page > 50) break;               // safety
  }
  return [...seen.values()];
}

// Normalize a raw poe2scout currency item.
function normalize(item) {
  const logs = (item.PriceLogs || []).filter(Boolean).map(l => ({ price: +l.Price, time: l.Time, qty: +l.Quantity }));
  // PriceLogs[0] is most recent (today), [1] is yesterday, etc.
  const recent = logs[0] || null;
  const yesterday = logs[1] || null;
  const week = logs[6] || logs[logs.length - 1] || null;
  const price = item.CurrentPrice ?? recent?.price ?? null;

  // Volume (sum of last 3 days of qty) — proxy for liquidity
  const volume = logs.slice(0, 3).reduce((s, l) => s + (l.qty || 0), 0);

  // % delta vs yesterday and week
  const dayDelta = (price != null && yesterday?.price) ? (price / yesterday.price - 1) * 100 : null;
  const weekDelta = (price != null && week?.price) ? (price / week.price - 1) * 100 : null;

  return {
    apiId: item.ApiId,
    name: item.Text,
    icon: item.IconUrl,
    category: item.CategoryApiId,
    price,
    volume,
    dayDelta,
    weekDelta,
    logs,
  };
}

// Reforge ROI: 3 of same cheapest -> chance for one of top-tier items.
// Two views:
//   1) "Mean EV": revenue = mean of all items in pool, ROI = mean/cost - 1
//   2) "Top-K EV": revenue = mean of top 25% of pool — proxy for "good outcomes"
function computeReforgeStats(items) {
  const valid = items
    .filter(x => x.price != null && x.price > 0 && (x.volume || 0) >= 1)
    .sort((a, b) => a.price - b.price);
  if (valid.length < 5) return null;
  const cheapest = valid[0];
  const cost3 = cheapest.price * 3;
  const meanAll = valid.reduce((s, x) => s + x.price, 0) / valid.length;
  const topK = Math.max(3, Math.round(valid.length * 0.25));
  const topItems = valid.slice(-topK);
  const meanTop = topItems.reduce((s, x) => s + x.price, 0) / topK;
  const probTopPct = (topK / valid.length) * 100;
  return {
    poolSize: valid.length,
    cheapest: { name: cheapest.name, price: cheapest.price, icon: cheapest.icon },
    cost3,
    meanAll,
    meanAllRoi: (meanAll / cost3 - 1) * 100,
    topK,
    meanTop,
    topItems: [...topItems].reverse().slice(0, 5).map(x => ({ name: x.name, price: x.price, icon: x.icon })),
    perAttemptGainTop: meanTop - cost3,
    perAttemptRoiTop: (meanTop / cost3 - 1) * 100,
    probTopPct,
  };
}

function pct(x) { return x == null ? null : Math.round(x * 100) / 100; }
function rnd(x, d = 1) { if (x == null) return null; const m = 10 ** d; return Math.round(x * m) / m; }

async function main() {
  console.log('Picking league…');
  const { league, divine, chaosDiv, all } = await pickLeague();
  console.log(`League: ${league} | 1 div = ${divine} ex | chaos/div = ${chaosDiv}`);

  const result = {
    generatedAt: new Date().toISOString(),
    league,
    leagueMeta: { divine, chaosDiv, allLeagues: all.map(L => ({ name: L.Value, isCurrent: L.IsCurrent, divine: L.DivinePrice })) },
    categories: {},
    movers: { gainers: [], losers: [] },
    reforge: [],
    lineage: { buys: [], summary: null },
    summary: {},
  };

  // Fetch all categories in parallel (small number, fine)
  const fetched = {};
  await Promise.all(CATEGORIES.map(async c => {
    try {
      const raw = await fetchCategory(league, c.id);
      const items = raw.map(normalize);
      fetched[c.id] = { meta: c, items };
      console.log(`  [${c.id}] ${items.length} items`);
    } catch (e) {
      console.warn(`  [${c.id}] FAIL: ${e.message}`);
      fetched[c.id] = { meta: c, items: [], error: e.message };
    }
  }));

  // Per-category summary
  for (const [id, { meta, items }] of Object.entries(fetched)) {
    const valid = items.filter(x => x.price != null);
    result.categories[id] = {
      label: meta.label,
      count: items.length,
      validCount: valid.length,
      topItems: [...valid].sort((a, b) => b.price - a.price).slice(0, 8).map(x => ({
        name: x.name, icon: x.icon, price: rnd(x.price, 1),
        dayDelta: pct(x.dayDelta), weekDelta: pct(x.weekDelta), volume: x.volume,
      })),
      cheapItems: [...valid].sort((a, b) => a.price - b.price).slice(0, 5).map(x => ({
        name: x.name, icon: x.icon, price: rnd(x.price, 2),
      })),
    };

    // Reforge stats
    if (meta.gambleable) {
      const stats = computeReforgeStats(items);
      if (stats) {
        result.reforge.push({
          category: id,
          label: meta.label,
          ...stats,
          cost3: rnd(stats.cost3, 1),
          meanAll: rnd(stats.meanAll, 1),
          meanTop: rnd(stats.meanTop, 1),
          meanAllRoi: rnd(stats.meanAllRoi, 1),
          perAttemptGainTop: rnd(stats.perAttemptGainTop, 1),
          perAttemptRoiTop: rnd(stats.perAttemptRoiTop, 1),
          probTopPct: rnd(stats.probTopPct, 1),
          cheapest: { ...stats.cheapest, price: rnd(stats.cheapest.price, 1) },
          topItems: stats.topItems.map(x => ({ ...x, price: rnd(x.price, 1) })),
        });
      }
    }
  }

  // Sort reforges by best Top-K ROI
  result.reforge.sort((a, b) => (b.perAttemptRoiTop ?? -9e9) - (a.perAttemptRoiTop ?? -9e9));

  // Lineage buy list: rank by ratio (median of category / price) — finds the most undervalued vs peers
  if (fetched.lineagesupportgems?.items?.length) {
    const items = fetched.lineagesupportgems.items.filter(x => x.price != null && x.price > 0);
    items.sort((a, b) => a.price - b.price);
    const median = items[Math.floor(items.length / 2)].price;
    result.lineage.summary = {
      count: items.length,
      median: rnd(median, 1),
      cheapest: rnd(items[0].price, 1),
      mostExpensive: rnd(items[items.length - 1].price, 1),
    };
    result.lineage.buys = items.slice(0, 12).map(x => ({
      name: x.name, icon: x.icon,
      price: rnd(x.price, 1),
      ratioToMedian: rnd(median / x.price, 2),
      dayDelta: pct(x.dayDelta),
      weekDelta: pct(x.weekDelta),
      volume: x.volume,
    }));
  }

  // 24h movers across all currency-like categories.
  // Filters out:
  //   - low-liquidity items (volume < 10 over 3d) - thin order book = noisy/manipulatable
  //   - sub-5ex items (rounding noise dominates)
  //   - deltas >= ±500% (API glitch / first listing after gap)
  const allValid = Object.values(fetched).flatMap(({ items, meta }) =>
    items
      .filter(x =>
        x.price != null && x.dayDelta != null &&
        (x.volume || 0) >= 10 &&
        x.price >= 5 &&
        Math.abs(x.dayDelta) < 500
      )
      .map(x => ({ ...x, _cat: meta.label }))
  );
  const sortedByDelta = [...allValid].sort((a, b) => b.dayDelta - a.dayDelta);
  result.movers.gainers = sortedByDelta.slice(0, 12).map(x => ({
    name: x.name, icon: x.icon, category: x._cat,
    price: rnd(x.price, 1), dayDelta: pct(x.dayDelta), weekDelta: pct(x.weekDelta), volume: x.volume,
  }));
  result.movers.losers = sortedByDelta.slice(-12).reverse().map(x => ({
    name: x.name, icon: x.icon, category: x._cat,
    price: rnd(x.price, 1), dayDelta: pct(x.dayDelta), weekDelta: pct(x.weekDelta), volume: x.volume,
  }));

  // Top items overall by price
  result.summary.topByPrice = allValid
    .sort((a, b) => b.price - a.price)
    .slice(0, 15)
    .map(x => ({ name: x.name, icon: x.icon, category: x._cat, price: rnd(x.price, 0) }));

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(path.join(OUT_DIR, 'dashboard.json'), JSON.stringify(result, null, 2), 'utf-8');
  await fs.writeFile(path.join(OUT_DIR, 'league.txt'), league, 'utf-8');
  console.log(`\nWrote ${path.join(OUT_DIR, 'dashboard.json')}`);
  console.log(`Reforge opportunities: ${result.reforge.length}`);
  console.log(`Top reforge: ${result.reforge[0]?.label} -> ${result.reforge[0]?.perAttemptRoiTop}% (top-K)`);
  console.log(`Gainers tracked: ${result.movers.gainers.length}`);
  console.log(`Lineage buys: ${result.lineage.buys.length}`);
}

main().catch(e => { console.error(e); process.exit(1); });
