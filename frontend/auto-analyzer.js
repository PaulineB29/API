// =============================================================================
// AUTO-ANALYZER.js - Analyse Automatique Complète
// =============================================================================

// Variables globales pour l'analyse automatique
let analysisQueue = [];
let currentAnalysisIndex = 0;
let analysisResults = [];
let isAnalyzing = false;

// Configuration haute performance
const PERFORMANCE_CONFIG = {
    BATCH_SIZE: 12,              // ~300 appels/minute (12 * 25 = 300)
    DELAY_BETWEEN_BATCHES: 2400, // 2.4s entre les lots
    REQUEST_TIMEOUT: 10000,      // 10s max par requête
    MAX_CONCURRENT_REQUESTS: 8   // Limite de requêtes simultanées
};


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

    // OPTIMISATION: Traitement par lots de 10 entreprises
    const batchSize = 10; // Ajustable selon les performances
    await processBatch(analysisQueue, batchSize);
    
    finishAutoAnalysis();
}

// =============================================================================
// TRAITEMENT PAR LOTS OPTIMISÉ
//=============================================================================

async function processBatchOptimized(companies, batchSize = 10) {
    console.log(`⚡ Démarrage traitement par lots (${batchSize} entreprises/lot)`);
    
    for (let i = 0; i < companies.length && isAnalyzing; i += batchSize) {
        const batch = companies.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(companies.length / batchSize);
        
        console.log(`📦 Lot ${batchNumber}/${totalBatches} (${batch.length} entreprises)`);
        
        // Traiter le lot en parallèle avec limite de concurrence
        const batchPromises = batch.map(company => 
            analyzeSingleCompanyOptimized(company.symbol, company.companyName || company.name)
                .catch(error => ({
                    symbol: company.symbol,
                    error: true,
                    errorMessage: error.message,
                    date: new Date().toISOString()
                }))
        );
        
        // Attendre que tout le lot soit traité
        const batchResults = await Promise.allSettled(batchPromises);
        
        // Traiter les résultats du lot
        batchResults.forEach(result => {
            if (result.status === 'fulfilled' && result.value) {
                analysisResults.push(result.value);
            }
        });
        
        // Mettre à jour la progression
        currentAnalysisIndex += batch.length;
        updateProgressUI(batch[0], (currentAnalysisIndex / companies.length) * 100);
        updateResultsCounters();
        
        // Délai entre les lots pour respecter les limites API
        if (i + batchSize < companies.length) {
            await new Promise(resolve => setTimeout(resolve, PERFORMANCE_CONFIG.DELAY_BETWEEN_BATCHES));
        }
    }
}

// =============================================================================
// ANALYSE OPTIMISÉE D'UNE ENTREPRISE
// =============================================================================

async function analyzeSingleCompanyOptimized(symbol, companyName) {
    addToAnalysisLog(symbol, `🔍 Début analyse...`, 'info');

    try {
        // REQUÊTES PARALLÈLES AVEC TIMEOUT
        const endpoints = [
            `/profile?symbol=${symbol}`,
            `/quote?symbol=${symbol}`, 
            `/cash-flow-statement?symbol=${symbol}`,
            `/income-statement?symbol=${symbol}`,
            `/balance-sheet-statement?symbol=${symbol}`
        ];

        const fetchPromises = endpoints.map(endpoint => 
            fetchWithErrorHandlingOptimized(endpoint, 'données')
        );

        const [profile, quote, cashFlow, incomeStatement, balanceSheet] = await Promise.all(fetchPromises);

        // VÉRIFICATION RAPIDE DES DONNÉES
        if (!profile || !profile[0] || !quote || !quote[0]) {
            throw new Error('Données de base manquantes');
        }

        const companyData = {
            profile: profile[0],
            quote: quote[0],
            cashFlow: cashFlow?.[0],
            incomeStatement: incomeStatement?.[0],
            balanceSheet: balanceSheet?.[0]
        };

        if (!companyData.profile.companyName || !companyData.quote.price) {
            throw new Error('Données entreprise incomplètes');
        }

        // CALCUL ASYNCHRONE DES MÉTRIQUES
        const metrics = await calculateMetricsInWorker(companyData);
        
        // Vérifier si on a suffisamment de métriques valides
        const validMetricsCount = Object.values(metrics).filter(val => val !== null && val !== undefined).length;
        if (validMetricsCount < 10) {
            throw new Error('Données financières insuffisantes');
        }

        // CALCUL DU SCORE ET RECOMMANDATION
        const scores = calculateScoresAuto(metrics);
        const totalScore = scores.excellent * 3 + scores.good * 2 + scores.medium;
        const maxScore = (scores.excellent + scores.good + scores.medium + scores.bad) * 3;
        const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

        const recommendation = percentage >= 75 ? 'EXCELLENT' :
                              percentage >= 60 ? 'BON' :
                              percentage >= 45 ? 'MOYEN' : 'FAIBLE';

        const result = {
            symbol,
            companyName,
            metrics,
            recommendation,
            score: percentage,
            date: new Date().toISOString(),
            success: true,
            saved: false
        };

        // SAUVEGARDE ASYNCHRONE (ne pas attendre)
        sauvegarderAnalyseAutomatique(metrics, recommendation, companyData)
            .then(saved => {
                if (saved) {
                    result.saved = true;
                    addToAnalysisLog(symbol, `💾 Sauvegarde OK`, 'success');
                }
            })
            .catch(error => {
                console.error(`❌ Erreur sauvegarde ${symbol}:`, error);
            });

        // Afficher le résultat immédiatement
        const logClass = getRecommendationClass(recommendation);
        addToAnalysisLog(symbol, `${recommendation} (${percentage.toFixed(0)}%)`, logClass);

        return result;

    } catch (error) {
        addToAnalysisLog(symbol, `❌ ${error.message}`, 'error');
        throw error;
    }
}

