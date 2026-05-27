// dashboard.js — fetch /data/dashboard.json and render the live dashboard

const fmt = {
  ex(v) { if (v == null) return '—'; return Math.round(v).toLocaleString('ru-RU'); },
  exF(v) { if (v == null) return '—'; return (Math.round(v * 10) / 10).toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 1 }); },
  pct(v) { if (v == null) return '—'; return (v > 0 ? '+' : '') + v.toFixed(1) + '%'; },
  pctClass(v) { if (v == null) return 'delta-zero'; if (v > 0.5) return 'delta-pos'; if (v < -0.5) return 'delta-neg'; return 'delta-zero'; },
  date(iso) { try { return new Date(iso).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }); } catch { return iso; } },
  ago(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 60) return `${min} мин назад`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h} ч назад`;
    return `${Math.floor(h / 24)} д назад`;
  },
};

function el(tag, opts = {}, children = []) {
  const e = document.createElement(tag);
  if (opts.cls) e.className = opts.cls;
  if (opts.html != null) e.innerHTML = opts.html;
  if (opts.text != null) e.textContent = opts.text;
  if (opts.attrs) for (const [k, v] of Object.entries(opts.attrs)) e.setAttribute(k, v);
  for (const c of children) if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  return e;
}

function itemCell(item) {
  const wrap = el('div', { cls: 'item-cell' });
  if (item.icon) {
    const img = el('img', { attrs: { src: item.icon, alt: '', loading: 'lazy' } });
    img.onerror = () => img.style.visibility = 'hidden';
    wrap.appendChild(img);
  }
  wrap.appendChild(el('span', { cls: 'name', text: item.name }));
  return wrap;
}

function renderHero(data, divNow) {
  document.getElementById('metaLeague').textContent = data.league;
  const div = data.leagueMeta?.divine;
  const chaos = data.leagueMeta?.chaosDiv;
  document.getElementById('metaCourse').textContent =
    div ? `1 div ≈ ${Math.round(div)} ex   ·   1 chaos ≈ ${chaos ? chaos.toFixed(1) : '?'} ex` : '—';
  document.getElementById('metaUpdated').textContent =
    `${fmt.date(data.generatedAt)} (${fmt.ago(data.generatedAt)})`;
  const stratCount = (data.reforge?.length || 0) + (data.lineage?.buys?.length ? 1 : 0) + (data.movers?.gainers?.length ? 1 : 0);
  document.getElementById('metaCount').textContent = stratCount;

  // Note about league: if it's still Fate of the Vaal, mention it's reference data
  if (/fate of the vaal/i.test(data.league)) {
    document.getElementById('leadDescription').innerHTML =
      'Данные с <strong>прошлой лиги (Fate of the Vaal)</strong> как референс — Aldur ещё не активна в API. ' +
      'После старта 29 мая дашборд автоматически переключится на новую лигу при следующем обновлении.';
  } else {
    document.getElementById('leadDescription').innerHTML =
      `Автообновляемые возможности из текущей экономики лиги <strong>${data.league}</strong>. ` +
      'Перековка (gamble), флип на 24h-движениях, долгосрочные позиции в Lineage gems.';
  }
}

function renderReforge(data) {
  const grid = document.getElementById('reforgeGrid');
  grid.innerHTML = '';
  if (!data.reforge?.length) {
    grid.appendChild(el('p', { text: 'Пока нет категорий с достаточным количеством данных.' }));
    return;
  }
  data.reforge.forEach((r, i) => {
    const card = el('div', { cls: 'reforge-card' });
    card.appendChild(el('div', { cls: 'rh', html: `
      <h3>${i === 0 ? '🥇 ' : i === 1 ? '🥈 ' : i === 2 ? '🥉 ' : ''}${r.label}</h3>
      <div class="rh-sub">Pool: ${r.poolSize} предметов · Top-${r.topK} probability ${r.probTopPct}%</div>
    ` }));

    const body = el('div', { cls: 'rb' });

    body.appendChild(el('div', { cls: 'kv-grid', html: `
      <div class="kv"><div class="k">Cost ×3</div><div class="v">${fmt.exF(r.cost3)} ex</div></div>
      <div class="kv"><div class="k">Mean всего пула</div><div class="v">${fmt.exF(r.meanAll)} ex</div></div>
      <div class="kv"><div class="k">Mean ROI</div><div class="v ${r.meanAllRoi > 0 ? 'green' : ''}">${fmt.pct(r.meanAllRoi)}</div></div>
      <div class="kv"><div class="k">Top-25% ROI (потолок)</div><div class="v big gold">${fmt.pct(r.perAttemptRoiTop)}</div></div>
    ` }));

    body.appendChild(el('div', { cls: 'section-mini-title', text: 'Cheapest (3× в перековку)' }));
    const ch = el('div', { cls: 'item-row' });
    if (r.cheapest.icon) {
      const img = el('img', { attrs: { src: r.cheapest.icon, alt: '', loading: 'lazy' } });
      img.onerror = () => img.style.visibility = 'hidden';
      ch.appendChild(img);
    }
    ch.appendChild(el('span', { cls: 'name', text: r.cheapest.name }));
    ch.appendChild(el('span', { cls: 'price', text: `${fmt.exF(r.cheapest.price)} ex` }));
    body.appendChild(ch);

    body.appendChild(el('div', { cls: 'section-mini-title', text: 'Top outcomes (ради чего крутишь)' }));
    r.topItems.forEach(t => {
      const row = el('div', { cls: 'item-row' });
      if (t.icon) {
        const img = el('img', { attrs: { src: t.icon, alt: '', loading: 'lazy' } });
        img.onerror = () => img.style.visibility = 'hidden';
        row.appendChild(img);
      }
      row.appendChild(el('span', { cls: 'name', text: t.name }));
      row.appendChild(el('span', { cls: 'price', text: `${fmt.exF(t.price)} ex` }));
      body.appendChild(row);
    });

    card.appendChild(body);
    grid.appendChild(card);
  });
}

function renderMoversTable(tbodyId, rows) {
  const tbody = document.querySelector(`#${tbodyId} tbody`);
  tbody.innerHTML = '';
  if (!rows?.length) {
    tbody.appendChild(el('tr', { html: '<td colspan="6" style="text-align:center; color:#8b7355;">Нет данных</td>' }));
    return;
  }
  rows.forEach(r => {
    const tr = el('tr');
    const tdItem = el('td');
    tdItem.appendChild(itemCell(r));
    tr.appendChild(tdItem);
    tr.appendChild(el('td', { text: r.category }));
    tr.appendChild(el('td', { cls: 'num', text: fmt.exF(r.price) }));
    tr.appendChild(el('td', { cls: `num ${fmt.pctClass(r.dayDelta)}`, text: fmt.pct(r.dayDelta) }));
    tr.appendChild(el('td', { cls: `num ${fmt.pctClass(r.weekDelta)}`, text: fmt.pct(r.weekDelta) }));
    tr.appendChild(el('td', { cls: 'num', text: r.volume }));
    tbody.appendChild(tr);
  });
}

