import express from 'express';
import { query } from '../database.js';

const router = express.Router();

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
      freeCashFlow
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
          entreprise_id, date_analyse, periode, 
          roe, "netMargin", "grossMargin", "sgaMargin", roic,
          "debtToEquity", "currentRatio", "interestCoverage",
          "peRatio", "earningsYield", "priceToFCF", "priceToMM200", 
          "dividendYield", "pbRatio", "pegRatio", "evToEbitda",
          score_global, recommandation, points_forts, points_faibles,
          "freeCashFlow"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 
                  $15, $16, $17, $18, $19, $20, $21, $22, $23, $24) 
        RETURNING id`,
        valeurs
      );

    const newId = analyseResult.rows[0].id;
    console.log('🎉 SAUVEGARDE RÉUSSIE - ID:', newId, 'Symbol utilisateur:', symbolUtilisateur);

    res.status(201).json({
      success: true,
      message: 'Analyse sauvegardée avec succès',
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
      symbol, // ⚠️ SYMBOLE TAPÉ PAR L'UTILISATEUR
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
      'brutes', // type_donnee - valeur par défaut
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

export default router;