// =============================================================================
// FONCTIONS DE REQUÊTES OPTIMISÉES
// =============================================================================

async function fetchWithErrorHandlingOptimized(endpoint, dataType) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PERFORMANCE_CONFIG.REQUEST_TIMEOUT);

    try {
        const separator = endpoint.includes('?') ? '&' : '?';
        const url = `${BASE_URL}${endpoint}${separator}apikey=${API_KEY}`;
        
        const response = await fetch(url, { 
            signal: controller.signal 
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (Array.isArray(data) && data.length === 0) {
            throw new Error('Aucune donnée disponible');
        }
        
        return data;
    } catch (error) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
            throw new Error(`Timeout ${dataType}`);
        }
        throw error;
    }
}

// =============================================================================
// CALCUL ASYNCHRONE DES MÉTRIQUES
// =============================================================================

function calculateMetricsInWorker(companyData) {
    return new Promise((resolve) => {
        // Utiliser setTimeout pour libérer le thread principal
        setTimeout(() => {
            try {
                const metrics = calculateCompanyMetricsSafe(companyData);
                resolve(metrics);
            } catch (error) {
                console.error('Erreur calcul métriques:', error);
                resolve({});
            }
        }, 0);
    });
}
    
// =============================================================================
// FONCTIONS DE CALCUL COMPLÈTES
// =============================================================================

/**
 * Calcule tous les ratios financiers pour l'analyse automatique
 */
function calculateAllFinancialRatios(companyData) {
    const { profile, quote, balanceSheet, incomeStatement, cashFlow } = companyData;
    
    // Vérification des données nécessaires
    if (!balanceSheet || !incomeStatement || !cashFlow) {
        console.error('Données financières manquantes pour les calculs');
        return null;
    }

    return {
        // === PROFITABILITÉ ===
        ...calculateProfitabilityRatios(incomeStatement, balanceSheet),
        
        // === SÉCURITÉ FINANCIÈRE ===
        ...calculateSafetyRatios(balanceSheet, incomeStatement),
        
        // === VALORISATION ===
        ...calculateValuationRatios(profile, quote, incomeStatement, cashFlow, balanceSheet),
        
        // === CROISSANCE ===
        ...calculateGrowthRatios(incomeStatement, cashFlow),
        
        // === EFFICACITÉ ===
        ...calculateEfficiencyRatios(incomeStatement, balanceSheet),
        
        // === CALCULS SPÉCIFIQUES EXISTANTS ===
        ...calculateSpecificRatios(companyData)
    };
}

/**
 * Calcule les ratios de profitabilité
 */
function calculateProfitabilityRatios(incomeStatement, balanceSheet) {
    const revenue = incomeStatement.revenue || 0;
    const netIncome = incomeStatement.netIncome || 0;
    const grossProfit = incomeStatement.grossProfit || 0;
    const operatingIncome = incomeStatement.operatingIncome || 0;
    const totalEquity = balanceSheet.totalStockholdersEquity || 1;
    const totalAssets = balanceSheet.totalAssets || 1;
    const sgaExpenses = incomeStatement.sellingGeneralAndAdministrativeExpenses || 0;
    
    // ROE (Return on Equity)
    const roe = (netIncome / totalEquity) * 100;
    
    // ROA (Return on Assets)
    const roa = (netIncome / totalAssets) * 100;
    
    // Marge Nette
    const netMargin = revenue !== 0 ? (netIncome / revenue) * 100 : 0;
    
    // Marge Brute
    const grossMargin = revenue !== 0 ? (grossProfit / revenue) * 100 : 0;
    
    // Marge Opérationnelle (EBIT Margin)
    const operatingMargin = revenue !== 0 ? (operatingIncome / revenue) * 100 : 0;
    
    // Marge SG&A
    const sgaMargin = revenue !== 0 ? (sgaExpenses / revenue) * 100 : 0;
    
    // ROIC (Return on Invested Capital)
    const taxRate = incomeStatement.incomeBeforeTax ? 
        (Math.abs(incomeStatement.incomeTaxExpense) / Math.abs(incomeStatement.incomeBeforeTax)) || 0.25 : 0.25;
    const nopat = operatingIncome * (1 - taxRate);
    const investedCapital = (balanceSheet.totalDebt || 0) + totalEquity;
    const roic = investedCapital !== 0 ? (nopat / investedCapital) * 100 : 0;

    return {
        roe,
        roa,
        netMargin,
        grossMargin,
        operatingMargin,
        sgaMargin,
        roic
    };
}

/**
 * Calcule les ratios de sécurité financière
 */
function calculateSafetyRatios(balanceSheet, incomeStatement) {
    const currentAssets = balanceSheet.totalCurrentAssets || 0;
    const currentLiabilities = balanceSheet.totalCurrentLiabilities || 1;
    const totalDebt = balanceSheet.totalDebt || 0;
    const totalEquity = balanceSheet.totalStockholdersEquity || 1;
    const operatingIncome = incomeStatement.operatingIncome || 0;
    const interestExpense = Math.abs(incomeStatement.interestExpense || 1);
    const cash = balanceSheet.cashAndCashEquivalents || 0;
    
    // Current Ratio
    const currentRatio = currentAssets / currentLiabilities;
    
    // Quick Ratio (plus conservateur)
    const inventory = balanceSheet.inventory || 0;
    const quickRatio = (currentAssets - inventory) / currentLiabilities;
    
    // Debt to Equity
    const debtToEquity = totalDebt / totalEquity;
    
    // Debt to Assets
    const totalAssets = balanceSheet.totalAssets || 1;
    const debtToAssets = totalDebt / totalAssets;
    
    // Interest Coverage
    const interestCoverage = operatingIncome / interestExpense;
    
    // Cash Ratio
    const cashRatio = cash / currentLiabilities;

    return {
        currentRatio,
        quickRatio,
        debtToEquity,
        debtToAssets,
        interestCoverage,
        cashRatio
    };
}

