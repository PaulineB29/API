// backend/database.js
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Configuration de la connexion à la base de données
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Test de connexion
export async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ Connecté à la base de données PostgreSQL');
    const result = await client.query('SELECT NOW()');
    console.log('🕒 Heure du serveur:', result.rows[0].now);
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Erreur de connexion à la base de données:', error);
    return false;
  }
}

// Fonction pour exécuter des requêtes
export async function query(text, params) {
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (error) {
    console.error('Erreur SQL:', error);
    throw error;
  }
}

export default pool;
