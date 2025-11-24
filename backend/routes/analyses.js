import express from 'express';
import { query } from '../database.js';
import cors from 'cors';

const router = express.Router();

// MIDDLEWARE CORS
router.use(cors({
    origin: ['https://paulineb29.github.io', 'http://localhost:3000'],
    credentials: true
}));

// Créer/mettre à jour entreprise seule
router.post('/entreprise', async (req, res) => {
  try {
    console.log('🏢 REQUÊTE CRÉATION ENTREPRISE REÇUE');
    
    const { symbol, nom, secteur, industrie } = req.body;

    console.log('📦 Données entreprise reçues:', { symbol, nom, secteur, industrie });

    if (!symbol || symbol.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Le symbole est obligatoire'
      });
    }

    const symbolClean = symbol.trim().toUpperCase();
    
    // Créer ou mettre à jour l'entreprise
    const entrepriseResult = await query(
      `INSERT INTO entreprises (symbole, nom, secteur, industrie, created_at) 
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (symbole) 
       DO UPDATE SET nom = $2, secteur = $3, industrie = $4
       RETURNING id, symbole, nom, secteur, industrie`,
      [
        symbolClean, 
        nom || symbolClean, 
        secteur || 'Non spécifié', 
        industrie || 'Non spécifié',
        new Date()
      ]
    );

    const entreprise = entrepriseResult.rows[0];
    console.log('✅ Entreprise créée/mise à jour:', entreprise);

    res.json({
      success: true,
      message: 'Entreprise créée/mise à jour avec succès',
      entreprise: entreprise
    });

  } catch (error) {
    console.error('❌ Erreur création entreprise:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur création entreprise',
      error: error.message
    });
  }
});