/**
 * Calcule les ratios de valorisation
 */
function calculateValuationRatios(profile, quote, incomeStatement, cashFlow, balanceSheet) {
    const price = quote.price || 1;
    const marketCap = quote.marketCap || 1;
    const eps = incomeStatement.eps || incomeStatement.epsDiluted || 1;
    const sharesOutstanding = incomeStatement.weightedAverageShsOut || incomeStatement.weightedAverageShsOutDil || 1;
    const bookValuePerShare = (balanceSheet.totalStockholdersEquity || 0) / sharesOutstanding;
    const freeCashFlow = cashFlow.freeCashFlow || 1;
    const ebitda = incomeStatement.ebitda || 1;
    const priceAvg200 = quote.priceAvg200 || price;
    
    // P/E Ratio
    const peRatio = price / eps;
    
    // Price to Book
    const pbRatio = bookValuePerShare !== 0 ? price / bookValuePerShare : 0;
    
    // Price to Sales
    const revenue = incomeStatement.revenue || 1;
    const priceToSales = marketCap / revenue;
    
    // Price to Free Cash Flow
    const priceToFCF = marketCap / freeCashFlow;
    
    // EV/EBITDA
    const enterpriseValue = marketCap + (balanceSheet.totalDebt || 0) - (balanceSheet.cashAndCashEquivalents || 0);
    const evToEbitda = enterpriseValue / ebitda;
    
    // Earnings Yield
    const earningsYield = (eps / price) * 100;
    
    // Dividend Yield
    const dividendPerShare = profile.lastDividend || 0;
    const dividendYield = (dividendPerShare / price) * 100;
    
    // PEG Ratio (estimation)
    const growthRate = 15; // Taux de croissance estimé à 15% par défaut
    const pegRatio = peRatio / growthRate;
    
    // Price vs MM200
    const priceToMM200 = ((price - priceAvg200) / priceAvg200) * 100;

    return {
        peRatio,
        pbRatio,
        priceToSales,
        priceToFCF,
        evToEbitda,
        earningsYield,
        dividendYield,
        pegRatio,
        priceToMM200
    };
}

/**
 * Calcule les ratios de croissance (simplifiés pour analyse auto)
 */
function calculateGrowthRatios(incomeStatement, cashFlow) {
    // Ces calculs nécessitent des données historiques
    // Pour l'instant, on retourne des valeurs par défaut
    const revenueGrowth = 0;
    const earningsGrowth = 0;
    const fcfGrowth = 0;
    
    return {
        revenueGrowth,
        earningsGrowth,
        fcfGrowth
    };
}

/**
 * Calcule les ratios d'efficacité
 */
function calculateEfficiencyRatios(incomeStatement, balanceSheet) {
    const revenue = incomeStatement.revenue || 1;
    const totalAssets = balanceSheet.totalAssets || 1;
    const inventory = balanceSheet.inventory || 0;
    const accountsReceivable = balanceSheet.netReceivables || 0;
    const cogs = incomeStatement.costOfRevenue || 0;
    
    // Asset Turnover
    const assetTurnover = revenue / totalAssets;
    
    // Inventory Turnover
    const inventoryTurnover = inventory !== 0 ? cogs / inventory : 0;
    
    // Receivables Turnover
    const receivablesTurnover = accountsReceivable !== 0 ? revenue / accountsReceivable : 0;
    
    return {
        assetTurnover,
        inventoryTurnover,
        receivablesTurnover
    };
}

/**
 * Calcule les ratios spécifiques de votre application
 */
function calculateSpecificRatios(companyData) {
    const { profile, quote, balanceSheet, incomeStatement, cashFlow } = companyData;
    
    // Free Cash Flow (déjà calculé mais on le récupère)
    const freeCashFlow = cashFlow.freeCashFlow || 0;
    
    // Net Cash
    const netCash = (balanceSheet.cashAndCashEquivalents || 0) - (balanceSheet.totalDebt || 0);
    
    return {
        freeCashFlow,
        netCash
    };
}

/**
 * Fonction principale de calcul des métriques avec gestion d'erreurs
 */
    function filterCompaniesBeforeAnalysis(companies) {
    return companies.filter(company => {
        if (!company.symbol || company.symbol.length === 0) return false;
        if (/^[0-9]/.test(company.symbol)) return false;
        if (company.symbol.length < 2 || company.symbol.length > 6) return false;
        if (!/^[A-Z]+$/.test(company.symbol)) return false;
        return true;
    });
}
    
function calculateCompanyMetricsSafe(companyData) {
    try {
        const allRatios = calculateAllFinancialRatios(companyData);
        
        if (!allRatios) {
            throw new Error('Impossible de calculer les ratios');
        }
        
        // Nettoyer les métriques invalides
        Object.keys(allRatios).forEach(key => {
            if (allRatios[key] === null || 
                !isFinite(allRatios[key]) || 
                Math.abs(allRatios[key]) > 1000000) {
                allRatios[key] = null;
            }
        });
        
        return allRatios;
        
    } catch (error) {
        console.error('Erreur dans calculateCompanyMetricsSafe:', error);
        
        // Retourner un objet avec des valeurs nulles en cas d'erreur
        const emptyMetrics = {};
        const metricKeys = [
            'roe', 'roa', 'netMargin', 'grossMargin', 'operatingMargin', 'sgaMargin', 'roic',
            'currentRatio', 'quickRatio', 'debtToEquity', 'debtToAssets', 'interestCoverage', 'cashRatio',
            'peRatio', 'pbRatio', 'priceToSales', 'priceToFCF', 'evToEbitda', 'earningsYield', 
            'dividendYield', 'pegRatio', 'priceToMM200',
            'assetTurnover', 'inventoryTurnover', 'receivablesTurnover',
            'freeCashFlow', 'netCash'
        ];
        
        metricKeys.forEach(key => {
            emptyMetrics[key] = null;
        });
        
        return emptyMetrics;
    }
}
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

