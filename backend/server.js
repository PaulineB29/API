// backend/server.js - VERSION FINALE
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './database.js';
import analysesRoutes from './routes/analyses.js';  // ✅ IMPORT AJOUTÉ

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/analyses', analysesRoutes);  // ✅ ROUTES AJOUTÉES

// Route de santé
app.get('/api/health', async (req, res) => {
  const dbStatus = await testConnection();
  res.json({
    status: 'OK',
    database: dbStatus ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// Route par défaut
app.get('/', (req, res) => {
  res.json({
    message: '🚀 API Buffett Analyzer - ONLINE',
    version: '1.0.0',
    status: 'Operational',
    endpoints: {
      health: '/api/health',
      analyses: '/api/analyses',
      'analyses-by-symbol': '/api/analyses/:symbol'
    }
  });
});

// Démarrage du serveur
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎯 Serveur démarré sur le port ${PORT}`);
  console.log(`🔗 Health: http://0.0.0.0:${PORT}/api/health`);
  console.log(`📊 Analyses: http://0.0.0.0:${PORT}/api/analyses`);
});
