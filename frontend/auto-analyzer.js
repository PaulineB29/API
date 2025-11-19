// =============================================================================
// AUTO-ANALYZER.js - Analyse Automatique Complète
// =============================================================================

// Variables globales pour l'analyse automatique
let analysisQueue = [];
let currentAnalysisIndex = 0;
let analysisResults = [];
let isAnalyzing = false;

console.log('📊 AutoAnalyzer chargé - Prêt pour l analyse automatique');

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initAutoAnalyzer, 2000);
});

function initAutoAnalyzer() {
    console.log('🚀 Initialisation de l analyseur automatique...');
    addAutoAnalysisButton();
    injectAutoAnalyzerStyles();
}

function addAutoAnalysisButton() {
    const modalHeader = document.querySelector('.modal-header');
    
    if (modalHeader && !document.getElementById('autoAnalyzeBtn')) {
        const autoAnalyzeBtn = document.createElement('button');
        autoAnalyzeBtn.id = 'autoAnalyzeBtn';
        autoAnalyzeBtn.className = 'btn-primary';
        autoAnalyzeBtn.innerHTML = '🚀 Analyser toutes les entreprises';
        autoAnalyzeBtn.addEventListener('click', startAutoAnalysis);
        modalHeader.appendChild(autoAnalyzeBtn);
        
        console.log('✅ Bouton d analyse automatique ajouté');
    } else {
        console.log('⏳ Modal non trouvé, réessai dans 2 secondes...');
        setTimeout(addAutoAnalysisButton, 2000);
    }
}

// =============================================================================
// FONCTIONS PRINCIPALES
// =============================================================================

async function startAutoAnalysis() {
    console.log('🎯 Démarrage de l analyse automatique...');
    
    if (typeof allCompaniesData === 'undefined' || allCompaniesData.length === 0) {
        alert('Veuillez d\'abord charger les entreprises en cliquant sur "📋 Rechercher entreprise"');
        return;
    }

    // Filtrer les entreprises avant analyse
    const filteredCompanies = filterCompaniesBeforeAnalysis(allCompaniesData);
    
    if (filteredCompanies.length === 0) {
        alert('Aucune entreprise valide à analyser');
        return;
    }

    const originalCount = allCompaniesData.length;
    const filteredCount = filteredCompanies.length;
    
    if (filteredCount < originalCount) {
        if (!confirm(`${originalCount - filteredCount} entreprises exclues (symboles invalides).\nAnalyser les ${filteredCount} entreprises restantes ?`)) {
            return;
        }
    } else {
        if (!confirm(`Voulez-vous analyser ${filteredCount} entreprises ?\nCela peut prendre plusieurs minutes.`)) {
            return;
        }
    }

    // Préparer l'analyse
    analysisQueue = filteredCompanies;
    currentAnalysisIndex = 0;
    analysisResults = [];
    isAnalyzing = true;

    // Créer l'interface de progression
    createAnalysisProgressUI();

    // Démarrer l'analyse
    await processNextCompany();
}

async function processNextCompany() {
    if (!isAnalyzing || currentAnalysisIndex >= analysisQueue.length) {
        finishAutoAnalysis();
        return;
    }

    const company = analysisQueue[currentAnalysisIndex];
    const progress = ((currentAnalysisIndex + 1) / analysisQueue.length) * 100;

    // Mettre à jour la progression
    updateProgressUI(company, progress);

    try {
        // Analyser cette entreprise
        await analyzeSingleCompany(company.symbol, company.companyName || company.name);
        
    } catch (error) {
        console.error(`❌ Erreur sur ${company.symbol}:`, error);
        
        // Déterminer le type d'erreur
        let errorMessage = error.message;
        let errorType = 'error';
        
        if (error.message.includes('non trouvé') || error.message.includes('not found') || error.message.includes('404')) {
            errorMessage = 'Symbole introuvable';
            errorType = 'not-found';
        } else if (error.message.includes('quota') || error.message.includes('limit')) {
            errorMessage = 'Limite API atteinte';
            errorType = 'api-limit';
        } else if (error.message.includes('timeout') || error.message.includes('time out')) {
            errorMessage = 'Timeout - Trop long';
            errorType = 'timeout';
        }
        
        addToAnalysisLog(company.symbol, `❌ ${errorMessage}`, errorType);
        
        // Stocker l'échec dans les résultats
        analysisResults.push({
            symbol: company.symbol,
            companyName: company.companyName || company.name,
            error: true,
            errorMessage: errorMessage,
            date: new Date().toISOString()
        });
    }

    // Passer à l'entreprise suivante après un délai
    currentAnalysisIndex++;
    
    // Délai adaptatif selon le type d'erreur
    let delay = 1000;
    if (analysisQueue[currentAnalysisIndex - 1]?.errorMessage?.includes('Limite API')) {
        delay = 5000;
    }
    
    await new Promise(resolve => setTimeout(resolve, delay));
    await processNextCompany();
}

