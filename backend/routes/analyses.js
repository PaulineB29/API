// backend/routes/analyses.js
import express from 'express';
import { query } from '../database.js';

const router = express.Router();

// Sauvegarder une analyse Buffett
router.post('/', async (req, res) => {
  try {
    const {
      symbole,
      date_analyse,
      periode,
      roe,
      marge_nette,
      marge_brute,
      marge_sga,
      roic,
      dette_equity,
      current_ratio,
      couverture_interets,
      pe_ratio,
      earnings_yield,
      price_fcf,
      prix_vs_mm200,
      rendement_dividende,
      pb_ratio,
      peg_ratio,
      ev_ebitda,
      score_global,
      recommandation,
      points_forts,
      points_faibles
    } = req.body;

    // 1. Trouver ou créer l'entreprise
    let entrepriseResult = await query(
      'SELECT id FROM entreprises WHERE symbole = $1',
      [symbole]
    );

    let entrepriseId;
    if (entrepriseResult.rows.length === 0) {
      // Créer l'entreprise si elle n'existe pas
      const entreprise = await query(
        `INSERT INTO entreprises (symbole, nom, secteur, industrie) 
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [symbole, symbole, 'Unknown', 'Unknown']
      );
      entrepriseId = entreprise.rows[0].id;
    } else {
      entrepriseId = entrepriseResult.rows[0].id;
    }

// 2. Sauvegarder l'analyse
const analyseResult = await query(
    `INSERT INTO analyses_buffett (
        entreprise_id, date_analyse, periode, 
        roe, marge_nette, marge_brute, marge_sga, roic,
        dette_equity, current_ratio, couverture_interets,
        pe_ratio, earnings_yield, price_fcf, prix_vs_mm200, 
        rendement_dividende, pb_ratio, ev_ebitda,
        score_global, recommandation, points_forts, points_faibles,
        prix_actuel, mm_200, dividende_action, market_cap,
        tresorerie, actifs_courants, passifs_courants, 
        dette_totale, capitaux_propres, net_cash,
        revenus, ebit, benefice_net, bpa, frais_financiers,
        ebitda, cash_flow_operationnel, free_cash_flow
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 
              $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26,
              $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39) 
    RETURNING id`,
    [
        entrepriseId, date_analyse, periode,
        roe, marge_nette, marge_brute, marge_sga, roic,
        dette_equity, current_ratio, couverture_interets,
        pe_ratio, earnings_yield, price_fcf, prix_vs_mm200,
        rendement_dividende, pb_ratio, ev_ebitda,
        score_global, recommandation, points_forts, points_faibles,
        prix_actuel, mm_200, dividende_action, market_cap,
        tresorerie, actifs_courants, passifs_courants,
        dette_totale, capitaux_propres, net_cash,
        revenus, ebit, benefice_net, bpa, frais_financiers,
        ebitda, cash_flow_operationnel, free_cash_flow
    ]
);

    res.status(201).json({
      success: true,
      message: 'Analyse sauvegardée avec succès',
      id: analyseResult.rows[0].id
    });

  } catch (error) {
    console.error('Erreur sauvegarde analyse:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la sauvegarde',
      error: error.message
    });
  }
});

// Récupérer l'historique des analyses d'une entreprise
router.get('/:symbole', async (req, res) => {
  try {
    const { symbole } = req.params;

    const result = await query(
      `SELECT 
        ab.date_analyse,
        ab.roe,
        ab.marge_nette,
        ab.dette_equity,
        ab.pe_ratio,
        ab.score_global,
        ab.recommandation,
        ab.points_forts,
        ab.points_faibles
       FROM analyses_buffett ab
       JOIN entreprises e ON ab.entreprise_id = e.id
       WHERE e.symbole = $1
       ORDER BY ab.date_analyse DESC
       LIMIT 50`,
      [symbole]
    );

    res.json({
      success: true,
      analyses: result.rows
    });

  } catch (error) {
    console.error('Erreur récupération analyses:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération',
      error: error.message
    });
  }
});

// Récupérer toutes les analyses récentes
router.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        e.symbole,
        e.nom,
        ab.date_analyse,
        ab.score_global,
        ab.recommandation,
        ab.roe,
        ab.pe_ratio
       FROM analyses_buffett ab
       JOIN entreprises e ON ab.entreprise_id = e.id
       ORDER BY ab.date_analyse DESC
       LIMIT 100`
    );

    res.json({
      success: true,
      analyses: result.rows
    });

  } catch (error) {
    console.error('Erreur récupération analyses:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération',
      error: error.message
    });
  }
});

export default router;