// DÉLÉGUER LES CALCULS LOURDS
function calculateMetricsInWorker(companyData) {
    return new Promise((resolve) => {
        // Utiliser setTimeout pour libérer le thread principal
        setTimeout(() => {
            try {
                const metrics = calculateCompanyMetricsSafe(companyData);
                resolve(metrics);
            } catch (error) {
                resolve(null);
            }
        }, 0);
    });
}

async function analyzeSingleCompany(symbol, companyName) {
    addToAnalysisLog(symbol, `🔍 Analyse en cours...`, 'info');

    try {
        // Timeout global de 20 secondes au lieu de 30
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout - Analyse trop longue')), 20000);
        });

        // OPTIMISATION: Toutes les requêtes en parallèle
        const fetchPromise = Promise.all([
            fetchWithErrorHandling(`/profile?symbol=${symbol}`, 'profil'),
            fetchWithErrorHandling(`/quote?symbol=${symbol}`, 'cotation'),
            fetchWithErrorHandling(`/cash-flow-statement?symbol=${symbol}`, 'cash flow'),
            fetchWithErrorHandling(`/income-statement?symbol=${symbol}`, 'compte de résultat'),
            fetchWithErrorHandling(`/balance-sheet-statement?symbol=${symbol}`, 'bilan')
        ]);

        const [profile, quote, cashFlow, incomeStatement, balanceSheet] = 
            await Promise.race([fetchPromise, timeoutPromise]);

         const companyData = { profile, quote, cashFlow, incomeStatement, balanceSheet };
        
        // OPTIMISATION: Calcul asynchrone des métriques
        const metrics = await calculateMetricsInWorker(companyData);
        
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
            success: true,
            saved: false 
        };

        analysisResults.push(result);

        // SAUVEGARDE AUTOMATIQUE
        const saved = await sauvegarderAnalyseAutomatique(metrics, recommendation, companyData);
        if (saved) {
            result.saved = true; // ⭐ MARQUER COMME SAUVEGARDÉ
            addToAnalysisLog(symbol, `💾 Données sauvegardées`, 'success');
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

// NOUVELLE FONCTION POUR TRAITEMENT PAR LOTS
async function processBatch(batchCompanies, batchSize = 10) {
    const results = [];
    
    for (let i = 0; i < batchCompanies.length; i += batchSize) {
        const batch = batchCompanies.slice(i, i + batchSize);
        
        // Traiter le lot en parallèle
        const batchPromises = batch.map(company => 
            analyzeSingleCompany(company.symbol, company.companyName || company.name)
                .catch(error => ({
                    symbol: company.symbol,
                    error: true,
                    errorMessage: error.message
                }))
        );
        
        const batchResults = await Promise.allSettled(batchPromises);
        results.push(...batchResults);
        
        // Mettre à jour l'UI après chaque lot
        currentAnalysisIndex += batch.length;
        updateProgressUI(batch[0], (currentAnalysisIndex / analysisQueue.length) * 100);
        
        // Petit délai entre les lots pour éviter le rate limiting
        if (i + batchSize < batchCompanies.length) {
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }
    
    return results;
}

// =============================================================================
// SAUVEGARDE COMPLÈTE POUR LES 3 TABLES
// =============================================================================

async function sauvegarderAnalyseAutomatique(metrics, recommendation, companyData) {
    try {
        const symbol = companyData.profile.symbol;
        console.log(`💾 Sauvegarde COMPLÈTE de ${symbol}...`);

        const datePublication = companyData.incomeStatement?.date || 
                               new Date().toISOString().split('T')[0];

        // CALCUL DU SCORE GLOBAL
        const scores = calculateScoresAuto(metrics);
        const totalScore = scores.excellent * 3 + scores.good * 2 + scores.medium;
        const maxScore = (scores.excellent + scores.good + scores.medium + scores.bad) * 3;
        const scoreGlobal = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

        // CALCUL NET CASH
        const netCash = (companyData.balanceSheet?.cashAndCashEquivalents || 0) - 
                       (companyData.balanceSheet?.totalDebt || 0);

        // ============================================
        // 1. CRÉATION ENTREPRISE
        // ============================================
        console.log('🏢 Création entreprise...');
        try {
            const responseEntreprise = await fetch('https://api-u54u.onrender.com/api/analyses/entreprise', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    symbol: symbol,
                    nom: companyData.profile.companyName,
                    secteur: companyData.profile.sector || 'Non spécifié',
                    industrie: companyData.profile.industry || 'Non spécifié'
                })
            });

            if (!responseEntreprise.ok) {
                const errorText = await responseEntreprise.text();
                throw new Error(`Erreur entreprise: HTTP ${responseEntreprise.status}: ${errorText}`);
            }

            const resultEntreprise = await responseEntreprise.json();
            console.log('✅ Entreprise créée/mise à jour:', resultEntreprise.entreprise);
            
        } catch (error) {
            console.log('⚠️ Endpoint entreprise non disponible, continuation...', error.message);
        }

        // ============================================
        // 2. DONNÉES POUR ANALYSES_BUFFETT
        // ============================================
        const analyseData = {
            // Identifiants et dates
            symbol: symbol,
            date_analyse: new Date().toISOString().split('T')[0],
            periode: 'FY',
            date_publication: datePublication,
            score_global: scoreGlobal,
            recommandation: recommendation,
            
             // === TOUS LES RATIOS CALCULÉS ===
            // Profitabilité
            roe: metrics.roe,
            roa: metrics.roa,
            netMargin: metrics.netMargin,
            grossMargin: metrics.grossMargin,
            operatingMargin: metrics.operatingMargin,
            sgaMargin: metrics.sgaMargin,
            roic: metrics.roic,
            
            // Sécurité
            debtToEquity: metrics.debtToEquity,
            debtToAssets: metrics.debtToAssets,
            currentRatio: metrics.currentRatio,
            quickRatio: metrics.quickRatio,
            cashRatio: metrics.cashRatio,
            interestCoverage: metrics.interestCoverage,
            
            // Valuation
            peRatio: metrics.peRatio,
            pbRatio: metrics.pbRatio,
            priceToSales: metrics.priceToSales,
            priceToFCF: metrics.priceToFCF,
            evToEbitda: metrics.evToEbitda,
            earningsYield: metrics.earningsYield,
            dividendYield: metrics.dividendYield,
            pegRatio: metrics.pegRatio,
            priceToMM200: metrics.priceToMM200,
            
            // Efficacité
            assetTurnover: metrics.assetTurnover,
            inventoryTurnover: metrics.inventoryTurnover,
            receivablesTurnover: metrics.receivablesTurnover,
            
            // Autres métriques
            freeCashFlow: metrics.freeCashFlow,
            netCash: metrics.netCash,
                        
            // Recommandation et analyse
            points_forts: getStrengthsAuto(metrics).join('; '),
            points_faibles: getWeaknessesAuto(metrics).join('; ')
        };

        // ============================================
        // 3. DONNÉES POUR DONNEES_FINANCIERES
        // ============================================
        const donneesData = {
            symbol: symbol,
            date_import: new Date().toISOString().split('T')[0],
            
            // Données de prix et market cap (noms anglais comme backend)
            currentPrice: companyData.quote.price,
            movingAverage200: companyData.quote.priceAvg200,
            dividendPerShare: companyData.profile.lastDividend,
            marketCap: companyData.quote.marketCap,

            // Données de bilan
            cashEquivalents: companyData.balanceSheet?.cashAndCashEquivalents,
            currentAssets: companyData.balanceSheet?.totalCurrentAssets,
            currentLiabilities: companyData.balanceSheet?.totalCurrentLiabilities,
            totalDebt: companyData.balanceSheet?.totalDebt,
            shareholdersEquity: companyData.balanceSheet?.totalStockholdersEquity,
            netCash: netCash,

            // Données de compte de résultat
            revenue: companyData.incomeStatement?.revenue,
            ebit: companyData.incomeStatement?.operatingIncome,
            ebitda: companyData.incomeStatement?.ebitda,
            netIncome: companyData.incomeStatement?.netIncome,
            eps: companyData.incomeStatement?.eps,
            interestExpense: Math.abs(companyData.incomeStatement?.interestExpense || 0),

            // Données de cash flow
            operatingCashFlow: companyData.cashFlow?.operatingCashFlow,
            freeCashFlow: companyData.cashFlow?.freeCashFlow
        };

        // ============================================
        // VÉRIFICATION DES DONNÉES
        // ============================================
        console.log(`📤 Envoi des données pour ${symbol}...`);
        
        console.log('🔍 Données analyse Buffett:', {
            symbol: analyseData.symbol,
            metriques: Object.keys(metrics).length,
            recommendation: analyseData.recommandation,
            score_global: analyseData.score_global
        });

        console.log('📊 Données financières brutes:', {
            prix: donneesData.currentPrice,
            revenue: donneesData.revenue,
            benefice: donneesData.netIncome,
            cash_flow: donneesData.freeCashFlow,
            market_cap: donneesData.marketCap
        });

        // ============================================
        // 4. ENVOI DES DONNÉES ANALYSE ET FINANCIÈRES
        // ============================================

        // A. Sauvegarder l'analyse Buffett
        console.log('💾 Envoi analyse Buffett...');
        const responseAnalyse = await fetch('https://api-u54u.onrender.com/api/analyses', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(analyseData)
        });

        if (!responseAnalyse.ok) {
            const errorText = await responseAnalyse.text();
            throw new Error(`Erreur analyse: HTTP ${responseAnalyse.status}: ${errorText}`);
        }

        const resultAnalyse = await responseAnalyse.json();
        console.log('✅ Analyse Buffett sauvegardée:', resultAnalyse.id);

        // B. Sauvegarder les données financières
        console.log('📊 Envoi données financières...');
        const responseDonnees = await fetch('https://api-u54u.onrender.com/api/analyses/donnees-financieres', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(donneesData)
        });

        if (!responseDonnees.ok) {
            const errorText = await responseDonnees.text();
            throw new Error(`Erreur données financières: HTTP ${responseDonnees.status}: ${errorText}`);
        }

        const resultDonnees = await responseDonnees.json();
        console.log('✅ Données financières sauvegardées:', resultDonnees.id);

        // SUCCÈS COMPLET
        addToAnalysisLog(symbol, `💾 Sauvegardé (Analyse: ${resultAnalyse.id}, Données: ${resultDonnees.id})`, 'success');
        return true;

    } catch (error) {
        console.error(`❌ Erreur sauvegarde ${companyData.profile.symbol}:`, error);
        addToAnalysisLog(companyData.profile.symbol, `❌ ${error.message}`, 'error');
        return false;
    }
}