// Fonction utilitaire pour trouver ou créer une entreprise
async function trouverOuCreerEntreprise(symbol) {
  console.log('🏢 Recherche entreprise:', symbol);
  
  // Validation du symbole
  if (!symbol || symbol.trim() === '') {
    throw new Error('Symbole invalide');
  }

  const symbolClean = symbol.trim().toUpperCase();
  
  // D'abord, essayer de trouver l'entreprise
  let entrepriseResult = await query(
    'SELECT id, symbole, nom FROM entreprises WHERE symbole = $1',
    [symbolClean]
  );

  if (entrepriseResult.rows.length > 0) {
    const entreprise = entrepriseResult.rows[0];
    console.log('✅ Entreprise existante trouvée:', { 
      id: entreprise.id, 
      symbole: entreprise.symbole
    });
    return entreprise.id;
  }

  // Créer l'entreprise si elle n'existe pas
  console.log('➕ Création nouvelle entreprise...');
  
  // ⚠️ IMPORTANT: Utiliser le SYMBOLE TAPÉ par l'utilisateur comme nom aussi
  const nouvelleEntreprise = await query(
    `INSERT INTO entreprises (symbole, nom, secteur, industrie, created_at) 
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [
      symbolClean,           // symbole exact de l'utilisateur
      symbolClean,           // ⚠️ MÊME CHOSE pour le nom (symbole utilisateur)
      'Non spécifié', 
      'Non spécifié',
      new Date() 
    ]
  );
  
  const entrepriseId = nouvelleEntreprise.rows[0].id;
  console.log('✅ Nouvelle entreprise créée:', { 
    id: entrepriseId, 
    symbole: symbolClean 
  });
  
  return entrepriseId;
}



// Sauvegarder une analyse Buffett
router.post('/', async (req, res) => {
  try {
    console.log('🚨 REQUÊTE REÇUE - Début sauvegarde analyse');
    console.log('📦 Données reçues:', Object.keys(req.body));
    
    const {
      symbol, // ⚠️ SYMBOLE TAPÉ PAR L'UTILISATEUR
      date_analyse,
      periode,
      date_publication,
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
      freeCashFlow,
      trading_metrics
    } = req.body;

    console.log('🔍 Symbole utilisateur reçu:', symbol);

    // ⚠️ VALIDATION CRITIQUE - Vérifier que le symbole est présent
    if (!symbol || symbol.trim() === '') {
      console.error('❌ SYMBOLE MANQUANT dans la requête');
      return res.status(400).json({
        success: false,
        message: 'Le symbole est obligatoire',
        error: 'Symbol is required'
      });
    }

    const symbolUtilisateur = symbol.trim().toUpperCase();

    // 1. Trouver ou créer l'entreprise avec le SYMBOLE UTILISATEUR
    const entrepriseId = await trouverOuCreerEntreprise(symbolUtilisateur);

    // 2. SAUVEGARDE RÉELLE
    console.log('💾 Insertion analyse dans la base...');
    
    const valeurs = [
      entrepriseId, 
      date_analyse || new Date().toISOString().split('T')[0], 
      periode || 'annuel',
      date_publication || null,
      // Profitability
      parseFloat(roe) || null,
      parseFloat(netMargin) || null,
      parseFloat(grossMargin) || null,
      parseFloat(sgaMargin) || null,
      parseFloat(roic) || null,
      // Safety  
      parseFloat(debtToEquity) || null,
      parseFloat(currentRatio) || null,
      parseFloat(interestCoverage) || null,
      // Valuation
      parseFloat(peRatio) || null,
      parseFloat(earningsYield) || null,
      parseFloat(priceToFCF) || null,
      parseFloat(priceToMM200) || null,
      parseFloat(dividendYield) || null,
      parseFloat(pbRatio) || null,
      parseFloat(pegRatio) || null,
      parseFloat(evToEbitda) || null,
      // Analysis
      parseFloat(score_global) || null,
      recommandation || 'NON_RECOMMANDE',
      points_forts || '',
      points_faibles || '',
      parseFloat(freeCashFlow) || null
    ];

    const analyseResult = await query(
      `INSERT INTO analyses_buffett (
          entreprise_id, date_analyse, periode, date_publication,
          roe, "netMargin", "grossMargin", "sgaMargin", roic,
          "debtToEquity", "currentRatio", "interestCoverage",
          "peRatio", "earningsYield", "priceToFCF", "priceToMM200", 
          "dividendYield", "pbRatio", "pegRatio", "evToEbitda",
          score_global, recommandation, points_forts, points_faibles,
          "freeCashFlow"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 
                  $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25) 
        RETURNING id`,
        valeurs
      );

    const newId = analyseResult.rows[0].id;

    // ⚠️ 2. SAUVEGARDE TRADING METRICS SI PRÉSENTES
    if (trading_metrics && Object.keys(trading_metrics).length > 0) {
      console.log('💫 Sauvegarde métriques de trading...');
      
      try {
        await query(
          `INSERT INTO trading_metrics_avancees (
            entreprise_id, date_analyse,
            normalized_fcf, dynamic_peg, earnings_quality,
            price_momentum_63d, volatility_30d, quality_score,
            momentum_score, risk_adjusted_score
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (entreprise_id, date_analyse) 
          DO UPDATE SET
            normalized_fcf = EXCLUDED.normalized_fcf,
            dynamic_peg = EXCLUDED.dynamic_peg,
            earnings_quality = EXCLUDED.earnings_quality,
            price_momentum_63d = EXCLUDED.price_momentum_63d,
            volatility_30d = EXCLUDED.volatility_30d,
            quality_score = EXCLUDED.quality_score,
            momentum_score = EXCLUDED.momentum_score,
            risk_adjusted_score = EXCLUDED.risk_adjusted_score`,
          [
            entrepriseId,
            date_analyse || new Date().toISOString().split('T')[0],
            parseFloat(trading_metrics.normalized_fcf) || null,
            parseFloat(trading_metrics.dynamic_peg) || null,
            parseFloat(trading_metrics.earnings_quality) || null,
            parseFloat(trading_metrics.price_momentum_63d) || null,
            parseFloat(trading_metrics.volatility_30d) || null,
            parseInt(trading_metrics.quality_score) || null,
            parseInt(trading_metrics.momentum_score) || null,
            parseInt(trading_metrics.risk_adjusted_score) || null
          ]
        );
        console.log('✅ Métriques de trading sauvegardées');
      } catch (tradingError) {
        console.error('⚠️ Erreur sauvegarde trading metrics (non bloquant):', tradingError);
        // Ne pas bloquer la sauvegarde principale
      }
    }

    console.log('🎉 SAUVEGARDE COMPLÈTE RÉUSSIE - ID:', newId);

    res.status(201).json({
      success: true,
      message: 'Analyse et métriques de trading sauvegardées avec succès',
      id: newId,
      symbol: symbolUtilisateur
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

router.post('/donnees-financieres', async (req, res) => {
  try {
    console.log('💾 REQUÊTE DONNÉES FINANCIÈRES REÇUE');
    
    const {
      symbol,  
      date_import,
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

    console.log('📊 Données financières reçues pour symbole utilisateur:', symbol);

    // ⚠️ VALIDATION CRITIQUE
    if (!symbol || symbol.trim() === '') {
      console.error('❌ SYMBOLE MANQUANT pour données financières');
      return res.status(400).json({
        success: false,
        message: 'Le symbole est obligatoire',
        error: 'Symbol is required'
      });
    }

    const symbolUtilisateur = symbol.trim().toUpperCase();

    // 1. Trouver ou créer l'entreprise avec le SYMBOLE UTILISATEUR
    const entrepriseId = await trouverOuCreerEntreprise(symbolUtilisateur);

    // 2. SAUVEGARDE
    const dateActuelle = new Date().toISOString().split('T')[0];
    
    const valeurs = [
      entrepriseId,
      date_import || dateActuelle,
      date_import || dateActuelle,
      'annuel', // periode - valeur par défaut
      'balance_sheet', // type_donnee - valeur par défaut
      // Price data
      parseFloat(currentPrice) || null,
      parseFloat(movingAverage200) || null,
      parseFloat(dividendPerShare) || null,
      parseFloat(marketCap) || null,
      // Balance sheet
      parseFloat(cashEquivalents) || null,
      parseFloat(currentAssets) || null,
      parseFloat(currentLiabilities) || null,
      parseFloat(totalDebt) || null,
      parseFloat(shareholdersEquity) || null,
      parseFloat(netCash) || null,
      // Income statement
      parseFloat(revenue) || null,
      parseFloat(ebit) || null,
      parseFloat(netIncome) || null,
      parseFloat(eps) || null,
      parseFloat(interestExpense) || null,
      parseFloat(ebitda) || null,
      parseFloat(operatingCashFlow) || null,
      parseFloat(freeCashFlow) || null
    ];

      console.log('💾 Insertion données financières avec', valeurs.length, 'valeurs');
    
    const result = await query(
      `INSERT INTO donnees_financieres (
        entreprise_id, date, date_import, periode, type_donnee,
        current_price, moving_average_200, dividend_per_share, market_cap,
        cash_equivalents, current_assets, current_liabilities, 
        total_debt, shareholders_equity, net_cash,
        revenue, ebit, net_income, eps, interest_expense,
        ebitda, operating_cash_flow, free_cash_flow
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 
                $15, $16, $17, $18, $19, $20, $21, $22, $23) 
      RETURNING id`,
      valeurs
    );

    console.log('✅ DONNÉES FINANCIÈRES SAUVEGARDÉES - ID:', result.rows[0].id, 'Symbol:', symbolUtilisateur);

    res.status(201).json({
      success: true,
      message: 'Données financières sauvegardées',
      id: result.rows[0].id,
      symbol: symbolUtilisateur
    });

  } catch (error) {
    console.error('❌ ERREUR SAUVEGARDE DONNÉES FINANCIÈRES:', error);
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
    
    // ⚠️ Utiliser le symbole exact de l'URL (celui que l'utilisateur a tapé)
    const symbolRecherche = symbol.toUpperCase();

    const result = await query(
      `SELECT 
        ab.date_analyse,
        ab.roe,
        ab.netMargin,
        ab.grossMargin, 
        ab.debtToEquity,
        ab.peRatio,
        ab.score_global,
        ab.recommandation,
        ab.points_forts,
        ab.points_faibles
       FROM analyses_buffett ab
       JOIN entreprises e ON ab.entreprise_id = e.id
       WHERE e.symbole = $1
       ORDER BY ab.date_analyse DESC
       LIMIT 50`,
      [symbolRecherche]
    );

    res.json({
      success: true,
      symbol: symbolRecherche,
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
          ab.peRatio,           
          ab.netMargin,       
          ab.debtToEquity  
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

// =============================================================================
// ROUTES TRADING METRICS AVANCÉES
// =============================================================================

// POST /api/analyses/trading-metrics - Sauvegarder les métriques de trading
router.post('/trading-metrics-avancees', async (req, res) => {
  try {
    console.log('🚀 REQUÊTE TRADING METRICS REÇUE');
    
    const {
      symbol, // ⚠️ SYMBOLE TAPÉ PAR L'UTILISATEUR
      date_analyse,
      // Valorisation dynamique
      normalized_fcf,
      dynamic_peg,
      fcf_yield_3y_avg,
      // Qualité des bénéfices
      earnings_quality,
      accruals_ratio,
      operating_cf_ratio,
      // Momentum intelligent
      price_momentum_63d,
      relative_strength_126d,
      volume_trend,
      // Risque ajusté
      volatility_30d,
      beta_sector,
      short_interest_ratio,
      squeeze_potential,
      // Scores composites
      quality_score,
      momentum_score,
      value_score,
      risk_adjusted_score
    } = req.body;

    console.log('📊 Trading metrics reçues pour:', symbol);

    // ⚠️ VALIDATION CRITIQUE
    if (!symbol || symbol.trim() === '') {
      console.error('❌ SYMBOLE MANQUANT pour trading metrics');
      return res.status(400).json({
        success: false,
        message: 'Le symbole est obligatoire',
        error: 'Symbol is required'
      });
    }

    const symbolUtilisateur = symbol.trim().toUpperCase();

    // 1. Trouver ou créer l'entreprise avec le SYMBOLE UTILISATEUR
    const entrepriseId = await trouverOuCreerEntreprise(symbolUtilisateur);

    // 2. SAUVEGARDE DANS LA NOUVELLE TABLE
    console.log('💾 Insertion trading metrics...');
    
    const valeurs = [
      entrepriseId,
      date_analyse || new Date().toISOString().split('T')[0],
      // Valorisation dynamique
      parseFloat(normalized_fcf) || null,
      parseFloat(dynamic_peg) || null,
      parseFloat(fcf_yield_3y_avg) || null,
      // Qualité des bénéfices
      parseFloat(earnings_quality) || null,
      parseFloat(accruals_ratio) || null,
      parseFloat(operating_cf_ratio) || null,
      // Momentum intelligent
      parseFloat(price_momentum_63d) || null,
      parseFloat(relative_strength_126d) || null,
      parseFloat(volume_trend) || null,
      // Risque ajusté
      parseFloat(volatility_30d) || null,
      parseFloat(beta_sector) || null,
      parseFloat(short_interest_ratio) || null,
      squeeze_potential || 'LOW',
      // Scores composites
      parseInt(quality_score) || null,
      parseInt(momentum_score) || null,
      parseInt(value_score) || null,
      parseInt(risk_adjusted_score) || null
    ];

    const tradingMetricsResult = await query(
      `INSERT INTO trading_metrics_avancees (
        entreprise_id, date_analyse,
        normalized_fcf, dynamic_peg, fcf_yield_3y_avg,
        earnings_quality, accruals_ratio, operating_cf_ratio,
        price_momentum_63d, relative_strength_126d, volume_trend,
        volatility_30d, beta_sector, short_interest_ratio, squeeze_potential,
        quality_score, momentum_score, value_score, risk_adjusted_score
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      ON CONFLICT (entreprise_id, date_analyse) 
      DO UPDATE SET
        normalized_fcf = EXCLUDED.normalized_fcf,
        dynamic_peg = EXCLUDED.dynamic_peg,
        fcf_yield_3y_avg = EXCLUDED.fcf_yield_3y_avg,
        earnings_quality = EXCLUDED.earnings_quality,
        accruals_ratio = EXCLUDED.accruals_ratio,
        operating_cf_ratio = EXCLUDED.operating_cf_ratio,
        price_momentum_63d = EXCLUDED.price_momentum_63d,
        relative_strength_126d = EXCLUDED.relative_strength_126d,
        volume_trend = EXCLUDED.volume_trend,
        volatility_30d = EXCLUDED.volatility_30d,
        beta_sector = EXCLUDED.beta_sector,
        short_interest_ratio = EXCLUDED.short_interest_ratio,
        squeeze_potential = EXCLUDED.squeeze_potential,
        quality_score = EXCLUDED.quality_score,
        momentum_score = EXCLUDED.momentum_score,
        value_score = EXCLUDED.value_score,
        risk_adjusted_score = EXCLUDED.risk_adjusted_score,
        created_at = NOW()
      RETURNING id`,
      valeurs
    );

    const newId = tradingMetricsResult.rows[0].id;
    console.log('🎉 TRADING METRICS SAUVEGARDÉES - ID:', newId, 'Symbol:', symbolUtilisateur);

    res.status(201).json({
      success: true,
      message: 'Métriques de trading sauvegardées avec succès',
      id: newId,
      symbol: symbolUtilisateur
    });

  } catch (error) {
    console.error('❌ Erreur sauvegarde trading metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la sauvegarde des métriques de trading',
      error: error.message
    });
  }
});

// GET /api/analyses/trading-metrics/:symbol - Récupérer les métriques de trading
router.get('/trading-metrics/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    
    const symbolRecherche = symbol.toUpperCase();

    const result = await query(
      `SELECT 
        tm.date_analyse,
        tm.normalized_fcf,
        tm.dynamic_peg,
        tm.earnings_quality,
        tm.accruals_ratio,
        tm.price_momentum_63d,
        tm.relative_strength_126d,
        tm.volatility_30d,
        tm.beta_sector,
        tm.short_interest_ratio,
        tm.squeeze_potential,
        tm.quality_score,
        tm.momentum_score,
        tm.value_score,
        tm.risk_adjusted_score,
        e.symbole,
        e.nom,
        e.secteur
       FROM trading_metrics_avancees tm
       JOIN entreprises e ON tm.entreprise_id = e.id
       WHERE e.symbole = $1
       ORDER BY tm.date_analyse DESC
       LIMIT 10`,
      [symbolRecherche]
    );

    res.json({
      success: true,
      symbol: symbolRecherche,
      trading_metrics: result.rows
    });

  } catch (error) {
    console.error('Erreur récupération trading metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des métriques de trading',
      error: error.message
    });
  }
});

// GET /api/analyses/dashboard/trading - Dashboard trading avancé
router.get('/dashboard/trading', async (req, res) => {
  try {
    const { 
      min_quality = 70, 
      min_momentum = 60,
      squeeze_only = false 
    } = req.query;

    let querySql = `
      SELECT 
        e.symbole,
        e.nom,
        e.secteur,
        tm.quality_score,
        tm.momentum_score,
        tm.risk_adjusted_score,
        tm.squeeze_potential,
        tm.short_interest_ratio,
        tm.price_momentum_63d,
        tm.volatility_30d,
        CASE 
          WHEN tm.quality_score >= 80 AND tm.momentum_score >= 70 THEN '🚀 BUY_STRONG'
          WHEN tm.squeeze_potential = 'HIGH' AND tm.momentum_score >= 60 THEN '🔥 SQUEEZE_CANDIDATE'
          WHEN tm.quality_score >= 70 AND tm.momentum_score >= 50 THEN '✅ BUY'
          WHEN tm.quality_score < 30 OR tm.risk_adjusted_score < 40 THEN '🚨 AVOID'
          WHEN tm.momentum_score < 30 THEN '📉 WEAK_MOMENTUM'
          ELSE '📊 MONITOR'
        END as signal_trading,
        ROUND(tm.quality_score * 0.4 + tm.momentum_score * 0.4 + tm.risk_adjusted_score * 0.2) as overall_score
      FROM trading_metrics_avancees tm
      JOIN entreprises e ON tm.entreprise_id = e.id
      WHERE tm.date_analyse = CURRENT_DATE
    `;

    const params = [];
    
    if (squeeze_only === 'true') {
      querySql += ` AND tm.squeeze_potential IN ('HIGH', 'VERY_HIGH')`;
    } else {
      querySql += ` AND tm.quality_score >= $1 AND tm.momentum_score >= $2`;
      params.push(parseInt(min_quality), parseInt(min_momentum));
    }

    querySql += ` ORDER BY overall_score DESC LIMIT 50`;

    const result = await query(querySql, params);

    res.json({
      success: true,
      dashboard: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('Erreur dashboard trading:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la génération du dashboard',
      error: error.message
    });
  }
});

export default router;
