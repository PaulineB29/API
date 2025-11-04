// test-connection.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'psql 'postgresql://neondb_owner:npg_BA2xWJemNa6k@ep-red-resonance-ag335bym-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});

async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM entreprises');
    console.log('✅ Connecté à la base de données!');
    console.log('Entreprises:', result.rows);
    client.release();
  } catch (error) {
    console.error('❌ Erreur connexion:', error);
  }
}

testConnection();