// =============================================================================
// FONCTIONS GETSTRENGTHS/WEAKNESSES MISE À JOUR
// =============================================================================

function getStrengthsAuto(metrics) {
    const strengths = [];
    
    // Profitabilité
    if (metrics.roe > 20) strengths.push('ROE exceptionnel (>20%)');
    if (metrics.roa > 10) strengths.push('ROA excellent (>10%)');
    if (metrics.netMargin > 20) strengths.push('Forte marge nette (>20%)');
    if (metrics.grossMargin > 50) strengths.push('Marge brute excellente (>50%)');
    if (metrics.operatingMargin > 20) strengths.push('Forte marge opérationnelle (>20%)');
    if (metrics.roic > 15) strengths.push('ROIC excellent (>15%)');
    if (metrics.sgaMargin < 10) strengths.push('Faibles frais généraux (<10%)');
    
    // Sécurité
    if (metrics.debtToEquity < 0.3) strengths.push('Faible endettement (<0.3)');
    if (metrics.debtToAssets < 0.2) strengths.push('Faible dette vs actifs (<0.2)');
    if (metrics.currentRatio > 2.0) strengths.push('Bonne liquidité (>2.0)');
    if (metrics.quickRatio > 1.5) strengths.push('Liquidité rapide excellente (>1.5)');
    if (metrics.interestCoverage > 10) strengths.push('Excellente couverture des intérêts (>10x)');
    if (metrics.cashRatio > 0.5) strengths.push('Fort ratio de trésorerie (>0.5)');
    
    // Valuation
    if (metrics.peRatio < 10) strengths.push('P/E ratio attractif (<10)');
    if (metrics.pbRatio < 1.5) strengths.push('Price/Book attractif (<1.5)');
    if (metrics.priceToSales < 1) strengths.push('Price/Sales très attractif (<1)');
    if (metrics.earningsYield > 10) strengths.push('Rendement des bénéfices élevé (>10%)');
    if (metrics.priceToFCF < 10) strengths.push('Price/FCF attractif (<10)');
    if (metrics.dividendYield > 4) strengths.push('Dividende attractif (>4%)');
    if (metrics.evToEbitda < 8) strengths.push('EV/EBITDA attractif (<8)');
    if (metrics.pegRatio < 0.8) strengths.push('PEG ratio très attractif (<0.8)');
    if (metrics.priceToMM200 > 5) strengths.push('Tendance haussière vs MM200 (>5%)');
    
    // Efficacité
    if (metrics.assetTurnover > 1.0) strengths.push('Rotation des actifs efficace (>1.0)');
    if (metrics.inventoryTurnover > 8) strengths.push('Rotation des stocks efficace (>8)');
    if (metrics.receivablesTurnover > 10) strengths.push('Gestion des créances efficace (>10)');
    
    return strengths.length > 0 ? strengths : ['Aucun point fort significatif'];
}

