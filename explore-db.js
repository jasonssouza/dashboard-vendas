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

  const [byTipo] = await conn.query(
    `SELECT b.vis_tipo_visita, COUNT(*) AS linhas, SUM(b.sacaria) AS soma
     FROM vw_bi_cambai b
     JOIN visita v ON v.vis_id = b.id_crm
     WHERE b.safra = 'Safra 2025-2026' AND v.vis_cultura = 'SEM.SOJA'
     GROUP BY b.vis_tipo_visita
     ORDER BY soma DESC`
  );
  console.log('=== Por vis_tipo_visita (cultura=SEM.SOJA) ===');
  byTipo.forEach(r => console.log(JSON.stringify(r)));

  const [combo] = await conn.query(
    `SELECT b.vis_situacao, b.vis_tipo_visita, COUNT(*) AS linhas, SUM(b.sacaria) AS soma
     FROM vw_bi_cambai b
     JOIN visita v ON v.vis_id = b.id_crm
     WHERE b.safra = 'Safra 2025-2026' AND v.vis_cultura = 'SEM.SOJA'
     GROUP BY b.vis_situacao, b.vis_tipo_visita
     ORDER BY soma DESC`
  );
  console.log('\n=== Por vis_situacao + vis_tipo_visita (cultura=SEM.SOJA) ===');
  combo.forEach(r => console.log(JSON.stringify(r)));

  await conn.end();
}

main().catch(err => { console.error('Erro:', err.message); process.exit(1); });
