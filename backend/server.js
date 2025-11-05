// backend/server.js - SOLUTION CORS TEMPORAIRE
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './database.js';
import analysesRoutes from './routes/analyses.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// ✅ SOLUTION CORS SIMPLIFIÉE QUI FONCTIONNE
app.use(cors());  // ← JUSTE CELA, SANS OPTIONS COMPLEXES
app.use(express.json());

// Middleware CORS manuel en backup
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Routes
app.use('/api/analyses', analysesRoutes);

// Route de santé
app.get('/api/health', async (req, res) => {
  const dbStatus = await testConnection();
  res.json({
    status: 'OK',
    database: dbStatus ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString(),
    port: PORT,
    cors: 'Enabled for all origins'
  });
});

// Route par défaut
app.get('/', (req, res) => {
  res.json({
    message: '🚀 API Buffett Analyzer - ONLINE',
    version: '1.0.0',
    status: 'Operational',
    cors: 'Enabled for all origins'
  });
});

// Démarrage du serveur
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎯 Serveur démarré sur le port ${PORT}`);
  console.log(`🔗 Health: http://0.0.0.0:${PORT}/api/health`);
  console.log(`🌐 CORS: Autorisé pour toutes les origines`);
});