function getWeaknessesAuto(metrics) {
    const weaknesses = [];
    
    // Profitabilité
    if (metrics.roe < 10 && metrics.roe !== null) weaknesses.push('ROE faible (<10%)');
    if (metrics.roa < 5 && metrics.roa !== null) weaknesses.push('ROA faible (<5%)');
    if (metrics.netMargin < 10 && metrics.netMargin !== null) weaknesses.push('Marge nette faible (<10%)');
    if (metrics.grossMargin < 30 && metrics.grossMargin !== null) weaknesses.push('Marge brute faible (<30%)');
    if (metrics.operatingMargin < 10 && metrics.operatingMargin !== null) weaknesses.push('Marge opérationnelle faible (<10%)');
    if (metrics.roic < 8 && metrics.roic !== null) weaknesses.push('ROIC faible (<8%)');
    if (metrics.sgaMargin > 30) weaknesses.push('Frais généraux élevés (>30%)');
    
    // Sécurité
    if (metrics.debtToEquity > 1.0) weaknesses.push('Dette élevée (>1.0)');
    if (metrics.debtToAssets > 0.6) weaknesses.push('Dette importante vs actifs (>0.6)');
    if (metrics.currentRatio < 1.0) weaknesses.push('Problème de liquidité (<1.0)');
    if (metrics.quickRatio < 0.5) weaknesses.push('Liquidité rapide faible (<0.5)');
    if (metrics.interestCoverage < 3 && metrics.interestCoverage !== null) weaknesses.push('Couverture des intérêts faible (<3x)');
    if (metrics.cashRatio < 0.1) weaknesses.push('Trésorerie insuffisante (<0.1)');
    
    // Valuation
    if (metrics.peRatio > 25) weaknesses.push('P/E ratio élevé (>25)');
    if (metrics.pbRatio > 5) weaknesses.push('Price/Book élevé (>5)');
    if (metrics.priceToSales > 5) weaknesses.push('Price/Sales élevé (>5)');
    if (metrics.earningsYield < 4 && metrics.earningsYield !== null) weaknesses.push('Rendement des bénéfices faible (<4%)');
    if (metrics.priceToFCF > 20) weaknesses.push('Price/FCF élevé (>20)');
    if (metrics.dividendYield < 2 && metrics.dividendYield !== null) weaknesses.push('Dividende faible (<2%)');
    if (metrics.evToEbitda > 15) weaknesses.push('EV/EBITDA élevé (>15)');
    if (metrics.pegRatio > 1.2) weaknesses.push('PEG ratio élevé (>1.2)');
    if (metrics.priceToMM200 < -5) weaknesses.push('Tendance baissière vs MM200 (<-5%)');
    
    // Efficacité
    if (metrics.assetTurnover < 0.5 && metrics.assetTurnover !== null) weaknesses.push('Rotation des actifs faible (<0.5)');
    if (metrics.inventoryTurnover < 3 && metrics.inventoryTurnover !== null) weaknesses.push('Rotation des stocks lente (<3)');
    if (metrics.receivablesTurnover < 4 && metrics.receivablesTurnover !== null) weaknesses.push('Gestion des créances lente (<4)');
    
    return weaknesses.length > 0 ? weaknesses : ['Aucun point faible significatif'];
}

