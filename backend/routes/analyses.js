// backend/routes/analyses.js - VERSION ANGLAISE
import express from 'express';
import { query } from '../database.js';

const router = express.Router();

// Sauvegarder une analyse Buffett
router.post('/', async (req, res) => {
  try {
    console.log('🚨 REQUÊTE REÇUE - Début sauvegarde réelle');
    console.log('📦 Données reçues:', Object.keys(req.body));
    
    const {
      symbol,
      date_analyse,
      periode,
      // Profitability metrics
      roe,
      netMargin,
      grossMargin,
      sgaMargin,
      roic,
      // Safety metrics
      debtToEquity,
      currentRatio,
      interestCoverage,
      // Valuation metrics
      peRatio,
      earningsYield,
      priceToFCF,
      priceToMM200,
      dividendYield,
      pbRatio,
      pegRatio,
      evToEbitda,
      // Analysis results
      score_global,
      recommandation,
      points_forts,
      points_faibles,
      // Additional data
      currentPrice,
      movingAverage200,
      dividendPerShare,
      marketCap,
      cashEquivalents,
      currentAssets,
      currentLiabilities,
      totalDebt,
      shareholdersEquity,
      netCash,
      revenue,
      ebit,
      netIncome,
      eps,
      interestExpense,
      ebitda,
      operatingCashFlow,
      freeCashFlow
    } = req.body;

    console.log('🔍 Données extraites:', { symbol, roe, netMargin, recommandation });

    // 1. Trouver ou créer l'entreprise
    console.log('🏢 Recherche entreprise:', symbol);
    let entrepriseResult = await query(
      'SELECT id FROM entreprises WHERE symbole = $1',
      [symbol]
    );

    let entrepriseId;
    if (entrepriseResult.rows.length === 0) {
      // Créer l'entreprise si elle n'existe pas
      console.log('➕ Création nouvelle entreprise...');
      const entreprise = await query(
        `INSERT INTO entreprises (symbole, nom, secteur, industrie) 
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [symbol, symbol, 'Unknown', 'Unknown']
      );
      entrepriseId = entreprise.rows[0].id;
      console.log('✅ Nouvelle entreprise ID:', entrepriseId);
    } else {
      entrepriseId = entrepriseResult.rows[0].id;
      console.log('✅ Entreprise existante ID:', entrepriseId);
    }

    // 2. SAUVEGARDE RÉELLE
    console.log('💾 Insertion analyse dans la base...');
    const analyseResult = await query(
      `INSERT INTO analyses_buffett (
        entreprise_id, date_analyse, periode, 
        roe, netMargin, grossMargin, sgaMargin, roic,
        debtToEquity, currentRatio, interestCoverage,
        peRatio, earningsYield, priceToFCF, priceToMM200, 
        dividendYield, pbRatio, pegRatio, evToEbitda,
        score_global, recommandation, points_forts, points_faibles,
        freeCashFlow
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 
                $15, $16, $17, $18, $19, $20, $21, $22, $23, $24) 
      RETURNING id`,
      [
        entrepriseId, date_analyse, periode,
        // Profitability
        roe, netMargin, grossMargin, sgaMargin, roic,
        // Safety  
        debtToEquity, currentRatio, interestCoverage,
        // Valuation
        peRatio, earningsYield, priceToFCF, priceToMM200,
        dividendYield, pbRatio, pegRatio, evToEbitda,
        // Analysis
        score_global, recommandation, points_forts, points_faibles
      ]
    );

    const newId = analyseResult.rows[0].id;
    console.log('🎉 SAUVEGARDE RÉUSSIE - ID:', newId, 'Symbol:', symbol);

    res.status(201).json({
      success: true,
      message: 'Analyse sauvegardée avec succès',
      id: newId
    });

  } catch (error) {
    console.error('❌ Erreur sauvegarde analyse:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la sauvegarde',
      error: error.message
    });
  }
});

// Sauvegarder les données financières brutes
router.post('/donnees-financieres', async (req, res) => {
  try {
    console.log('💾 Sauvegarde données financières brutes');
    
    const {
      symbol,
      date_import,
      profile_data,
      quote_data, 
      cash_flow_data,
      income_statement_data,
      balance_sheet_data
    } = req.body;

    // 1. Trouver ou créer l'entreprise
    let entrepriseResult = await query(
      'SELECT id FROM entreprises WHERE symbole = $1',
      [symbol]
    );

    let entrepriseId;
    if (entrepriseResult.rows.length === 0) {
      const entreprise = await query(
        `INSERT INTO entreprises (symbole, nom, secteur, industrie) 
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [symbol, symbol, 'Unknown', 'Unknown']
      );
      entrepriseId = entreprise.rows[0].id;
    } else {
      entrepriseId = entrepriseResult.rows[0].id;
    }

    // 2. Sauvegarder dans donnees_financieres
    const result = await query(
      `INSERT INTO donnees_financieres (
        entreprise_id, date_import,
        current_price, moving_average_200, dividend_per_share, market_cap,
        cash_equivalents, current_assets, current_liabilities, 
        total_debt, shareholders_equity, net_cash,
        revenue, ebit, net_income, eps, interest_expense,
        ebitda, operating_cash_flow, free_cash_flow
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 
                $15, $16, $17, $18, $19, $20) 
      RETURNING id`,
      [
        entrepriseId,
        date_import || new Date().toISOString().split('T')[0],
        JSON.stringify(profile_data),
        JSON.stringify(quote_data),
        JSON.stringify(cash_flow_data),
        JSON.stringify(income_statement_data),
        JSON.stringify(balance_sheet_data)
      ]
    );

    console.log('✅ Données financières sauvegardées ID:', result.rows[0].id);

    res.status(201).json({
      success: true,
      message: 'Données financières sauvegardées',
      id: result.rows[0].id
    });

  } catch (error) {
    console.error('❌ Erreur sauvegarde données financières:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la sauvegarde des données financières',
      error: error.message
    });
  }
});

// Récupérer l'historique des analyses d'une entreprise
router.get('/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;

    const result = await query(
      `SELECT 
        ab.date_analyse,
        ab.roe,
        ab.net_margin as "netMargin",
        ab.gross_margin as "grossMargin", 
        ab.debt_to_equity as "debtToEquity",
        ab.pe_ratio as "peRatio",
        ab.score_global,
        ab.recommandation,
        ab.points_forts,
        ab.points_faibles
       FROM analyses_buffett ab
       JOIN entreprises e ON ab.entreprise_id = e.id
       WHERE e.symbole = $1
       ORDER BY ab.date_analyse DESC
       LIMIT 50`,
      [symbol]
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
        e.symbole as symbol,
        e.nom as name,
        ab.date_analyse as analysis_date,
        ab.score_global as global_score,
        ab.recommandation as recommendation,
        ab.roe,
        ab.pe_ratio as "peRatio",
        ab.net_margin as "netMargin",
        ab.debt_to_equity as "debtToEquity"
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
