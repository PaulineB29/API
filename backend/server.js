// backend/server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './database.js';
import analysesRoutes from './routes/analyses.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/analyses', analysesRoutes);

// Route de santé
app.get('/api/health', async (req, res) => {
  const dbStatus = await testConnection();
  res.json({
    status: 'OK',
    database: dbStatus ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString()
  });
});

// Route par défaut
app.get('/', (req, res) => {
  res.json({
    message: '🚀 API Buffett Analyzer',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      analyses: '/api/analyses',
      'analyses-by-symbol': '/api/analyses/:symbol'
    }
  });
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🎯 Serveur démarré sur le port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📊 API Analyses: http://localhost:${PORT}/api/analyses`);
});
