// backend/server.js - VERSION CORRIGÉE POUR RENDER
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './database.js';

dotenv.config();

const app = express();

// ✅ UTILISEZ LE PORT DE RENDER OU 3000 EN LOCAL
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());

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

// Route analyses temporaire
app.post('/api/analyses', async (req, res) => {
  try {
    console.log('📥 Requête reçue pour sauvegarder une analyse');
    res.json({
      success: true,
      message: 'API ready - Prête à recevoir des analyses',
      id: Math.floor(Math.random() * 1000)
    });
  } catch (error) {
    console.error('❌ Erreur analyse:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Route pour récupérer les analyses
app.get('/api/analyses', async (req, res) => {
  try {
    console.log('📤 Envoi des analyses');
    res.json({
      success: true,
      analyses: [],
      message: 'Base de données prête - Aucune analyse encore sauvegardée'
    });
  } catch (error) {
    console.error('❌ Erreur récupération:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur récupération'
    });
  }
});

// Route par défaut
app.get('/', (req, res) => {
  res.json({
    message: '🚀 API Buffett Analyzer - ONLINE',
    version: '1.0.0',
    status: 'Operational',
    endpoints: {
      health: '/api/health',
      analyses: '/api/analyses'
    }
  });
});

// Démarrage du serveur
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎯 Serveur démarré sur le port ${PORT}`);
  console.log(`🔗 Health: http://0.0.0.0:${PORT}/api/health`);
});
