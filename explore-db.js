require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectTimeout: 10000,
  });

  const [cumulative] = await conn.query(
    `SELECT data, sacaria, safra,
            SUM(sacaria) OVER (ORDER BY data ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS acumulado
     FROM vw_bi_cambai
     WHERE vendedor LIKE '%THIAGO SCHUH%' AND safra = 'Safra 2025-2026'
     ORDER BY data DESC
     LIMIT 15`
  );
  console.log('Acumulado só na safra 2025-2026 (THIAGO SCHUH):');
  console.log(JSON.stringify(cumulative, null, 2));

  // Totals per date across last 4 real dates for this vendor, cumulative within current safra
  const [totalsPerDate] = await conn.query(
    `SELECT data, SUM(sacaria) OVER (ORDER BY data ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS acumulado
     FROM (
       SELECT data, SUM(sacaria) AS sacaria
       FROM vw_bi_cambai
       WHERE vendedor LIKE '%THIAGO SCHUH%' AND safra = 'Safra 2025-2026'
       GROUP BY data
     ) t
     ORDER BY data DESC
     LIMIT 10`
  );
  console.log('\nAcumulado por data (agrupado, safra atual):');

  console.log(JSON.stringify(totalsPerDate, null, 2));
  await conn.end();
}

main().catch(err => { console.error('Erro:', err.message); process.exit(1); });
