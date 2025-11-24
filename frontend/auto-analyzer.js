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
    BATCH_SIZE: 6, // Réduit de 12 à 6
    DELAY_BETWEEN_BATCHES: 3000, // Augmenté à 3 secondes
    REQUEST_TIMEOUT: 15000,
    MAX_CONCURRENT_REQUESTS: 4, // Réduit de 8 à 4
    DELAY_BETWEEN_REQUESTS: 200, // Délai entre chaque requête dans un batch
    MAX_RETRIES: 3, // Nombre de tentatives en cas d'échec
    RETRY_DELAY: 1000 // Délai avant retry
};

console.log('📊 AutoAnalyzer chargé - Prêt pour l analyse automatique');

// =============================================================================
// GESTION DU RATE LIMITING
// =============================================================================

let rateLimitStats = {
    totalRequests: 0,
    failedRequests: 0,
    lastRequestTime: 0,
    requestsPerMinute: 0
};

// Fonction améliorée avec gestion du rate limiting
async function fetchWithRateLimiting(endpoint, dataType, retryCount = 0) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PERFORMANCE_CONFIG.REQUEST_TIMEOUT);

    try {
        // Respecter un délai minimum entre les requêtes
        const now = Date.now();
        const timeSinceLastRequest = now - rateLimitStats.lastRequestTime;
        if (timeSinceLastRequest < PERFORMANCE_CONFIG.DELAY_BETWEEN_REQUESTS) {
            await new Promise(resolve => 
                setTimeout(resolve, PERFORMANCE_CONFIG.DELAY_BETWEEN_REQUESTS - timeSinceLastRequest)
            );
        }

        const separator = endpoint.includes('?') ? '&' : '?';
        const url = `${BASE_URL}${endpoint}${separator}apikey=${API_KEY}`;
        
        rateLimitStats.lastRequestTime = Date.now();
        rateLimitStats.totalRequests++;

        const response = await fetch(url, { 
            signal: controller.signal 
        });
        
        clearTimeout(timeoutId);
        
        if (response.status === 429) {
            // Rate limit exceeded - wait and retry
            const retryAfter = response.headers.get('Retry-After') || 60;
            const waitTime = parseInt(retryAfter) * 1000;
            
            addToAnalysisLog('SYSTEM', `⏳ Rate limit atteint, attente de ${waitTime/1000}s...`, 'warning');
            
            await new Promise(resolve => setTimeout(resolve, waitTime));
            
            if (retryCount < PERFORMANCE_CONFIG.MAX_RETRIES) {
                return fetchWithRateLimiting(endpoint, dataType, retryCount + 1);
            } else {
                throw new Error(`Rate limit après ${PERFORMANCE_CONFIG.MAX_RETRIES} tentatives`);
            }
        }
        
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
        
        // Retry pour les erreurs temporaires
        if (retryCount < PERFORMANCE_CONFIG.MAX_RETRIES && 
            (error.message.includes('429') || error.message.includes('5'))) {
            
            addToAnalysisLog('SYSTEM', `🔄 Nouvelle tentative ${retryCount + 1}/${PERFORMANCE_CONFIG.MAX_RETRIES}`, 'warning');
            
            await new Promise(resolve => 
                setTimeout(resolve, PERFORMANCE_CONFIG.RETRY_DELAY * (retryCount + 1))
            );
            
            return fetchWithRateLimiting(endpoint, dataType, retryCount + 1);
        }
        
        rateLimitStats.failedRequests++;
        throw error;
    }
}
// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initAutoAnalyzer, 2000);
});

function initAutoAnalyzer() {
    console.log('🚀 Initialisation de l analyseur automatique...');
    addAutoAnalysisButton();
    injectAutoAnalyzerStyles();
}


// =============================================================================
// FONCTIONS PRINCIPALES
// =============================================================================
async function getCompaniesData() {
    try {
        // Essayez différentes sources possibles
        if (typeof allCompaniesData !== 'undefined' && Array.isArray(allCompaniesData)) {
            return allCompaniesData;
        }
        
        if (window.allCompaniesData && Array.isArray(window.allCompaniesData)) {
            return window.allCompaniesData;
        }
        
        // Si vous avez une autre fonction qui charge les données
        if (typeof loadCompanies === 'function') {
            return await loadCompanies();
        }
        
        return null;
    } catch (error) {
        console.error('Erreur récupération données entreprises:', error);
        return null;
    }
}

// CORRECTION - La fonction doit être async pour utiliser await
async function startAutoAnalysis(startLetters = '') {
    console.log('🎯 Démarrage de l analyse automatique...');
    
    // Récupérer les données directement depuis votre système
    const companies = await getCompaniesData();
    
    if (!companies || !Array.isArray(companies) || companies.length === 0) {
        alert('Veuillez d\'abord charger les entreprises en cliquant sur "📋 Rechercher entreprise"');
        return;
    }

    let filteredCompanies = filterCompaniesBeforeAnalysis(companies);
    
    if (startLetters && startLetters.trim() !== '') {
        const letters = startLetters.trim().toUpperCase().split(',').map(letter => letter.trim());
        filteredCompanies = filteredCompanies.filter(company => {
            return letters.some(letter => company.symbol.toUpperCase().startsWith(letter));
        });
        console.log(`🔤 Filtrage par lettres: ${letters.join(', ')} - ${filteredCompanies.length} entreprises`);
    }
    
    if (filteredCompanies.length === 0) {
        alert('Aucune entreprise valide à analyser');
        return;
    }

    // CORRECTION : Utiliser 'companies' au lieu de 'allCompaniesData'
    const originalCount = companies.length;  // ← CORRIGÉ ICI
    const filteredCount = filteredCompanies.length;
    
    let confirmMessage = `Voulez-vous analyser ${filteredCount} entreprises ?\nCela peut prendre plusieurs minutes.`;
    if (startLetters) {
        confirmMessage = `Voulez-vous analyser ${filteredCount} entreprises commençant par ${startLetters} ?\nCela peut prendre plusieurs minutes.`;
    }
    
    if (!confirm(confirmMessage)) {
        return;
    }

    analysisQueue = filteredCompanies;
    currentAnalysisIndex = 0;
    analysisResults = [];
    isAnalyzing = true;

    createAnalysisProgressUI();
    
    await processBatchOptimized(analysisQueue, PERFORMANCE_CONFIG.BATCH_SIZE);
    
    finishAutoAnalysis();
}


// =============================================================================
// BOUTON AVEC CHOIX DES LETTRES - SEULE MODIFICATION INTERFACE
// =============================================================================