function renderLineage(data) {
  // Summary stats
  const stats = document.getElementById('lineageSummary');
  stats.innerHTML = '';
  const s = data.lineage?.summary;
  if (s) {
    const items = [
      { num: s.count, label: 'Камней в пуле' },
      { num: `${fmt.ex(s.cheapest)} ex`, label: 'Самый дешёвый' },
      { num: `${fmt.ex(s.median)} ex`, label: 'Медиана пула' },
      { num: `${fmt.ex(s.mostExpensive)} ex`, label: 'Самый дорогой' },
    ];
    items.forEach(x => {
      const d = el('div', { cls: 'stat' });
      d.appendChild(el('span', { cls: 'stat-num', text: String(x.num) }));
      d.appendChild(el('div', { cls: 'stat-label', text: x.label }));
      stats.appendChild(d);
    });
  }

  // Table
  const tbody = document.querySelector('#lineageTable tbody');
  tbody.innerHTML = '';
  (data.lineage?.buys || []).forEach(x => {
    const tr = el('tr');
    const tdItem = el('td');
    tdItem.appendChild(itemCell(x));
    tr.appendChild(tdItem);
    tr.appendChild(el('td', { cls: 'num', text: fmt.exF(x.price) }));
    tr.appendChild(el('td', { cls: 'num', text: '×' + (x.ratioToMedian ?? '—') }));
    tr.appendChild(el('td', { cls: `num ${fmt.pctClass(x.dayDelta)}`, text: fmt.pct(x.dayDelta) }));
    tr.appendChild(el('td', { cls: `num ${fmt.pctClass(x.weekDelta)}`, text: fmt.pct(x.weekDelta) }));
    tr.appendChild(el('td', { cls: 'num', text: x.volume ?? '—' }));
    tbody.appendChild(tr);
  });
}

function renderCheapPools(data) {
  const grid = document.getElementById('cheapPoolsGrid');
  grid.innerHTML = '';
  // Only categories that support reforging
  const gambleCats = data.reforge.map(r => r.category);
  for (const catId of gambleCats) {
    const cat = data.categories[catId];
    if (!cat?.cheapItems?.length) continue;
    const card = el('div', { cls: 'card' });
    card.appendChild(el('h3', { text: cat.label }));
    cat.cheapItems.forEach(x => {
      const row = el('div', { cls: 'item-row' });
      if (x.icon) {
        const img = el('img', { attrs: { src: x.icon, alt: '', loading: 'lazy' } });
        img.onerror = () => img.style.visibility = 'hidden';
        row.appendChild(img);
      }
      row.appendChild(el('span', { cls: 'name', text: x.name }));
      row.appendChild(el('span', { cls: 'price', text: `${fmt.exF(x.price)} ex` }));
      card.appendChild(row);
    });
    grid.appendChild(card);
  }
}

function renderTopPrices(data) {
  const tbody = document.querySelector('#topPricesTable tbody');
  tbody.innerHTML = '';
  const div = data.leagueMeta?.divine || 187;
  (data.summary?.topByPrice || []).forEach((x, i) => {
    const tr = el('tr');
    tr.appendChild(el('td', { text: i + 1 }));
    const tdItem = el('td');
    tdItem.appendChild(itemCell(x));
    tr.appendChild(tdItem);
    tr.appendChild(el('td', { text: x.category }));
    tr.appendChild(el('td', { cls: 'num', text: fmt.ex(x.price) }));
    tr.appendChild(el('td', { cls: 'num', text: '≈ ' + Math.round(x.price / div).toLocaleString('ru-RU') + ' div' }));
    tbody.appendChild(tr);
  });
}

async function main() {
  // Cache-bust on each load so users always see latest
  const url = `data/dashboard.json?_=${Date.now()}`;
  let data;
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    data = await r.json();
  } catch (e) {
    document.getElementById('errorBox').style.display = '';
    document.getElementById('errorMsg').textContent =
      `${e.message}. Скрипт обновления, возможно, ещё не выполнялся — данные появятся после первого запуска GitHub Actions.`;
    return;
  }

  renderHero(data);
  renderReforge(data);
  renderMoversTable('gainersTable', data.movers?.gainers);
  renderMoversTable('losersTable', data.movers?.losers);
  renderLineage(data);
  renderCheapPools(data);
  renderTopPrices(data);
}

main();