async function analyzeSingleCompany(symbol, companyName) {
    addToAnalysisLog(symbol, `🔍 Analyse en cours...`, 'info');

    try {
        // Timeout global de 30 secondes
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout - Analyse trop longue')), 30000);
        });

        // Récupérer les données
        const fetchPromise = Promise.all([
            fetchWithErrorHandling(`/profile?symbol=${symbol}`, 'profil'),
            fetchWithErrorHandling(`/quote?symbol=${symbol}`, 'cotation'),
            fetchWithErrorHandling(`/cash-flow-statement?symbol=${symbol}`, 'cash flow'),
            fetchWithErrorHandling(`/income-statement?symbol=${symbol}`, 'compte de résultat'),
            fetchWithErrorHandling(`/balance-sheet-statement?symbol=${symbol}`, 'bilan')
        ]);

        const [profile, quote, cashFlow, incomeStatement, balanceSheet] = 
            await Promise.race([fetchPromise, timeoutPromise]);

        // Vérifier si les données sont valides
        if (!profile || profile.length === 0 || !profile[0]) {
            throw new Error('Profil introuvable');
        }

        if (!quote || quote.length === 0 || !quote[0]) {
            throw new Error('Cotation introuvable');
        }

        const companyData = {
            profile: profile[0],
            quote: quote[0],
            cashFlow: cashFlow?.[0],
            incomeStatement: incomeStatement?.[0],
            balanceSheet: balanceSheet?.[0]
        };

        // Vérifier les données critiques
        if (!companyData.profile.companyName) {
            throw new Error('Données entreprise incomplètes');
        }

        if (!companyData.quote.price || companyData.quote.price === 0) {
            throw new Error('Prix non disponible');
        }

        // Calculer les métriques
        const metrics = calculateCompanyMetricsSafe(companyData);
        const scores = calculateScoresAuto(metrics);
        const totalScore = scores.excellent * 3 + scores.good * 2 + scores.medium;
        const maxScore = (scores.excellent + scores.good + scores.medium + scores.bad) * 3;
        const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

        // Déterminer la recommandation
        let recommendation;
        if (percentage >= 75) recommendation = 'EXCELLENT';
        else if (percentage >= 60) recommendation = 'BON';
        else if (percentage >= 45) recommendation = 'MOYEN';
        else recommendation = 'FAIBLE';

        // Stocker le résultat
        const result = {
            symbol,
            companyName,
            metrics,
            recommendation,
            score: percentage,
            date: new Date().toISOString(),
            success: true
        };

        analysisResults.push(result);

        // LIGNE POUR SAUVEGARDER 
                const saved = await sauvegarderAnalyseAutomatique(metrics, recommendation, companyData);
        if (saved) {
            addToAnalysisLog(symbol, `💾 Données sauvegardées dans les 3 tables`, 'success');
        } else {
            addToAnalysisLog(symbol, `⚠️ Erreur sauvegarde base de données`, 'warning');
        }
        
        // Afficher le résultat
        const logClass = getRecommendationClass(recommendation);
        addToAnalysisLog(symbol, `${recommendation} (${percentage.toFixed(0)}%) - ${companyName}`, logClass);

        // Mettre à jour les compteurs
        updateResultsCounters();

    } catch (error) {
        throw error;
    }
}