function addAutoAnalysisButton() {
    const modalHeader = document.querySelector('.modal-header');
    
    if (modalHeader && !document.getElementById('autoAnalyzeBtn')) {
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'auto-analyzer-buttons';
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '10px';
        buttonContainer.style.alignItems = 'center';
        
        // Bouton d'analyse normale
        const autoAnalyzeBtn = document.createElement('button');
        autoAnalyzeBtn.id = 'autoAnalyzeBtn';
        autoAnalyzeBtn.className = 'btn-primary';
        autoAnalyzeBtn.innerHTML = '🚀 Analyser toutes les entreprises';
        autoAnalyzeBtn.addEventListener('click', () => startAutoAnalysisWithLetterChoice());
        
        buttonContainer.appendChild(autoAnalyzeBtn);
        modalHeader.appendChild(buttonContainer);
        
        console.log('✅ Bouton d analyse automatique ajouté');
    } else {
        console.log('⏳ Modal non trouvé, réessai dans 2 secondes...');
        setTimeout(addAutoAnalysisButton, 2000);
    }
}

// NOUVELLE FONCTION POUR CHOISIR LES LETTRES
function startAutoAnalysisWithLetterChoice() {
    const startLetters = prompt(
        '🔤 Analyser à partir de quelles lettres ?\n\n' +
        'Laissez vide pour toutes les entreprises\n' +
        'Exemples:\n' +
        '- "DM" pour les symboles commençant par DM\n' +
        '- "A,B,C" pour les symboles commençant par A, B ou C\n' +
        '- "AA,AB" pour les symboles commençant par AA ou AB',
        'DM' // Valeur par défaut
    );
    
    if (startLetters === null) {
        return; // L'utilisateur a annulé
    }
    
    startAutoAnalysis(startLetters);
}

// =============================================================================
// TRAITEMENT PAR LOTS OPTIMISÉ
// =============================================================================

