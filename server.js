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

async function fetchVendasData(lastN) {
  const [[safraRow]] = await pool.query(
    `SELECT safra FROM vw_bi_cambai WHERE safra IS NOT NULL GROUP BY safra ORDER BY MAX(data) DESC LIMIT 1`
  );
  if (!safraRow) throw new Error('Nenhuma safra encontrada.');
  const safra = safraRow.safra;

  const [raw] = await pool.query(
    `SELECT vendedor, data, SUM(sacaria) AS sacaria
     FROM vw_bi_cambai
     WHERE safra = ? AND vendedor IS NOT NULL
     GROUP BY vendedor, data
     ORDER BY data ASC`,
    [safra]
  );

  const dateAxis = [...new Set(raw.map(r => r.data.getTime()))].sort((a, b) => a - b);
  const dateIndex = new Map(dateAxis.map((t, i) => [t, i]));

  const byVendor = new Map();
  for (const r of raw) {
    if (!byVendor.has(r.vendedor)) byVendor.set(r.vendedor, new Array(dateAxis.length).fill(0));
    byVendor.get(r.vendedor)[dateIndex.get(r.data.getTime())] += Number(r.sacaria) || 0;
  }

  const rows = [...byVendor.entries()].map(([name, daily]) => {
    const cumulative = [];
    let acc = 0;
    for (const v of daily) { acc += v; cumulative.push(acc); }
    return { name, vals: cumulative };
  });

  const n = Math.min(lastN, dateAxis.length) || dateAxis.length;
  const sliceStart = dateAxis.length - n;
  const dates = dateAxis.slice(sliceStart).map(formatDate);
  const slicedRows = rows.map(r => ({ name: r.name, vals: r.vals.slice(sliceStart) }));

  return { dates, rows: slicedRows, safra };
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
