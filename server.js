require('dotenv').config();
const path = require('path');
const express = require('express');
const mysql = require('mysql2/promise');

const PORT = process.env.PORT || 3000;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 min
const cache = new Map();

const REQUIRED_ENV = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missingEnv = REQUIRED_ENV.filter(k => !process.env[k]);
if (missingEnv.length) {
  console.warn('Variáveis de ambiente ausentes:', missingEnv.join(', '));
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectTimeout: 10000,
  connectionLimit: 5,
});

function formatDate(d) {
  const dt = new Date(d);
  return dt.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function cumulativeSeries(raw, keyFn, dateIndex, axisLen) {
  const byKey = new Map();
  for (const r of raw) {
    const key = keyFn(r);
    if (!byKey.has(key)) byKey.set(key, new Array(axisLen).fill(0));
    byKey.get(key)[dateIndex.get(r.data.getTime())] += Number(r.sacaria) || 0;
  }
  const result = new Map();
  for (const [key, daily] of byKey) {
    const cumulative = [];
    let acc = 0;
    for (const v of daily) { acc += v; cumulative.push(acc); }
    result.set(key, cumulative);
  }
  return result;
}

// "Cultura = SEM.SOJA" e "Tipo pedidos = Em andamento + Finalizados" (exclui vis_tipo_visita
// 2 e 11, que correspondem a "Orçamentos") replicam o filtro padrão do relatório do CRM.
const REPORT_FILTER = `
     JOIN visita v ON v.vis_id = b.id_crm
     WHERE b.safra = ? AND b.vendedor IS NOT NULL
       AND v.vis_cultura = 'SEM.SOJA' AND b.vis_tipo_visita NOT IN (2, 11)`;

async function fetchVendasData(lastN) {
  const [[safraRow]] = await pool.query(
    `SELECT safra FROM vw_bi_cambai WHERE safra IS NOT NULL GROUP BY safra ORDER BY MAX(data) DESC LIMIT 1`
  );
  if (!safraRow) throw new Error('Nenhuma safra encontrada.');
  const safra = safraRow.safra;

  const [raw] = await pool.query(
    `SELECT b.vendedor, b.data, SUM(b.sacaria) AS sacaria
     FROM vw_bi_cambai b
     ${REPORT_FILTER}
     GROUP BY b.vendedor, b.data
     ORDER BY b.data ASC`,
    [safra]
  );

  const dateAxis = [...new Set(raw.map(r => r.data.getTime()))].sort((a, b) => a - b);
  const dateIndex = new Map(dateAxis.map((t, i) => [t, i]));
  const vendorSeries = cumulativeSeries(raw, r => r.vendedor, dateIndex, dateAxis.length);

  const [rawCultivar] = await pool.query(
    `SELECT b.vendedor, b.cultivar, b.data, SUM(b.sacaria) AS sacaria
     FROM vw_bi_cambai b
     ${REPORT_FILTER}
       AND b.cultivar IS NOT NULL
     GROUP BY b.vendedor, b.cultivar, b.data
     ORDER BY b.data ASC`,
    [safra]
  );
  const cultivarDaily = new Map();
  for (const r of rawCultivar) {
    if (!cultivarDaily.has(r.vendedor)) cultivarDaily.set(r.vendedor, new Map());
    const byCultivar = cultivarDaily.get(r.vendedor);
    if (!byCultivar.has(r.cultivar)) byCultivar.set(r.cultivar, new Array(dateAxis.length).fill(0));
    byCultivar.get(r.cultivar)[dateIndex.get(r.data.getTime())] += Number(r.sacaria) || 0;
  }
  const cultivarsByVendor = new Map();
  for (const [vendedor, byCultivar] of cultivarDaily) {
    const list = [...byCultivar.entries()].map(([cultivar, daily]) => {
      const cumulative = [];
      let acc = 0;
      for (const v of daily) { acc += v; cumulative.push(acc); }
      return { name: cultivar, vals: cumulative };
    });
    cultivarsByVendor.set(vendedor, list);
  }

  const n = Math.min(lastN, dateAxis.length) || dateAxis.length;
  const sliceStart = dateAxis.length - n;
  const dates = dateAxis.slice(sliceStart).map(formatDate);

  const rows = [...vendorSeries.entries()].map(([name, vals]) => {
    const cultivars = (cultivarsByVendor.get(name) || [])
      .map(c => ({ name: c.name, vals: c.vals.slice(sliceStart) }))
      .sort((a, b) => (b.vals[b.vals.length - 1] || 0) - (a.vals[a.vals.length - 1] || 0));
    return { name, vals: vals.slice(sliceStart), cultivars };
  });

  return { dates, rows, safra };
}

const app = express();
app.use(express.static(path.join(__dirname), { index: 'dashboard_vendas.html' }));

app.get('/api/vendas', async (req, res) => {
  const lastN = Math.max(1, Math.min(200, parseInt(req.query.dates, 10) || 20));
  const cacheKey = 'vendas:' + lastN;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return res.json(cached.data);
  }
  if (missingEnv.length) {
    return res.status(500).json({ error: 'Variáveis de ambiente ausentes: ' + missingEnv.join(', ') });
  }
  try {
    const data = await fetchVendasData(lastN);
    cache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL_MS });
    res.json(data);
  } catch (err) {
    console.error('Erro ao consultar Thonus:', err.code || '(sem código)', '-', err.message);
    res.status(500).json({ error: (err.code || 'ERRO') + ': ' + err.message });
  }
});

app.listen(PORT, () => console.log(`Dashboard rodando na porta ${PORT}`));