// CALCUL DES SCORES DÉTAILLÉ
function calculateScoresAuto(metrics) {
    const scores = { excellent: 0, good: 0, medium: 0, bad: 0 };
    
    // Liste complète des métriques à évaluer avec tous les nouveaux ratios
    const metricThresholds = [
        // Profitabilité
        { key: 'roe', excellent: 20, good: 15, medium: 10, reverse: false },
        { key: 'roa', excellent: 10, good: 7, medium: 5, reverse: false },
        { key: 'netMargin', excellent: 20, good: 15, medium: 10, reverse: false },
        { key: 'grossMargin', excellent: 50, good: 40, medium: 30, reverse: false },
        { key: 'operatingMargin', excellent: 20, good: 15, medium: 10, reverse: false },
        { key: 'sgaMargin', excellent: 10, good: 20, medium: 30, reverse: true },
        { key: 'roic', excellent: 15, good: 10, medium: 8, reverse: false },
        
        // Sécurité financière
        { key: 'debtToEquity', excellent: 0.3, good: 0.5, medium: 1.0, reverse: true },
        { key: 'debtToAssets', excellent: 0.2, good: 0.4, medium: 0.6, reverse: true },
        { key: 'currentRatio', excellent: 2.0, good: 1.5, medium: 1.0, reverse: false },
        { key: 'quickRatio', excellent: 1.5, good: 1.0, medium: 0.5, reverse: false },
        { key: 'cashRatio', excellent: 0.5, good: 0.3, medium: 0.1, reverse: false },
        { key: 'interestCoverage', excellent: 10, good: 5, medium: 3, reverse: false },
        
        // Valorisation
        { key: 'peRatio', excellent: 10, good: 15, medium: 25, reverse: true },
        { key: 'pbRatio', excellent: 1.5, good: 3, medium: 5, reverse: true },
        { key: 'priceToSales', excellent: 1, good: 3, medium: 5, reverse: true },
        { key: 'priceToFCF', excellent: 10, good: 15, medium: 20, reverse: true },
        { key: 'evToEbitda', excellent: 8, good: 12, medium: 15, reverse: true },
        { key: 'earningsYield', excellent: 10, good: 6, medium: 4, reverse: false },
        { key: 'dividendYield', excellent: 4, good: 2, medium: 1, reverse: false },
        { key: 'pegRatio', excellent: 0.8, good: 1.0, medium: 1.2, reverse: true },
        { key: 'priceToMM200', excellent: 5, good: 0, medium: -5, reverse: false },
        
        // Efficacité
        { key: 'assetTurnover', excellent: 1.0, good: 0.7, medium: 0.5, reverse: false },
        { key: 'inventoryTurnover', excellent: 8, good: 5, medium: 3, reverse: false },
        { key: 'receivablesTurnover', excellent: 10, good: 6, medium: 4, reverse: false }
    ];
    
   metricThresholds.forEach(threshold => {
        const value = metrics[threshold.key];
        if (value !== null && value !== undefined && isFinite(value)) {
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



// =============================================================================
// INTERFACE UTILISATEUR
// =============================================================================

function createAnalysisProgressUI() {
    const progressHTML = `
        <div id="autoAnalysisProgress" class="auto-analysis-progress">
            <div class="progress-header">
                <h3>🔍 Analyse Automatique en Cours</h3>
                <div class="header-buttons">
                    <button id="saveDataBtn" class="btn-save" style="display: none;">
                        💾 Enregistrer les données
                    </button>
                    <button id="cancelAnalysis" class="btn-secondary">❌ Arrêter</button>
                </div>
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

    // Événements
    document.getElementById('cancelAnalysis').addEventListener('click', stopAutoAnalysis);
    document.getElementById('saveDataBtn').addEventListener('click', sauvegarderDonneesManuellement);
}
// =============================================================================
// SAUVEGARDE MANUELLE DES DONNÉES
// =============================================================================

async function sauvegarderDonneesManuellement() {
    const successResults = analysisResults.filter(r => r.success && !r.saved);
    
    if (successResults.length === 0) {
        alert('Aucune nouvelle analyse à sauvegarder');
        return;
    }

    if (!confirm(`Sauvegarder ${successResults.length} analyses en base de données ?`)) {
        return;
    }

    // Désactiver le bouton pendant la sauvegarde
    const saveBtn = document.getElementById('saveDataBtn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '⏳ Sauvegarde en cours...';
    saveBtn.style.opacity = '0.7';

    let savedCount = 0;
    let errorCount = 0;

    addToAnalysisLog('SAUVEGARDE', `💾 Début de la sauvegarde manuelle...`, 'info');

    for (const result of successResults) {
        try {
            const saved = await sauvegarderAnalyseManuelle(result);
            
            if (saved) {
                result.saved = true;
                savedCount++;
                addToAnalysisLog(result.symbol, `💾 Sauvegarde manuelle OK`, 'success');
            } else {
                errorCount++;
            }
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
        } catch (error) {
            console.error(`❌ Erreur sauvegarde manuelle ${result.symbol}:`, error);
            errorCount++;
            addToAnalysisLog(result.symbol, `❌ Erreur sauvegarde: ${error.message}`, 'error');
        }
    }

    // Réactiver le bouton
    saveBtn.disabled = false;
    saveBtn.innerHTML = '💾 Enregistrer les données';
    saveBtn.style.opacity = '1';

    // Résumé
    addToAnalysisLog('SAUVEGARDE', `✅ Sauvegarde terminée: ${savedCount} réussites, ${errorCount} échecs`, 'success');
    
    alert(`Sauvegarde manuelle terminée :\n✅ ${savedCount} analyses sauvegardées\n❌ ${errorCount} erreurs`);

    // Masquer le bouton si tout est sauvegardé
    if (savedCount > 0 && errorCount === 0) {
        saveBtn.style.display = 'none';
    }
}

// Version pour la sauvegarde manuelle
async function sauvegarderAnalyseManuelle(result) {
    try {
        const analyseData = {
            symbol: result.symbol,
            date_analyse: new Date().toISOString().split('T')[0],
            periode: 'FY',
            date_publication: new Date().toISOString().split('T')[0],
            recommandation: result.recommendation,
            
            // Métriques principales
            roe: result.metrics.roe,
            netMargin: result.metrics.netMargin,
            grossMargin: result.metrics.grossMargin,
            debtToEquity: result.metrics.debtToEquity,
            currentRatio: result.metrics.currentRatio,
            peRatio: result.metrics.peRatio,
            earningsYield: result.metrics.earningsYield,
            
            // Score
            score_global: result.score,
            
            // Entreprise
            entreprise_nom: result.companyName,
            entreprise_symbole: result.symbol
        };

        const response = await fetch('https://api-u54u.onrender.com/api/analyses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(analyseData)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const apiResult = await response.json();
        return apiResult.success;

    } catch (error) {
        console.error(`❌ Erreur sauvegarde manuelle ${result.symbol}:`, error);
        return false;
    }
}



// =============================================================================
// FONCTIONS D'INTERFACE UNIQUES 
// =============================================================================

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
    const unsavedResults = analysisResults.filter(r => r.success && !r.saved);
    
    const counts = {
        excellent: successResults.filter(r => r.recommendation === 'EXCELLENT').length,
        good: successResults.filter(r => r.recommendation === 'BON').length,
        medium: successResults.filter(r => r.recommendation === 'MOYEN').length,
        bad: successResults.filter(r => r.recommendation === 'FAIBLE').length,
        errors: errorResults.length,
        unsaved: unsavedResults.length
    };

    // Mettre à jour les compteurs
    ['countExcellent', 'countGood', 'countMedium', 'countBad', 'countErrors'].forEach(id => {
        const element = document.getElementById(id);
        if (element) element.textContent = counts[id.replace('count', '').toLowerCase()] || 0;
    });

    // Gérer le bouton de sauvegarde
    const saveBtn = document.getElementById('saveDataBtn');
    if (saveBtn) {
        if (counts.unsaved > 0) {
            saveBtn.style.display = 'block';
            saveBtn.innerHTML = `💾 Enregistrer (${counts.unsaved})`;
        } else {
            saveBtn.style.display = 'none';
        }
    }
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

    // Afficher le bouton de sauvegarde s'il y a des données non sauvegardées
    const unsavedCount = analysisResults.filter(r => r.success && !r.saved).length;
    if (unsavedCount > 0) {
        const saveBtn = document.getElementById('saveDataBtn');
        if (saveBtn) {
            saveBtn.style.display = 'block';
            saveBtn.innerHTML = `💾 Enregistrer ${unsavedCount} analyses`;
        }
    }

    // Résumé final
    const excellent = analysisResults.filter(r => r.recommendation === 'EXCELLENT').length;
    const good = analysisResults.filter(r => r.recommendation === 'BON').length;
    const medium = analysisResults.filter(r => r.recommendation === 'MOYEN').length;
    const bad = analysisResults.filter(r => r.recommendation === 'FAIBLE').length;
    const errors = analysisResults.filter(r => r.error).length;
    const unsaved = analysisResults.filter(r => r.success && !r.saved).length;

    setTimeout(() => {
        let message = `🎉 Analyse terminée !\n\n✅ Excellent: ${excellent}\n👍 Bon: ${good}\n⚠️ Moyen: ${medium}\n❌ Faible: ${bad}\n🚫 Erreurs: ${errors}`;
        
        if (unsaved > 0) {
            message += `\n\n💾 ${unsaved} analyses prêtes à être enregistrées\nCliquez sur "Enregistrer les données"`;
        }
        
        alert(message);
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

        .header-buttons {
            display: flex;
            gap: 10px;
            align-items: center;
        }

        .btn-save {
            background: #27ae60;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s ease;
        }

        .btn-save:hover {
            background: #219a52;
            transform: translateY(-1px);
        }

        .btn-save:disabled {
            background: #95a5a6;
            cursor: not-allowed;
            transform: none;
        }

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
    `;
    
    const styleElement = document.createElement('style');
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
}

// CONFIGURATION DES PERFORMANCES
const PERFORMANCE_CONFIG = {
    BATCH_SIZE: 10,              // Nombre de requêtes parallèles
    DELAY_BETWEEN_BATCHES: 200,  // Délai entre les lots (ms)
    REQUEST_TIMEOUT: 15000,      // Timeout par requête (15s)
    BATCH_TIMEOUT: 30000,        // Timeout par lot (30s)
    MAX_CONCURRENT_REQUESTS: 15  // Requêtes simultanées max
};

// FONCTION OPTIMISÉE POUR LES REQUÊTES
async function fetchWithErrorHandlingOptimized(endpoint, dataType) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PERFORMANCE_CONFIG.REQUEST_TIMEOUT);

    try {
        const separator = endpoint.includes('?') ? '&' : '?';
        const url = `${BASE_URL}${endpoint}${separator}apikey=${API_KEY}`;
        
        const response = await fetch(url, { 
            signal: controller.signal 
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (Array.isArray(data) && data.length === 0) {
            throw new Error('Aucune donnée disponible');
        }
        
        return data;
    } catch (error) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
            throw new Error(`Timeout ${dataType}`);
        }
        throw error;
    }
}

// CACHE MEMORY SIMPLE
const apiCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function fetchWithCache(endpoint, dataType) {
    const cacheKey = endpoint;
    const cached = apiCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
    }
    
    const data = await fetchWithErrorHandlingOptimized(endpoint, dataType);
    
    apiCache.set(cacheKey, {
        data,
        timestamp: Date.now()
    });
    
    return data;
}