async function processBatchOptimized(companies, batchSize = PERFORMANCE_CONFIG.BATCH_SIZE) {
    console.log(`⚡ Démarrage traitement par lots (${batchSize} entreprises/lot)`);
    
    for (let i = 0; i < companies.length && isAnalyzing; i += batchSize) {
        const batch = companies.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(companies.length / batchSize);
        
        console.log(`📦 Lot ${batchNumber}/${totalBatches} (${batch.length} entreprises)`);
        addToAnalysisLog('SYSTEM', `📦 Lot ${batchNumber}/${totalBatches} (${batch.length} entreprises)`, 'info');
        
        // Traiter les entreprises séquentiellement dans le batch pour éviter le rate limiting
        const batchResults = [];
        
        for (const company of batch) {
            if (!isAnalyzing) break;
            
            try {
                const result = await analyzeSingleCompanyOptimized(company.symbol, company.companyName || company.name);
                batchResults.push({ status: 'fulfilled', value: result });
            } catch (error) {
                batchResults.push({ 
                    status: 'rejected', 
                    reason: error,
                    value: {
                        symbol: company.symbol,
                        error: true,
                        errorMessage: error.message,
                        date: new Date().toISOString()
                    }
                });
            }
            
            // Petit délai entre chaque entreprise dans le même batch
            if (isAnalyzing) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        
        // Traiter les résultats du batch
        batchResults.forEach(result => {
            if (result.status === 'fulfilled' && result.value) {
                analysisResults.push(result.value);
            } else if (result.status === 'rejected' && result.value) {
                analysisResults.push(result.value);
            }
        });
        
        currentAnalysisIndex += batch.length;
        updateProgressUI(batch[0], (currentAnalysisIndex / companies.length) * 100);
        updateResultsCounters();
        
        // Délai plus long entre les batches
        if (i + batchSize < companies.length && isAnalyzing) {
            const delay = PERFORMANCE_CONFIG.DELAY_BETWEEN_BATCHES;
            addToAnalysisLog('SYSTEM', `⏳ Pause de ${delay/1000}s avant le prochain lot...`, 'info');
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}


// =============================================================================
// ANALYSE OPTIMISÉE D'UNE ENTREPRISE
// =============================================================================

async function analyzeSingleCompanyOptimized(symbol, companyName) {
    const entrepriseId = null;
    addToAnalysisLog(symbol, `🔍 Début analyse...`, 'info');

    try {
        // Étape 1: Pré-validation
        const validation = await validateCompanyData(symbol);
        if (!validation.isValid) {
            throw new Error(`Données insuffisantes: ${validation.reason}`);
        }

        // Récupérer les autres données
        const endpoints = [
            `/quote?symbol=${symbol}`, 
            `/cash-flow-statement?symbol=${symbol}`,
            `/income-statement?symbol=${symbol}`,
            `/balance-sheet-statement?symbol=${symbol}`
        ];

        const [quote, cashFlow, incomeStatement, balanceSheet] = await Promise.all(
            endpoints.map(endpoint => 
                fetchWithRateLimiting(endpoint, 'données financières')
                    .catch(error => {
                        console.warn(`⚠️ Donnée manquante pour ${symbol}:`, error.message);
                        return null;
                    })
            )
        );



        // CORRECTION: Utiliser validation.profile au lieu de profile[0] qui n'existe pas
        const companyData = {
            profile: validation.profile, // ← CORRIGÉ ICI
            quote: quote?.[0] || {},
            cashFlow: cashFlow?.[0],
            incomeStatement: incomeStatement?.[0],
            balanceSheet: balanceSheet?.[0]
        };

        const tradingMetrics = await calculateAdvancedTradingMetrics(companyData);
        await saveTradingMetrics(entrepriseId, tradingMetrics);

        
        // Validation des données minimales
        if (!companyData.quote || !companyData.quote.price) {
            throw new Error('Données de prix manquantes');
        }

        // Vérifier les données financières essentielles
        const hasEssentialData = 
            companyData.incomeStatement && 
            companyData.incomeStatement.revenue > 0 &&
            companyData.incomeStatement.netIncome !== undefined &&
            companyData.balanceSheet &&
            companyData.balanceSheet.totalAssets > 0;

        if (!hasEssentialData) {
            throw new Error('Données financières essentielles manquantes');
        }

        
        // Étape 3: Calcul des métriques
        const metrics = await calculateMetricsInWorker(companyData);
        
        // Validation des métriques calculées
        const essentialMetrics = ['roe', 'roa', 'netMargin', 'debtToEquity', 'peRatio'];
        const validEssentialMetrics = essentialMetrics.filter(metric => 
            metrics[metric] !== null && metrics[metric] !== undefined
        ).length;

        if (validEssentialMetrics < 3) {
            throw new Error('Métriques essentielles insuffisantes');
        }

        // Étape 4: Calcul des scores et recommandation
        const scores = calculateScoresAuto(metrics);
        const totalScore = scores.excellent * 3 + scores.good * 2 + scores.medium;
        const maxScore = (scores.excellent + scores.good + scores.medium + scores.bad) * 3;
        const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

        const recommendation = percentage >= 75 ? 'EXCELLENT' :
                              percentage >= 60 ? 'BON' :
                              percentage >= 45 ? 'MOYEN' : 'FAIBLE';

        const result = {
            symbol,
            companyName: companyData.profile.companyName,
            metrics,
            recommendation,
            score: percentage,
            date: new Date().toISOString(),
            success: true,
            saved: false
        };

        // Sauvegarde asynchrone (ne pas attendre)
        sauvegarderAnalyseAutomatique(metrics, recommendation, companyData)
            .then(saved => {
                if (saved) {
                    result.saved = true;
                    addToAnalysisLog(symbol, `💾 Sauvegarde OK`, 'success');
                    updateResultsCounters(); // Mettre à jour le compteur
                }
            })
            .catch(error => {
                console.error(`❌ Erreur sauvegarde ${symbol}:`, error);
            });

        const logClass = getRecommendationClass(recommendation);
        
        // CORRECTION: Calculer validMetricsCount correctement
        const validMetricsCount = Object.values(metrics).filter(val => val !== null && val !== undefined).length;

        addToAnalysisLog(symbol, `${recommendation} (${percentage.toFixed(0)}%) - ${validMetricsCount} métriques`, logClass);
        return result;

    } catch (error) {
        addToAnalysisLog(symbol, `❌ ${error.message}`, 'error');
        throw error;
    }
}

// =============================================================================
// FONCTION TOGGLE PAUSE MANQUANTE 
// =============================================================================

function togglePauseAnalysis() {
    isAnalyzing = !isAnalyzing;
    const pauseBtn = document.getElementById('pauseAnalysis');
    
    if (isAnalyzing) {
        pauseBtn.innerHTML = '⏸️ Pause';
        pauseBtn.className = 'btn-secondary';
        addToAnalysisLog('SYSTEM', '▶️ Analyse reprise', 'info');
    } else {
        pauseBtn.innerHTML = '▶️ Reprendre';
        pauseBtn.className = 'btn-primary';
        addToAnalysisLog('SYSTEM', '⏸️ Analyse en pause', 'warning');
    }
}

// =============================================================================
// FONCTIONS DE REQUÊTES
// =============================================================================
function getPriceHistory(symbol, days) {
    return Promise.resolve([]); // Implémentation temporaire
}

function getSectorReturns(sector, days) {
    return Promise.resolve([]); // Implémentation temporaire
}

function calculateReturnsFromPrices(prices) {
    return []; // Implémentation temporaire
}

function getShortInterest(symbol) {
    return Promise.resolve(null); // Implémentation temporaire
}

async function calculateAdvancedTradingMetrics(companyData) {
    const { symbol, profile, quote, incomeStatement, cashFlow, balanceSheet } = companyData;
    
    try {
        // Récupérer les données historiques (à implémenter)
        const priceHistory = await getPriceHistory(symbol, 252); // 1 an
        const sectorReturns = await getSectorReturns(profile.sector, 252);
        
        // Calculer toutes les métriques
        const metrics = {
            // Valorisation
            normalizedFCF: TradingMetricsCalculator.calculateNormalizedFCF(cashFlow),
            dynamicPEG: TradingMetricsCalculator.calculateDynamicPEG(incomeStatement, quote.peRatio),
            
            // Qualité
            earningsQuality: TradingMetricsCalculator.calculateEarningsQuality(incomeStatement, cashFlow),
            
            // Momentum
            priceMomentum: TradingMetricsCalculator.calculatePriceMomentum(priceHistory, 63),
            relativeStrength: TradingMetricsCalculator.calculateRelativeStrength(
                calculateReturnsFromPrices(priceHistory),
                sectorReturns
            ),
            
            // Risque
            volatility: TradingMetricsCalculator.calculateVolatility(priceHistory, 30),
            shortInterest: await getShortInterest(symbol) // À implémenter
        };
        
        // Scores composites
        const scores = TradingMetricsCalculator.calculateCompositeScores(metrics);
        
        return {
            ...metrics,
            ...scores,
            date_analyse: new Date().toISOString().split('T')[0]
        };
        
    } catch (error) {
        console.error(`Error calculating trading metrics for ${symbol}:`, error);
        return null;
    }
}

async function fetchWithErrorHandlingOptimized(endpoint, dataType) {
    try {
        const separator = endpoint.includes('?') ? '&' : '?';
        const url = `${BASE_URL}${endpoint}${separator}apikey=${API_KEY}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (Array.isArray(data) && data.length === 0) {
            throw new Error('Aucune donnée disponible');
        }
        
        return data;
    } catch (error) {
        console.error(`Erreur ${dataType}:`, error);
        throw error;
    }
}

// =============================================================================
// CALCUL DES MÉTRIQUES
// =============================================================================

function calculateMetricsInWorker(companyData) {
    return new Promise((resolve) => {
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

function calculateAllFinancialRatios(companyData) {
    const { profile, quote, balanceSheet, incomeStatement, cashFlow } = companyData;
    
    if (!balanceSheet || !incomeStatement || !cashFlow) {
        console.error('Données financières manquantes pour les calculs');
        return null;
    }

    return {
        ...calculateProfitabilityRatios(incomeStatement, balanceSheet),
        ...calculateSafetyRatios(balanceSheet, incomeStatement),
        ...calculateValuationRatios(profile, quote, incomeStatement, cashFlow, balanceSheet),
        ...calculateGrowthRatios(incomeStatement, cashFlow),
        ...calculateEfficiencyRatios(incomeStatement, balanceSheet),
        ...calculateSpecificRatios(companyData)
    };
}

function calculateProfitabilityRatios(incomeStatement, balanceSheet) {
    const revenue = incomeStatement.revenue || 0;
    const netIncome = incomeStatement.netIncome || 0;
    const grossProfit = incomeStatement.grossProfit || 0;
    const operatingIncome = incomeStatement.operatingIncome || 0;
    const totalEquity = balanceSheet.totalStockholdersEquity || 1;
    const totalAssets = balanceSheet.totalAssets || 1;
    const sgaExpenses = incomeStatement.sellingGeneralAndAdministrativeExpenses || 0;
    
    const roe = (netIncome / totalEquity) * 100;
    const roa = (netIncome / totalAssets) * 100;
    const netMargin = revenue !== 0 ? (netIncome / revenue) * 100 : 0;
    const grossMargin = revenue !== 0 ? (grossProfit / revenue) * 100 : 0;
    const operatingMargin = revenue !== 0 ? (operatingIncome / revenue) * 100 : 0;
    const sgaMargin = revenue !== 0 ? (sgaExpenses / revenue) * 100 : 0;
    
    const taxRate = incomeStatement.incomeBeforeTax ? 
        (Math.abs(incomeStatement.incomeTaxExpense) / Math.abs(incomeStatement.incomeBeforeTax)) || 0.25 : 0.25;
    const nopat = operatingIncome * (1 - taxRate);
    const investedCapital = (balanceSheet.totalDebt || 0) + totalEquity;
    const roic = investedCapital !== 0 ? (nopat / investedCapital) * 100 : 0;

    return { roe, roa, netMargin, grossMargin, operatingMargin, sgaMargin, roic };
}

function calculateSafetyRatios(balanceSheet, incomeStatement) {
    const currentAssets = balanceSheet.totalCurrentAssets || 0;
    const currentLiabilities = balanceSheet.totalCurrentLiabilities || 1;
    const totalDebt = balanceSheet.totalDebt || 0;
    const totalEquity = balanceSheet.totalStockholdersEquity || 1;
    const operatingIncome = incomeStatement.operatingIncome || 0;
    const interestExpense = Math.abs(incomeStatement.interestExpense || 1);
    const cash = balanceSheet.cashAndCashEquivalents || 0;
    const inventory = balanceSheet.inventory || 0;
    const totalAssets = balanceSheet.totalAssets || 1;
    
    const currentRatio = currentAssets / currentLiabilities;
    const quickRatio = (currentAssets - inventory) / currentLiabilities;
    const debtToEquity = totalDebt / totalEquity;
    const debtToAssets = totalDebt / totalAssets;
    const interestCoverage = operatingIncome / interestExpense;
    const cashRatio = cash / currentLiabilities;

    return { currentRatio, quickRatio, debtToEquity, debtToAssets, interestCoverage, cashRatio };
}

function calculateValuationRatios(profile, quote, incomeStatement, cashFlow, balanceSheet) {
    const price = quote.price || 1;
    const marketCap = quote.marketCap || 1;
    const eps = incomeStatement.eps || incomeStatement.epsDiluted || 1;
    const sharesOutstanding = incomeStatement.weightedAverageShsOut || incomeStatement.weightedAverageShsOutDil || 1;
    const bookValuePerShare = (balanceSheet.totalStockholdersEquity || 0) / sharesOutstanding;
    const freeCashFlow = cashFlow.freeCashFlow || 1;
    const ebitda = incomeStatement.ebitda || 1;
    const priceAvg200 = quote.priceAvg200 || price;
    const revenue = incomeStatement.revenue || 1;
    const dividendPerShare = profile.lastDividend || 0;
    const growthRate = calculateHistoricalGrowth(incomeStatement, 5); // 5 ans
    
    const peRatio = price / eps;
    const pbRatio = bookValuePerShare !== 0 ? price / bookValuePerShare : 0;
    const priceToSales = marketCap / revenue;
    const priceToFCF = marketCap / freeCashFlow;
    const enterpriseValue = marketCap + (balanceSheet.totalDebt || 0) - (balanceSheet.cashAndCashEquivalents || 0);
    const evToEbitda = enterpriseValue / ebitda;
    const earningsYield = (eps / price) * 100;
    const dividendYield = (dividendPerShare / price) * 100;
    const pegRatio = growthRate > 0 ? peRatio / growthRate : null;
    const priceToMM200 = (price / priceAvg200 - 1) * 100;

    return { peRatio, pbRatio, priceToSales, priceToFCF, evToEbitda, earningsYield, dividendYield, pegRatio, priceToMM200 };
}

function calculateGrowthRatios() {
    return { revenueGrowth: 0, earningsGrowth: 0, fcfGrowth: 0 };
}

function calculateEfficiencyRatios(incomeStatement, balanceSheet) {
    const revenue = incomeStatement.revenue || 1;
    const totalAssets = balanceSheet.totalAssets || 1;
    const inventory = balanceSheet.inventory || 0;
    const accountsReceivable = balanceSheet.netReceivables || 0;
    const cogs = incomeStatement.costOfRevenue || 0;
    
    const assetTurnover = revenue / totalAssets;
    const inventoryTurnover = inventory !== 0 ? cogs / inventory : 0;
    const receivablesTurnover = accountsReceivable !== 0 ? revenue / accountsReceivable : 0;

    return { assetTurnover, inventoryTurnover, receivablesTurnover };
}

function calculateSpecificRatios(companyData) {
    const { balanceSheet, cashFlow } = companyData;
    const freeCashFlow = cashFlow.freeCashFlow || 0;
    const netCash = (balanceSheet.cashAndCashEquivalents || 0) - (balanceSheet.totalDebt || 0);
    
    return { freeCashFlow, netCash };
}

function calculateCompanyMetricsSafe(companyData) {
    try {
        const allRatios = calculateAllFinancialRatios(companyData);
        
        if (!allRatios) {
            throw new Error('Impossible de calculer les ratios');
        }
        
        Object.keys(allRatios).forEach(key => {
            if (allRatios[key] === null || !isFinite(allRatios[key]) || Math.abs(allRatios[key]) > 1000000) {
                allRatios[key] = null;
            }
        });
        
        return allRatios;
        
    } catch (error) {
        console.error('Erreur dans calculateCompanyMetricsSafe:', error);
        
        const emptyMetrics = {};
        const metricKeys = [
            'roe', 'roa', 'netMargin', 'grossMargin', 'operatingMargin', 'sgaMargin', 'roic',
            'currentRatio', 'quickRatio', 'debtToEquity', 'debtToAssets', 'interestCoverage', 'cashRatio',
            'peRatio', 'pbRatio', 'priceToSales', 'priceToFCF', 'evToEbitda', 'earningsYield', 
            'dividendYield', 'pegRatio', 'priceToMM200',
            'assetTurnover', 'inventoryTurnover', 'receivablesTurnover',
            'freeCashFlow', 'netCash'
        ];
        
        metricKeys.forEach(key => { emptyMetrics[key] = null; });
        return emptyMetrics;
    }
}

// =============================================================================
// CALCUL DES SCORES
// =============================================================================

function calculateScoresAuto(metrics) {
    const scores = { excellent: 0, good: 0, medium: 0, bad: 0 };
    
    const metricThresholds = [
        { key: 'roe', excellent: 20, good: 15, medium: 10, reverse: false },
        { key: 'roa', excellent: 10, good: 7, medium: 5, reverse: false },
        { key: 'netMargin', excellent: 20, good: 15, medium: 10, reverse: false },
        { key: 'grossMargin', excellent: 50, good: 40, medium: 30, reverse: false },
        { key: 'operatingMargin', excellent: 20, good: 15, medium: 10, reverse: false },
        { key: 'sgaMargin', excellent: 10, good: 20, medium: 30, reverse: true },
        { key: 'roic', excellent: 15, good: 10, medium: 8, reverse: false },
        { key: 'debtToEquity', excellent: 0.3, good: 0.5, medium: 1.0, reverse: true },
        { key: 'debtToAssets', excellent: 0.2, good: 0.4, medium: 0.6, reverse: true },
        { key: 'currentRatio', excellent: 2.0, good: 1.5, medium: 1.0, reverse: false },
        { key: 'quickRatio', excellent: 1.5, good: 1.0, medium: 0.5, reverse: false },
        { key: 'cashRatio', excellent: 0.5, good: 0.3, medium: 0.1, reverse: false },
        { key: 'interestCoverage', excellent: 10, good: 5, medium: 3, reverse: false },
        { key: 'peRatio', excellent: 10, good: 15, medium: 25, reverse: true },
        { key: 'pbRatio', excellent: 1.5, good: 3, medium: 5, reverse: true },
        { key: 'priceToSales', excellent: 1, good: 3, medium: 5, reverse: true },
        { key: 'priceToFCF', excellent: 10, good: 15, medium: 20, reverse: true },
        { key: 'evToEbitda', excellent: 8, good: 12, medium: 15, reverse: true },
        { key: 'earningsYield', excellent: 10, good: 6, medium: 4, reverse: false },
        { key: 'dividendYield', excellent: 4, good: 2, medium: 1, reverse: false },
        { key: 'pegRatio', excellent: 0.8, good: 1.0, medium: 1.2, reverse: true },
        { key: 'priceToMM200', excellent: 5, good: 0, medium: -5, reverse: false },
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
// SAUVEGARDE DES DONNÉES
// =============================================================================
// 4.3 Fonction de sauvegarde
async function saveTradingMetrics(entrepriseId, metrics) {
    try {
        const response = await fetch('/api/trading-metrics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                entreprise_id: entrepriseId,
                ...metrics
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        console.log(`✅ Trading metrics saved for entreprise ${entrepriseId}`);
        return true;
        
    } catch (error) {
        console.error(`❌ Error saving trading metrics:`, error);
        return false;
    }
}

async function sauvegarderAnalyseAutomatique(metrics, recommendation, companyData) {
    try {
        const symbol = companyData.profile.symbol;
        console.log(`💾 Sauvegarde COMPLÈTE de ${symbol}...`);

        // Validation des données avant sauvegarde
        if (!symbol || !companyData.profile.companyName) {
            throw new Error('Données entreprise invalides');
        }

        console.log(`💾 Tentative sauvegarde de ${symbol}...`);
        
        const datePublication = companyData.incomeStatement?.date || new Date().toISOString().split('T')[0];
        const scores = calculateScoresAuto(metrics);
        const totalScore = scores.excellent * 3 + scores.good * 2 + scores.medium;
        const maxScore = (scores.excellent + scores.good + scores.medium + scores.bad) * 3;
        const scoreGlobal = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
        const netCash = (companyData.balanceSheet?.cashAndCashEquivalents || 0) - (companyData.balanceSheet?.totalDebt || 0);

        // Création entreprise
        try {
            await fetch('https://api-u54u.onrender.com/api/analyses/entreprise', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    symbol: symbol,
                    nom: companyData.profile.companyName,
                    secteur: companyData.profile.sector || 'Non spécifié',
                    industrie: companyData.profile.industry || 'Non spécifié'
                })
            });
        } catch (error) {
            console.log('⚠️ Endpoint entreprise non disponible:', error.message);
        }

        // Données analyse Buffett
        const analyseData = {
            symbol: symbol,
            date_analyse: new Date().toISOString().split('T')[0],
            periode: 'FY',
            date_publication: datePublication,
            score_global: scoreGlobal,
            recommandation: recommendation,
            roe: metrics.roe,
            roa: metrics.roa,
            netMargin: metrics.netMargin,
            grossMargin: metrics.grossMargin,
            operatingMargin: metrics.operatingMargin,
            sgaMargin: metrics.sgaMargin,
            roic: metrics.roic,
            debtToEquity: metrics.debtToEquity,
            debtToAssets: metrics.debtToAssets,
            currentRatio: metrics.currentRatio,
            quickRatio: metrics.quickRatio,
            cashRatio: metrics.cashRatio,
            interestCoverage: metrics.interestCoverage,
            peRatio: metrics.peRatio,
            pbRatio: metrics.pbRatio,
            priceToSales: metrics.priceToSales,
            priceToFCF: metrics.priceToFCF,
            evToEbitda: metrics.evToEbitda,
            earningsYield: metrics.earningsYield,
            dividendYield: metrics.dividendYield,
            pegRatio: metrics.pegRatio,
            priceToMM200: metrics.priceToMM200,
            assetTurnover: metrics.assetTurnover,
            inventoryTurnover: metrics.inventoryTurnover,
            receivablesTurnover: metrics.receivablesTurnover,
            freeCashFlow: metrics.freeCashFlow,
            netCash: metrics.netCash,
            points_forts: getStrengthsAuto(metrics).join('; '),
            points_faibles: getWeaknessesAuto(metrics).join('; ')
        };

        // Données financières
        const donneesData = {
            symbol: symbol,
            date_import: new Date().toISOString().split('T')[0],
            currentPrice: companyData.quote.price,
            movingAverage200: companyData.quote.priceAvg200,
            dividendPerShare: companyData.profile.lastDividend,
            marketCap: companyData.quote.marketCap,
            cashEquivalents: companyData.balanceSheet?.cashAndCashEquivalents,
            currentAssets: companyData.balanceSheet?.totalCurrentAssets,
            currentLiabilities: companyData.balanceSheet?.totalCurrentLiabilities,
            totalDebt: companyData.balanceSheet?.totalDebt,
            shareholdersEquity: companyData.balanceSheet?.totalStockholdersEquity,
            netCash: netCash,
            revenue: companyData.incomeStatement?.revenue,
            ebit: companyData.incomeStatement?.operatingIncome,
            ebitda: companyData.incomeStatement?.ebitda,
            netIncome: companyData.incomeStatement?.netIncome,
            eps: companyData.incomeStatement?.eps,
            interestExpense: Math.abs(companyData.incomeStatement?.interestExpense || 0),
            operatingCashFlow: companyData.cashFlow?.operatingCashFlow,
            freeCashFlow: companyData.cashFlow?.freeCashFlow
        };

        // Sauvegarde analyse
        const responseAnalyse = await fetch('https://api-u54u.onrender.com/api/analyses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(analyseData)
        });

        if (!responseAnalyse.ok) throw new Error(`Erreur analyse: HTTP ${responseAnalyse.status}`);

        // Sauvegarde données financières
        const responseDonnees = await fetch('https://api-u54u.onrender.com/api/analyses/donnees-financieres', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(donneesData)
        });

        if (!responseDonnees.ok) throw new Error(`Erreur données financières: HTTP ${responseDonnees.status}`);

        addToAnalysisLog(symbol, `💾 Sauvegarde réussie`, 'success');
        return true;

    } catch (error) {
        console.error(`❌ Erreur sauvegarde ${companyData.profile.symbol}:`, error);
        addToAnalysisLog(companyData.profile.symbol, `❌ ${error.message}`, 'error');
        return false;
    }
}

// =============================================================================
// FONCTIONS UTILITAIRES
// =============================================================================

function calculateHistoricalGrowth(incomeStatement, years) {
    return 0.15; // Valeur par défaut
}

const TradingMetricsCalculator = {
    calculateNormalizedFCF: () => null,
    calculateDynamicPEG: () => null,
    calculateEarningsQuality: () => null,
    calculatePriceMomentum: () => null,
    calculateRelativeStrength: () => null,
    calculateVolatility: () => null,
    calculateCompositeScores: () => ({ 
        qualityScore: 0, 
        momentumScore: 0, 
        valueScore: 0, 
        riskAdjustedScore: 0 
    })
};

function filterCompaniesBeforeAnalysis(companies) {
    return companies.filter(company => {
        if (!company.symbol || company.symbol.length === 0) return false;
        
        // Exclusion des symboles courts (souvent des ETFs, fonds, etc.)
        if (company.symbol.length < 2 || company.symbol.length > 5) return false;
        
        // Exclusion des symboles commençant par des chiffres
        if (/^[0-9]/.test(company.symbol)) return false;
        
        // Exclusion des symboles avec caractères spéciaux
        if (!/^[A-Z.]+$/.test(company.symbol)) return false;
        
        // Exclusion des extensions communes d'ETFs et fonds
        const excludedExtensions = ['X', 'CX', 'PX', 'RX', 'UX', 'WX', 'TX'];
        const symbolUpper = company.symbol.toUpperCase();
        if (excludedExtensions.some(ext => symbolUpper.endsWith(ext))) return false;
        
        // Exclusion des types d'actifs non désirés
        const excludedTypes = ['ETF', 'TRUST', 'FUND', 'BOND', 'NOTE', 'PREFERENCE'];
        if (company.type && excludedTypes.includes(company.type.toUpperCase())) return false;
        
        // Exclusion des noms contenant certains termes
        const excludedTerms = ['ETF', 'FUND', 'TRUST', 'BOND', 'NOTE', 'PREFERRED', 'SHARES'];
        const companyName = (company.companyName || company.name || '').toUpperCase();
        if (excludedTerms.some(term => companyName.includes(term))) return false;
        
        return true;
    });
}

async function fetchWithTimeout(url, options, timeout = 10000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

function getStrengthsAuto(metrics) {
    const strengths = [];
    if (metrics.roe > 20) strengths.push('ROE exceptionnel (>20%)');
    if (metrics.roa > 10) strengths.push('ROA excellent (>10%)');
    if (metrics.netMargin > 20) strengths.push('Forte marge nette (>20%)');
    if (metrics.grossMargin > 50) strengths.push('Marge brute excellente (>50%)');
    if (metrics.operatingMargin > 20) strengths.push('Forte marge opérationnelle (>20%)');
    if (metrics.roic > 15) strengths.push('ROIC excellent (>15%)');
    if (metrics.sgaMargin < 10) strengths.push('Faibles frais généraux (<10%)');
    if (metrics.debtToEquity < 0.3) strengths.push('Faible endettement (<0.3)');
    if (metrics.debtToAssets < 0.2) strengths.push('Faible dette vs actifs (<0.2)');
    if (metrics.currentRatio > 2.0) strengths.push('Bonne liquidité (>2.0)');
    if (metrics.quickRatio > 1.5) strengths.push('Liquidité rapide excellente (>1.5)');
    if (metrics.interestCoverage > 10) strengths.push('Excellente couverture des intérêts (>10x)');
    if (metrics.cashRatio > 0.5) strengths.push('Fort ratio de trésorerie (>0.5)');
    if (metrics.peRatio < 10) strengths.push('P/E ratio attractif (<10)');
    if (metrics.pbRatio < 1.5) strengths.push('Price/Book attractif (<1.5)');
    if (metrics.priceToSales < 1) strengths.push('Price/Sales très attractif (<1)');
    if (metrics.earningsYield > 10) strengths.push('Rendement des bénéfices élevé (>10%)');
    if (metrics.priceToFCF < 10) strengths.push('Price/FCF attractif (<10)');
    if (metrics.dividendYield > 4) strengths.push('Dividende attractif (>4%)');
    if (metrics.evToEbitda < 8) strengths.push('EV/EBITDA attractif (<8)');
    if (metrics.pegRatio < 0.8) strengths.push('PEG ratio très attractif (<0.8)');
    if (metrics.priceToMM200 > 5) strengths.push('Tendance haussière vs MM200 (>5%)');
    if (metrics.assetTurnover > 1.0) strengths.push('Rotation des actifs efficace (>1.0)');
    if (metrics.inventoryTurnover > 8) strengths.push('Rotation des stocks efficace (>8)');
    if (metrics.receivablesTurnover > 10) strengths.push('Gestion des créances efficace (>10)');
    
    return strengths.length > 0 ? strengths : ['Aucun point fort significatif'];
}

function getWeaknessesAuto(metrics) {
    const weaknesses = [];
    if (metrics.roe < 10 && metrics.roe !== null) weaknesses.push('ROE faible (<10%)');
    if (metrics.roa < 5 && metrics.roa !== null) weaknesses.push('ROA faible (<5%)');
    if (metrics.netMargin < 10 && metrics.netMargin !== null) weaknesses.push('Marge nette faible (<10%)');
    if (metrics.grossMargin < 30 && metrics.grossMargin !== null) weaknesses.push('Marge brute faible (<30%)');
    if (metrics.operatingMargin < 10 && metrics.operatingMargin !== null) weaknesses.push('Marge opérationnelle faible (<10%)');
    if (metrics.roic < 8 && metrics.roic !== null) weaknesses.push('ROIC faible (<8%)');
    if (metrics.sgaMargin > 30) weaknesses.push('Frais généraux élevés (>30%)');
    if (metrics.debtToEquity > 1.0) weaknesses.push('Dette élevée (>1.0)');
    if (metrics.debtToAssets > 0.6) weaknesses.push('Dette importante vs actifs (>0.6)');
    if (metrics.currentRatio < 1.0) weaknesses.push('Problème de liquidité (<1.0)');
    if (metrics.quickRatio < 0.5) weaknesses.push('Liquidité rapide faible (<0.5)');
    if (metrics.interestCoverage < 3 && metrics.interestCoverage !== null) weaknesses.push('Couverture des intérêts faible (<3x)');
    if (metrics.cashRatio < 0.1) weaknesses.push('Trésorerie insuffisante (<0.1)');
    if (metrics.peRatio > 25) weaknesses.push('P/E ratio élevé (>25)');
    if (metrics.pbRatio > 5) weaknesses.push('Price/Book élevé (>5)');
    if (metrics.priceToSales > 5) weaknesses.push('Price/Sales élevé (>5)');
    if (metrics.earningsYield < 4 && metrics.earningsYield !== null) weaknesses.push('Rendement des bénéfices faible (<4%)');
    if (metrics.priceToFCF > 20) weaknesses.push('Price/FCF élevé (>20)');
    if (metrics.dividendYield < 2 && metrics.dividendYield !== null) weaknesses.push('Dividende faible (<2%)');
    if (metrics.evToEbitda > 15) weaknesses.push('EV/EBITDA élevé (>15)');
    if (metrics.pegRatio > 1.2) weaknesses.push('PEG ratio élevé (>1.2)');
    if (metrics.priceToMM200 < -5) weaknesses.push('Tendance baissière vs MM200 (<-5%)');
    if (metrics.assetTurnover < 0.5 && metrics.assetTurnover !== null) weaknesses.push('Rotation des actifs faible (<0.5)');
    if (metrics.inventoryTurnover < 3 && metrics.inventoryTurnover !== null) weaknesses.push('Rotation des stocks lente (<3)');
    if (metrics.receivablesTurnover < 4 && metrics.receivablesTurnover !== null) weaknesses.push('Gestion des créances lente (<4)');
    
    return weaknesses.length > 0 ? weaknesses : ['Aucun point faible significatif'];
}

function getRecommendationClass(recommendation) {
    const classes = { 'EXCELLENT': 'excellent', 'BON': 'good', 'MOYEN': 'medium', 'FAIBLE': 'bad' };
    return classes[recommendation] || 'info';
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
                    <button id="pauseAnalysis" class="btn-secondary">⏸️ Pause</button>
                    <button id="saveDataBtn" class="btn-save" style="display: none;">💾 Enregistrer</button>
                    <button id="cancelAnalysis" class="btn-danger">❌ Arrêter</button>
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
                <div class="rate-limit-info">
                    <span>📊 Requêtes: <span id="requestCount">0</span></span>
                    <span>❌ Erreurs: <span id="errorCount">0</span></span>
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
    document.getElementById('pauseAnalysis').addEventListener('click', togglePauseAnalysis);
    
    if (typeof sauvegarderDonneesManuellement === 'function') {
        document.getElementById('saveDataBtn').addEventListener('click', sauvegarderDonneesManuellement);
    }
}

function togglePauseAnalysis() {
    isAnalyzing = !isAnalyzing;
    const pauseBtn = document.getElementById('pauseAnalysis');
    
    if (isAnalyzing) {
        pauseBtn.innerHTML = '⏸️ Pause';
        pauseBtn.className = 'btn-secondary';
        addToAnalysisLog('SYSTEM', '▶️ Analyse reprise', 'info');
    } else {
        pauseBtn.innerHTML = '▶️ Reprendre';
        pauseBtn.className = 'btn-primary';
        addToAnalysisLog('SYSTEM', '⏸️ Analyse en pause', 'warning');
    }
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
    const unsavedResults = analysisResults.filter(r => r.success && !r.saved);
    
    const counts = {
        excellent: successResults.filter(r => r.recommendation === 'EXCELLENT').length,
        good: successResults.filter(r => r.recommendation === 'BON').length,
        medium: successResults.filter(r => r.recommendation === 'MOYEN').length,
        bad: successResults.filter(r => r.recommendation === 'FAIBLE').length,
        errors: errorResults.length,
        unsaved: unsavedResults.length
    };

    ['countExcellent', 'countGood', 'countMedium', 'countBad', 'countErrors'].forEach(id => {
        const element = document.getElementById(id);
        if (element) element.textContent = counts[id.replace('count', '').toLowerCase()] || 0;
    });

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

async function validateCompanyData(symbol) {
    try {
        const profile = await fetchWithErrorHandlingOptimized(`/profile?symbol=${symbol}`, 'profil');
        
        if (!profile || !profile[0]) {
            return { isValid: false, reason: 'Profil non disponible' };
        }

        const companyProfile = profile[0];
        
        if (!companyProfile.companyName) {
            return { isValid: false, reason: 'Nom entreprise invalide' };
        }

        return { 
            isValid: true, 
            profile: companyProfile
        };

    } catch (error) {
        return { isValid: false, reason: error.message };
    }
}

function stopAutoAnalysis() {
    isAnalyzing = false;
    addToAnalysisLog('SYSTEM', '⏹️ Analyse arrêtée par l utilisateur', 'warning');
    
    const progressHeader = document.querySelector('#autoAnalysisProgress .progress-header h3');
    if (progressHeader) progressHeader.textContent = '🔍 Analyse Arrêtée';
}


function finishAutoAnalysis() {
    isAnalyzing = false;
    addToAnalysisLog('SYSTEM', '✅ Analyse terminée !', 'success');
    
    const progressHeader = document.querySelector('#autoAnalysisProgress .progress-header h3');
    if (progressHeader) progressHeader.textContent = '✅ Analyse Terminée';

    const unsavedCount = analysisResults.filter(r => r.success && !r.saved).length;
    if (unsavedCount > 0) {
        const saveBtn = document.getElementById('saveDataBtn');
        if (saveBtn) {
            saveBtn.style.display = 'block';
            saveBtn.innerHTML = `💾 Enregistrer ${unsavedCount} analyses`;
        }
    }

    const excellent = analysisResults.filter(r => r.recommendation === 'EXCELLENT').length;
    const good = analysisResults.filter(r => r.recommendation === 'BON').length;
    const medium = analysisResults.filter(r => r.recommendation === 'MOYEN').length;
    const bad = analysisResults.filter(r => r.recommendation === 'FAIBLE').length;
    const errors = analysisResults.filter(r => r.error).length;

    setTimeout(() => {
        let message = `🎉 Analyse terminée !\n\n✅ Excellent: ${excellent}\n👍 Bon: ${good}\n⚠️ Moyen: ${medium}\n❌ Faible: ${bad}\n🚫 Erreurs: ${errors}`;
        
        if (unsavedCount > 0) {
            message += `\n\n💾 ${unsavedCount} analyses prêtes à être enregistrées\nCliquez sur "Enregistrer les données"`;
        }
        
        alert(message);
    }, 1000);
}

// =============================================================================
// SAUVEGARDE MANUELLE DES DONNÉES
// =============================================================================

async function sauvegarderDonneesManuellement() {
    try {
        const unsavedResults = analysisResults.filter(r => r.success && !r.saved);
        
        if (unsavedResults.length === 0) {
            alert('✅ Toutes les analyses sont déjà sauvegardées !');
            return;
        }

        const saveBtn = document.getElementById('saveDataBtn');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '💾 Sauvegarde en cours...';
        }

        addToAnalysisLog('SYSTEM', `💾 Début sauvegarde manuelle (${unsavedResults.length} analyses)`, 'info');

        let savedCount = 0;
        let errorCount = 0;

        // Sauvegarder chaque résultat non sauvegardé
        for (const result of unsavedResults) {
            try {
                // Reconstruire les données de l'entreprise pour la sauvegarde
                const companyData = await getCompanyDataForSaving(result.symbol);
                
                if (companyData) {
                    const saved = await sauvegarderAnalyseAutomatique(result.metrics, result.recommendation, companyData);
                    
                    if (saved) {
                        result.saved = true;
                        savedCount++;
                        addToAnalysisLog(result.symbol, '💾 Sauvegarde manuelle réussie', 'success');
                    } else {
                        errorCount++;
                        addToAnalysisLog(result.symbol, '❌ Échec sauvegarde manuelle', 'error');
                    }
                } else {
                    errorCount++;
                    addToAnalysisLog(result.symbol, '❌ Données manquantes pour sauvegarde', 'error');
                }
            } catch (error) {
                errorCount++;
                addToAnalysisLog(result.symbol, `❌ Erreur: ${error.message}`, 'error');
            }

            // Petit délai entre chaque sauvegarde pour éviter les rate limits
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Mettre à jour l'interface
        updateResultsCounters();

        if (saveBtn) {
            if (errorCount === 0) {
                saveBtn.style.display = 'none';
            } else {
                saveBtn.disabled = false;
                saveBtn.innerHTML = `💾 Réessayer (${errorCount} erreurs)`;
            }
        }

        // Afficher le résumé
        const message = `💾 Sauvegarde terminée :\n✅ ${savedCount} analyses sauvegardées\n${errorCount > 0 ? `❌ ${errorCount} erreurs` : '✅ Aucune erreur'}`;
        alert(message);
        addToAnalysisLog('SYSTEM', message, errorCount > 0 ? 'warning' : 'success');

    } catch (error) {
        console.error('❌ Erreur lors de la sauvegarde manuelle:', error);
        addToAnalysisLog('SYSTEM', `❌ Erreur critique: ${error.message}`, 'error');
        
        const saveBtn = document.getElementById('saveDataBtn');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '💾 Erreur - Réessayer';
        }
        
        alert('❌ Une erreur est survenue lors de la sauvegarde');
    }
}

// =============================================================================
// FONCTION UTILITAIRE POUR RÉCUPÉRER LES DONNÉES POUR SAUVEGARDE
// =============================================================================

async function getCompanyDataForSaving(symbol) {
    try {
        const endpoints = [
            `/profile?symbol=${symbol}`,
            `/quote?symbol=${symbol}`,
            `/cash-flow-statement?symbol=${symbol}`,
            `/income-statement?symbol=${symbol}`,
            `/balance-sheet-statement?symbol=${symbol}`
        ];

        const fetchPromises = endpoints.map(endpoint => 
            fetchWithErrorHandlingOptimized(endpoint, 'données sauvegarde')
        );

        const [profile, quote, cashFlow, incomeStatement, balanceSheet] = await Promise.all(fetchPromises);

        if (!profile || !profile[0] || !quote || !quote[0]) {
            throw new Error('Données de base manquantes');
        }

        return {
            profile: profile[0],
            quote: quote[0],
            cashFlow: cashFlow?.[0],
            incomeStatement: incomeStatement?.[0],
            balanceSheet: balanceSheet?.[0]
        };

    } catch (error) {
        console.error(`❌ Erreur récupération données ${symbol}:`, error);
        return null;
    }
}

// =============================================================================
// FONCTION UTILITAIRE POUR LES CONFIRMATIONS
// =============================================================================

function confirmAction(message) {
    return new Promise((resolve) => {
        // Créer une modal de confirmation personnalisée
        const modalHTML = `
            <div id="confirmationModal" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10001;
            ">
                <div style="
                    background: white;
                    padding: 20px;
                    border-radius: 10px;
                    max-width: 400px;
                    text-align: center;
                ">
                    <p>${message}</p>
                    <div style="margin-top: 20px;">
                        <button id="confirmYes" style="
                            background: #27ae60;
                            color: white;
                            border: none;
                            padding: 10px 20px;
                            border-radius: 5px;
                            margin-right: 10px;
                            cursor: pointer;
                        ">Oui</button>
                        <button id="confirmNo" style="
                            background: #e74c3c;
                            color: white;
                            border: none;
                            padding: 10px 20px;
                            border-radius: 5px;
                            cursor: pointer;
                        ">Non</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        document.getElementById('confirmYes').addEventListener('click', () => {
            document.getElementById('confirmationModal').remove();
            resolve(true);
        });
        
        document.getElementById('confirmNo').addEventListener('click', () => {
            document.getElementById('confirmationModal').remove();
            resolve(false);
        });
    });
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
        .header-buttons { display: flex; gap: 10px; align-items: center; }
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
        .btn-save:hover { background: #219a52; transform: translateY(-1px); }
        .btn-save:disabled { background: #95a5a6; cursor: not-allowed; transform: none; }
        .btn-secondary {
            background: #e74c3c;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
        }
        .btn-secondary:hover { background: #c0392b; }
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
        .log-entry { padding: 5px 0; border-bottom: 1px solid #f5f5f5; }
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