// =============================================================================
// SAUVEGARDE COMPLÈTE POUR LES 3 TABLES
// =============================================================================

async function sauvegarderAnalyseAutomatique(metrics, recommendation, companyData) {
    try {
        console.log(`💾 Sauvegarde COMPLÈTE de ${companyData.profile.symbol}...`);

        const datePublication = companyData.incomeStatement?.date || 
                               companyData.incomeStatement?.filingDate || 
                               new Date().toISOString().split('T')[0];

        // CALCUL DU SCORE GLOBAL (important pour analyses_buffett)
        const scores = calculateScoresAuto(metrics);
        const totalScore = scores.excellent * 3 + scores.good * 2 + scores.medium;
        const maxScore = (scores.excellent + scores.good + scores.medium + scores.bad) * 3;
        const scoreGlobal = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

        // DONNÉES COMPLÈTES POUR LES 3 TABLES
        const analyseData = {
            // ============================================
            // POUR LA TABLE analyses_buffett (TOUTES les colonnes)
            // ============================================
            
            // Identifiants et dates
            symbol: companyData.profile.symbol,
            date_analyse: new Date().toISOString().split('T')[0],
            periode: 'FY',
            date_publication: datePublication,
            score_global: scoreGlobal,
            
            // METRIQUES DE PROFITABILITÉ (22 colonnes au total)
            roe: metrics.roe,
            netMargin: metrics.netMargin,
            grossMargin: metrics.grossMargin,
            sgaMargin: metrics.sgaMargin,
            roic: metrics.roic,
            
            // METRIQUES DE SÉCURITÉ
            debtToEquity: metrics.debtToEquity,
            currentRatio: metrics.currentRatio,
            interestCoverage: metrics.interestCoverage,
            
            // METRIQUES DE VALUATION
            peRatio: metrics.peRatio,
            earningsYield: metrics.earningsYield,
            priceToFCF: metrics.priceToFCF,
            priceToMM200: metrics.priceToMM200,
            dividendYield: metrics.dividendYield,
            pbRatio: metrics.pbRatio,
            pegRatio: metrics.pegRatio,
            evToEbitda: metrics.evToEbitda,
            
            // AUTRES METRIQUES
            freeCashFlow: metrics.freeCashFlow,
            
            // RECOMMANDATION ET ANALYSE
            recommandation: recommendation,
            points_forts: getStrengthsAuto(metrics).join('; '),
            points_faibles: getWeaknessesAuto(metrics).join('; '),

            // ============================================
            // POUR CRÉER L'ENTREPRISE (table entreprises)
            // ============================================
            entreprise_nom: companyData.profile.companyName,
            entreprise_symbole: companyData.profile.symbol,
            secteur: companyData.profile.sector || 'Non spécifié',
            industrie: companyData.profile.industry || 'Non spécifié',

            // ============================================
            // POUR LES DONNÉES FINANCIÈRES BRUTES (table donnees_financieres)
            // ============================================
            
            // DONNÉES DE PRIX ET MARKET CAP
            prix_actuel: companyData.quote.price,
            mm_200: companyData.quote.priceAvg200,
            current_price: companyData.quote.price,
            moving_average_200: companyData.quote.priceAvg200,
            dividend_per_share: companyData.profile.lastDividend,
            market_cap: companyData.quote.marketCap,

            // DONNÉES DE BILAN (balance sheet)
            tresorerie: companyData.balanceSheet?.cashAndCashEquivalents,
            cash_equivalents: companyData.balanceSheet?.cashAndCashEquivalents,
            actifs_courants: companyData.balanceSheet?.totalCurrentAssets,
            current_assets: companyData.balanceSheet?.totalCurrentAssets,
            passifs_courants: companyData.balanceSheet?.totalCurrentLiabilities,
            current_liabilities: companyData.balanceSheet?.totalCurrentLiabilities,
            dette_totale: companyData.balanceSheet?.totalDebt,
            total_debt: companyData.balanceSheet?.totalDebt,
            capitaux_propres: companyData.balanceSheet?.totalStockholdersEquity,
            shareholders_equity: companyData.balanceSheet?.totalStockholdersEquity,
            net_cash: (companyData.balanceSheet?.cashAndCashEquivalents || 0) - (companyData.balanceSheet?.totalDebt || 0),

            // DONNÉES DE COMPTE DE RÉSULTAT (income statement)
            revenus: companyData.incomeStatement?.revenue,
            revenue: companyData.incomeStatement?.revenue,
            ebit: companyData.incomeStatement?.operatingIncome,
            ebitda: companyData.incomeStatement?.ebitda,
            benefice_net: companyData.incomeStatement?.netIncome,
            net_income: companyData.incomeStatement?.netIncome,
            frais_financiers: Math.abs(companyData.incomeStatement?.interestExpense || 0),
            interest_expense: Math.abs(companyData.incomeStatement?.interestExpense || 0),
            bpa: companyData.incomeStatement?.eps,
            eps: companyData.incomeStatement?.eps,

            // DONNÉES DE CASH FLOW
            cash_flow_operationnel: companyData.cashFlow?.operatingCashFlow,
            operating_cash_flow: companyData.cashFlow?.operatingCashFlow,
            free_cash_flow: companyData.cashFlow?.freeCashFlow,
            capex: Math.abs(companyData.cashFlow?.capitalExpenditure || 0),

            // TYPE DE DONNÉES (important pour donnees_financieres)
            type_donnee: 'complet'
        };

        console.log(`📤 Envoi de ${Object.keys(analyseData).length} champs pour ${companyData.profile.symbol}...`);

        // VÉRIFICATION : Afficher les données envoyées (pour debug)
        console.log('🔍 Données envoyées:', {
            symbol: analyseData.symbol,
            metriques: Object.keys(metrics).length,
            recommendation: analyseData.recommandation,
            score_global: analyseData.score_global,
            donnees_brutes: {
                prix: analyseData.prix_actuel,
                revenue: analyseData.revenue,
                benefice: analyseData.benefice_net,
                cash_flow: analyseData.free_cash_flow
            }
        });

        // ENVOI VERS L'API
        const response = await fetch('https://api-u54u.onrender.com/api/analyses', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(analyseData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Erreur HTTP ${response.status}:`, errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        
        if (result.success) {
            console.log(`✅ ${companyData.profile.symbol} - ID: ${result.id}`);
            addToAnalysisLog(companyData.profile.symbol, `💾 Sauvegardé (ID: ${result.id})`, 'success');
            return true;
        } else {
            console.warn(`⚠️ ${companyData.profile.symbol} - ${result.message}`);
            addToAnalysisLog(companyData.profile.symbol, `⚠️ ${result.message}`, 'warning');
            return false;
        }

    } catch (error) {
        console.error(`❌ Erreur sauvegarde ${companyData.profile.symbol}:`, error);
        addToAnalysisLog(companyData.profile.symbol, `❌ ${error.message}`, 'error');
        return false;
    }
}

// CALCUL DES POINTS FORTS/FAIBLES AMÉLIORÉ
function getStrengthsAuto(metrics) {
    const strengths = [];
    
    // Profitabilité
    if (metrics.roe > 20) strengths.push('ROE exceptionnel (>20%)');
    if (metrics.netMargin > 20) strengths.push('Forte marge nette (>20%)');
    if (metrics.grossMargin > 40) strengths.push('Bonne marge brute (>40%)');
    if (metrics.roic > 15) strengths.push('ROIC excellent (>15%)');
    if (metrics.sgaMargin < 20) strengths.push('Faibles frais généraux (<20%)');
    
    // Sécurité
    if (metrics.debtToEquity < 0.3) strengths.push('Faible endettement (<0.3)');
    if (metrics.currentRatio > 2.0) strengths.push('Bonne liquidité (>2.0)');
    if (metrics.interestCoverage > 10) strengths.push('Excellente couverture des intérêts (>10x)');
    
    // Valuation
    if (metrics.peRatio < 10) strengths.push('P/E ratio attractif (<10)');
    if (metrics.earningsYield > 10) strengths.push('Rendement des bénéfices élevé (>10%)');
    if (metrics.priceToFCF < 10) strengths.push('Price/FCF attractif (<10)');
    if (metrics.dividendYield > 4) strengths.push('Dividende attractif (>4%)');
    if (metrics.pbRatio < 1.5) strengths.push('Price/Book attractif (<1.5)');
    if (metrics.evToEbitda < 8) strengths.push('EV/EBITDA attractif (<8)');
    
    return strengths.length > 0 ? strengths : ['Aucun point fort significatif'];
}

function getWeaknessesAuto(metrics) {
    const weaknesses = [];
    
    // Profitabilité
    if (metrics.roe < 10 && metrics.roe !== null) weaknesses.push('ROE faible (<10%)');
    if (metrics.netMargin < 10 && metrics.netMargin !== null) weaknesses.push('Marge nette faible (<10%)');
    if (metrics.grossMargin < 30 && metrics.grossMargin !== null) weaknesses.push('Marge brute faible (<30%)');
    if (metrics.roic < 8 && metrics.roic !== null) weaknesses.push('ROIC faible (<8%)');
    if (metrics.sgaMargin > 30) weaknesses.push('Frais généraux élevés (>30%)');
    
    // Sécurité
    if (metrics.debtToEquity > 1.0) weaknesses.push('Dette élevée (>1.0)');
    if (metrics.currentRatio < 1.0) weaknesses.push('Problème de liquidité (<1.0)');
    if (metrics.interestCoverage < 3 && metrics.interestCoverage !== null) weaknesses.push('Couverture des intérêts faible (<3x)');
    
    // Valuation
    if (metrics.peRatio > 25) weaknesses.push('P/E ratio élevé (>25)');
    if (metrics.earningsYield < 4 && metrics.earningsYield !== null) weaknesses.push('Rendement des bénéfices faible (<4%)');
    if (metrics.priceToFCF > 20) weaknesses.push('Price/FCF élevé (>20)');
    if (metrics.dividendYield < 2 && metrics.dividendYield !== null) weaknesses.push('Dividende faible (<2%)');
    if (metrics.pbRatio > 3) weaknesses.push('Price/Book élevé (>3)');
    if (metrics.evToEbitda > 12) weaknesses.push('EV/EBITDA élevé (>12)');
    
    return weaknesses.length > 0 ? weaknesses : ['Aucun point faible significatif'];
}

// CALCUL DES SCORES DÉTAILLÉ
function calculateScoresAuto(metrics) {
    const scores = { excellent: 0, good: 0, medium: 0, bad: 0 };
    
    // Liste complète des métriques à évaluer
    const metricThresholds = [
        { key: 'roe', excellent: 20, good: 15, medium: 10, reverse: false },
        { key: 'netMargin', excellent: 20, good: 15, medium: 10, reverse: false },
        { key: 'grossMargin', excellent: 40, good: 30, medium: 20, reverse: false },
        { key: 'sgaMargin', excellent: 10, good: 20, medium: 30, reverse: true },
        { key: 'roic', excellent: 15, good: 10, medium: 8, reverse: false },
        { key: 'debtToEquity', excellent: 0.3, good: 0.5, medium: 1.0, reverse: true },
        { key: 'currentRatio', excellent: 2.0, good: 1.5, medium: 1.0, reverse: false },
        { key: 'interestCoverage', excellent: 10, good: 5, medium: 3, reverse: false },
        { key: 'peRatio', excellent: 10, good: 15, medium: 25, reverse: true },
        { key: 'earningsYield', excellent: 10, good: 6, medium: 4, reverse: false },
        { key: 'priceToFCF', excellent: 10, good: 15, medium: 20, reverse: true },
        { key: 'priceToMM200', excellent: 5, good: 0, medium: -5, reverse: false },
        { key: 'dividendYield', excellent: 4, good: 2, medium: 1, reverse: false },
        { key: 'pbRatio', excellent: 1.5, good: 3, medium: 5, reverse: true },
        { key: 'pegRatio', excellent: 0.8, good: 1.0, medium: 1.2, reverse: true },
        { key: 'evToEbitda', excellent: 8, good: 12, medium: 15, reverse: true }
    ];

    metricThresholds.forEach(threshold => {
        const value = metrics[threshold.key];
        if (value !== null && value !== undefined) {
            if (threshold.reverse) {
                if (value <= threshold.excellent) scores.excellent++;
                else if (value <= threshold.good) scores.good++;
                else if (value <= threshold.medium) scores.medium++;
                else scores.bad++;
            } else {
                if (value >= threshold.excellent) scores.excellent++;
                else if (value >= threshold.good) scores.good++;
                else if (value >= threshold.medium) scores.medium++;
                else scores.bad++;
            }
        }
    });
    
    return scores;
}
// =============================================================================
// FONCTIONS UTILITAIRES
// =============================================================================

async function fetchWithErrorHandling(endpoint, dataType) {
    try {
        // Utiliser la fonction fetchAPI de votre script principal
        const data = await fetchAPI(endpoint);
        
        if (!data) {
            throw new Error(`Données ${dataType} non disponibles`);
        }
        
        if (data.error) {
            throw new Error(`Erreur API: ${data.error}`);
        }
        
        return data;
    } catch (error) {
        if (error.message.includes('404') || error.message.includes('not found')) {
            throw new Error(`${dataType} introuvable`);
        } else if (error.message.includes('401') || error.message.includes('403')) {
            throw new Error(`Accès ${dataType} refusé`);
        } else if (error.message.includes('500') || error.message.includes('503')) {
            throw new Error(`Service ${dataType} indisponible`);
        } else {
            throw new Error(`Erreur ${dataType}: ${error.message}`);
        }
    }
}

function calculateCompanyMetricsSafe(companyData) {
    const { profile, quote, balanceSheet, incomeStatement, cashFlow } = companyData;
    const metrics = {};
    
    // Profitabilité
    try {
        if (incomeStatement?.netIncome && balanceSheet?.totalStockholdersEquity && balanceSheet.totalStockholdersEquity !== 0) {
            metrics.roe = (incomeStatement.netIncome / balanceSheet.totalStockholdersEquity) * 100;
        }
    } catch (e) { metrics.roe = null; }
    
    try {
        if (incomeStatement?.netIncome && incomeStatement?.revenue && incomeStatement.revenue !== 0) {
            metrics.netMargin = (incomeStatement.netIncome / incomeStatement.revenue) * 100;
        }
    } catch (e) { metrics.netMargin = null; }
    
    // Sécurité financière
    try {
        if (balanceSheet?.totalLiabilities && balanceSheet?.totalStockholdersEquity && balanceSheet.totalStockholdersEquity !== 0) {
            metrics.debtToEquity = balanceSheet.totalLiabilities / balanceSheet.totalStockholdersEquity;
        }
    } catch (e) { metrics.debtToEquity = null; }
    
    try {
        if (balanceSheet?.totalCurrentAssets && balanceSheet?.totalCurrentLiabilities && balanceSheet.totalCurrentLiabilities !== 0) {
            metrics.currentRatio = balanceSheet.totalCurrentAssets / balanceSheet.totalCurrentLiabilities;
        }
    } catch (e) { metrics.currentRatio = null; }
    
    // Valuation
    try {
        if (quote?.price && incomeStatement?.epsDiluted && incomeStatement.epsDiluted !== 0) {
            metrics.peRatio = quote.price / incomeStatement.epsDiluted;
        }
    } catch (e) { metrics.peRatio = null; }
    
    try {
        if (incomeStatement?.epsDiluted && quote?.price && quote.price !== 0) {
            metrics.earningsYield = (incomeStatement.epsDiluted / quote.price) * 100;
        }
    } catch (e) { metrics.earningsYield = null; }
    
    // Nettoyer les métriques invalides
    Object.keys(metrics).forEach(key => {
        if (metrics[key] === null || !isFinite(metrics[key]) || Math.abs(metrics[key]) > 1000000) {
            metrics[key] = null;
        }
    });
    
    return metrics;
}

function calculateScoresAuto(metrics) {
    const scores = { excellent: 0, good: 0, medium: 0, bad: 0 };
    
    // Scores simplifiés pour l'analyse automatique
    if (metrics.roe > 20) scores.excellent++;
    else if (metrics.roe > 15) scores.good++;
    else if (metrics.roe > 10) scores.medium++;
    else if (metrics.roe !== null) scores.bad++;
    
    if (metrics.netMargin > 20) scores.excellent++;
    else if (metrics.netMargin > 15) scores.good++;
    else if (metrics.netMargin > 10) scores.medium++;
    else if (metrics.netMargin !== null) scores.bad++;
    
    if (metrics.debtToEquity < 0.3) scores.excellent++;
    else if (metrics.debtToEquity < 0.5) scores.good++;
    else if (metrics.debtToEquity < 1.0) scores.medium++;
    else if (metrics.debtToEquity !== null) scores.bad++;
    
    if (metrics.peRatio < 10) scores.excellent++;
    else if (metrics.peRatio < 15) scores.good++;
    else if (metrics.peRatio < 25) scores.medium++;
    else if (metrics.peRatio !== null) scores.bad++;
    
    return scores;
}

function filterCompaniesBeforeAnalysis(companies) {
    return companies.filter(company => {
        if (!company.symbol || company.symbol.length === 0) return false;
        if (company.symbol.length < 2) return false;
        if (!/^[A-Z0-9.-]+$/.test(company.symbol)) return false;
        return true;
    });
}

// =============================================================================
// INTERFACE UTILISATEUR
// =============================================================================

function createAnalysisProgressUI() {
    const progressHTML = `
        <div id="autoAnalysisProgress" class="auto-analysis-progress">
            <div class="progress-header">
                <h3>🔍 Analyse Automatique en Cours</h3>
                <button id="cancelAnalysis" class="btn-secondary">❌ Arrêter</button>
            </div>
            <div class="progress-stats">
                <div class="progress-bar">
                    <div class="progress-fill" id="progressFill" style="width: 0%"></div>
                </div>
                <div class="progress-text">
                    <span id="progressText">0/${analysisQueue.length}</span>
                    <span id="currentCompany">Préparation...</span>
                </div>
                <div class="results-summary">
                    <span class="result-excellent">✅ Excellent: <span id="countExcellent">0</span></span>
                    <span class="result-good">👍 Bon: <span id="countGood">0</span></span>
                    <span class="result-medium">⚠️ Moyen: <span id="countMedium">0</span></span>
                    <span class="result-bad">❌ Faible: <span id="countBad">0</span></span>
                    <span class="result-error">🚫 Erreurs: <span id="countErrors">0</span></span>
                </div>
            </div>
            <div class="analysis-log" id="analysisLog"></div>
        </div>
    `;

    const existingProgress = document.getElementById('autoAnalysisProgress');
    if (existingProgress) existingProgress.remove();

    document.body.insertAdjacentHTML('beforeend', progressHTML);

    document.getElementById('cancelAnalysis').addEventListener('click', stopAutoAnalysis);
}

function updateProgressUI(company, progress) {
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const currentCompany = document.getElementById('currentCompany');

    if (progressFill) progressFill.style.width = `${progress}%`;
    if (progressText) progressText.textContent = `${currentAnalysisIndex + 1}/${analysisQueue.length}`;
    if (currentCompany) currentCompany.textContent = `${company.symbol} - ${company.companyName || company.name}`;
}

function addToAnalysisLog(symbol, message, type = 'info') {
    const log = document.getElementById('analysisLog');
    if (!log) return;

    const logEntry = document.createElement('div');
    logEntry.className = `log-entry log-${type}`;
    logEntry.innerHTML = `<strong>${symbol}:</strong> ${message}`;
    
    log.appendChild(logEntry);
    log.scrollTop = log.scrollHeight;
}

function updateResultsCounters() {
    const successResults = analysisResults.filter(r => r.success);
    const errorResults = analysisResults.filter(r => r.error);
    
    const counts = {
        excellent: successResults.filter(r => r.recommendation === 'EXCELLENT').length,
        good: successResults.filter(r => r.recommendation === 'BON').length,
        medium: successResults.filter(r => r.recommendation === 'MOYEN').length,
        bad: successResults.filter(r => r.recommendation === 'FAIBLE').length,
        errors: errorResults.length
    };

    // Mettre à jour les compteurs
    ['countExcellent', 'countGood', 'countMedium', 'countBad', 'countErrors'].forEach(id => {
        const element = document.getElementById(id);
        if (element) element.textContent = counts[id.replace('count', '').toLowerCase()] || 0;
    });
}

function stopAutoAnalysis() {
    isAnalyzing = false;
    addToAnalysisLog('SYSTEM', '⏹️ Analyse arrêtée par l utilisateur', 'warning');
    
    const progressHeader = document.querySelector('#autoAnalysisProgress .progress-header h3');
    if (progressHeader) {
        progressHeader.textContent = '🔍 Analyse Arrêtée';
    }
}

function finishAutoAnalysis() {
    isAnalyzing = false;
    addToAnalysisLog('SYSTEM', '✅ Analyse terminée !', 'success');
    
    const progressHeader = document.querySelector('#autoAnalysisProgress .progress-header h3');
    if (progressHeader) {
        progressHeader.textContent = '✅ Analyse Terminée';
    }

    // Résumé final
    const excellent = analysisResults.filter(r => r.recommendation === 'EXCELLENT').length;
    const good = analysisResults.filter(r => r.recommendation === 'BON').length;
    const medium = analysisResults.filter(r => r.recommendation === 'MOYEN').length;
    const bad = analysisResults.filter(r => r.recommendation === 'FAIBLE').length;
    const errors = analysisResults.filter(r => r.error).length;

    setTimeout(() => {
        alert(`🎉 Analyse terminée !\n\n✅ Excellent: ${excellent}\n👍 Bon: ${good}\n⚠️ Moyen: ${medium}\n❌ Faible: ${bad}\n🚫 Erreurs: ${errors}\n\nTotal: ${analysisResults.length} entreprises analysées`);
    }, 1000);
}

function getRecommendationClass(recommendation) {
    const classes = {
        'EXCELLENT': 'excellent',
        'BON': 'good', 
        'MOYEN': 'medium',
        'FAIBLE': 'bad'
    };
    return classes[recommendation] || 'info';
}

// =============================================================================
// STYLES
// =============================================================================

function injectAutoAnalyzerStyles() {
    const styles = `
        .auto-analysis-progress {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border: 2px solid #e1e5e9;
            border-radius: 10px;
            padding: 20px;
            width: 90%;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            z-index: 10000;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }

        .progress-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #eee;
        }

        .progress-bar {
            width: 100%;
            height: 20px;
            background: #f0f0f0;
            border-radius: 10px;
            overflow: hidden;
            margin: 10px 0;
        }

        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #4CAF50, #45a049);
            transition: width 0.3s ease;
        }

        .progress-text {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
            font-size: 14px;
        }

        .results-summary {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin: 15px 0;
            font-size: 14px;
        }

        .result-excellent { color: #27ae60; }
        .result-good { color: #3498db; }
        .result-medium { color: #f39c12; }
        .result-bad { color: #e74c3c; }
        .result-error { color: #e74c3c; font-weight: bold; }

        .analysis-log {
            max-height: 300px;
            overflow-y: auto;
            border: 1px solid #eee;
            border-radius: 5px;
            padding: 10px;
            margin-top: 15px;
            font-size: 13px;
        }

        .log-entry {
            padding: 5px 0;
            border-bottom: 1px solid #f5f5f5;
        }

        .log-excellent { color: #27ae60; }
        .log-good { color: #3498db; }
        .log-medium { color: #f39c12; }
        .log-bad { color: #e74c3c; }
        .log-error { color: #e74c3c; font-weight: bold; }
        .log-not-found { color: #95a5a6; font-style: italic; }
        .log-api-limit { color: #e67e22; font-weight: bold; }
        .log-timeout { color: #d35400; }
        .log-info { color: #7f8c8d; }
        .log-success { color: #27ae60; font-weight: bold; }
        .log-warning { color: #f39c12; }

        .btn-secondary {
            background: #e74c3c;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
        }

        .btn-secondary:hover {
            background: #c0392b;
        }
    `;
    
    const styleElement = document.createElement('style');
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
}
