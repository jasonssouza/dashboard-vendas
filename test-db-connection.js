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

  console.log('Conectado com sucesso a', process.env.DB_HOST + '/' + process.env.DB_NAME);

  const [tables] = await conn.query('SHOW TABLES');
  console.log(`\n${tables.length} tabelas encontradas:`);
  tables.slice(0, 30).forEach(row => console.log(' -', Object.values(row)[0]));
  if (tables.length > 30) console.log(`  ... e mais ${tables.length - 30}`);

  await conn.end();
}

main().catch(err => {
  console.error('Falha na conexão:', err.message);
  process.exit(1);
});
