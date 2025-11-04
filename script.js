// Configuration - Version corrigée pour vos endpoints
const API_KEY = 'S9PuvPa0mLK9FlCMS3cUYQjnbndSJFOY';
const BASE_URL = 'https://financialmodelingprep.com/stable';

// Éléments DOM
const symbolInput = document.getElementById('symbolInput');
const fetchDataBtn = document.getElementById('fetchDataBtn');
const analyzeBtn = document.getElementById('analyzeBtn');
const dataSection = document.getElementById('dataSection');
const analysisSection = document.getElementById('analysisSection');
const loading = document.getElementById('loading');
const errorDiv = document.getElementById('error');

// Données stockées
let currentData = {};

// Événements
fetchDataBtn.addEventListener('click', fetchCompanyData);
analyzeBtn.addEventListener('click', performAnalysis);

async function fetchCompanyData() {
    const symbol = symbolInput.value.trim().toUpperCase();
    
    if (!symbol) {
        showError('Veuillez entrer un symbole d\'action');
        return;
    }

    showLoading();
    hideError();
    
    try {
        console.log(`Récupération des données pour ${symbol}...`);
        
        // Récupérer toutes les données en parallèle avec vos endpoints exacts
        const [profile, quote, cashFlow, incomeStatement, balanceSheet] = await Promise.all([
            fetchAPI(`/profile?symbol=${symbol}`),
            fetchAPI(`/quote?symbol=${symbol}`),
            fetchAPI(`/cash-flow-statement?symbol=${symbol}`),
            fetchAPI(`/income-statement?symbol=${symbol}`),
            fetchAPI(`/balance-sheet-statement?symbol=${symbol}`),
            fetchHistoricalData(symbol)
        ]);

        // Vérifier si les données sont valides
        if (!profile || profile.length === 0) {
            throw new Error('Symbole non trouvé ou données indisponibles');
        }

        currentData = {
            profile: profile[0],
            quote: quote[0],
            cashFlow: cashFlow[0],
            incomeStatement: incomeStatement[0],
            balanceSheet: balanceSheet[0],
            historicalData: historicalData
        };

        console.log('Données récupérées avec succès:', currentData);
        displayBasicData();
        showDataSection();
        
    } catch (error) {
        console.error('Erreur détaillée:', error);
        showError(`Erreur: ${error.message}. Vérifiez le symbole et votre connexion.`);
    } finally {
        hideLoading();
    }
}

async function fetchAPI(endpoint) {
    console.log(`Appel API: ${endpoint}`);
    
    const url = `${BASE_URL}${endpoint}&apikey=${API_KEY}`;
    console.log('URL complète:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
        if (response.status === 401) {
            throw new Error('Clé API invalide ou non autorisée');
        } else if (response.status === 403) {
            throw new Error('Accès refusé. Vérifiez votre abonnement API.');
        } else if (response.status === 404) {
            throw new Error('Données non trouvées pour ce symbole.');
        } else {
            throw new Error(`Erreur API: ${response.status} ${response.statusText}`);
        }
    }
    
    const data = await response.json();
    
    // Vérifier si c'est un tableau et s'il contient des données
    if (Array.isArray(data) && data.length === 0) {
        throw new Error('Aucune donnée disponible pour ce symbole');
    }
    
    return data;
}

function displayBasicData() {
    const { profile, quote, balanceSheet, incomeStatement, cashFlow } = currentData;
    
    // Données de base
document.getElementById('basicData').innerHTML = `
    <div class="data-item">
        <span class="data-label">Entreprise:</span>
        <span class="data-value">${profile.companyName}</span>
    </div>
    <div class="data-item">
        <span class="data-label">Prix Actuel:</span>
        <span class="data-value">$${quote.price?.toFixed(2) || 'N/A'}</span>
    </div>
    <div class="data-item">
        <span class="data-label">Moyenne Mobile 200j:</span>
        <span class="data-value">$${quote.priceAvg200?.toFixed(2) || 'N/A'}</span>
    </div>
    <div class="data-item">
        <span class="data-label">Dividende par Action:</span>
        <span class="data-value">$${profile.lastDividend?.toFixed(2) || 'N/A'}</span>
    </div>
    <div class="data-item">
        <span class="data-label">Market Cap:</span>
        <span class="data-value">$${formatNumber(quote.marketCap)}</span>
    </div>
    <div class="data-item">
        <span class="data-label">Secteur:</span>
        <span class="data-value">${profile.sector}</span>
    </div>
`;

    // Balance Sheet
    document.getElementById('balanceSheetData').innerHTML = `
        <div class="data-item">
            <span class="data-label">Actifs Courants:</span>
            <span class="data-value">$${formatNumber(balanceSheet.totalCurrentAssets)}</span>
        </div>
        <div class="data-item">
            <span class="data-label">Passifs Courants:</span>
            <span class="data-value">$${formatNumber(balanceSheet.totalCurrentLiabilities)}</span>
        </div>
        <div class="data-item">
            <span class="data-label">Dette Totale:</span>
            <span class="data-value">$${formatNumber(balanceSheet.totalDebt)}</span>
        </div>
        <div class="data-item">
            <span class="data-label">Capitaux Propres:</span>
            <span class="data-value">$${formatNumber(balanceSheet.totalStockholdersEquity)}</span>
        </div>
    `;

    // Income Statement 
document.getElementById('incomeStatementData').innerHTML = `
    <div class="data-item">
        <span class="data-label">Revenus:</span>
        <span class="data-value">$${formatNumber(incomeStatement.revenue)}</span>
    </div>
    <div class="data-item">
        <span class="data-label">EBIT:</span>
        <span class="data-value">$${formatNumber(incomeStatement.operatingIncome)}</span>
    </div>
    <div class="data-item">
        <span class="data-label">Bénéfice Net:</span>
        <span class="data-value">$${formatNumber(incomeStatement.netIncome)}</span>
    </div>
    <div class="data-item">
        <span class="data-label">BPA (EPS):</span>
        <span class="data-value">$${incomeStatement.eps?.toFixed(2) || 'N/A'}</span>
    </div>
    <div class="data-item">
        <span class="data-label">Frais Financiers:</span>
        <span class="data-value">$${formatNumber(Math.abs(incomeStatement.interestExpense))}</span>
    </div>
    <div class="data-item">
        <span class="data-label">EBITDA:</span>
        <span class="data-value">$${formatNumber(incomeStatement.ebitda)}</span>
    </div>
`;

    // Cash Flow 
document.getElementById('cashFlowData').innerHTML = `
    <div class="data-item">
        <span class="data-label">Cash Flow Opérationnel:</span>
        <span class="data-value">$${formatNumber(cashFlow.operatingCashFlow)}</span>
    </div>
    <div class="data-item">
        <span class="data-label">Free Cash Flow:</span>
        <span class="data-value">$${formatNumber(cashFlow.freeCashFlow)}</span>
    </div>
    <div class="data-item">
        <span class="data-label">Dépenses en Capital (CapEx):</span>
        <span class="data-value">$${formatNumber(Math.abs(cashFlow.capitalExpenditure))}</span>
    </div>
`;
    displayHistoricalData();
}

//FONCTION pour les données historiques
async function fetchHistoricalData(symbol) {
    try {
        const historicalData = await fetchAPI(`/income-statement/${symbol}?period=annual&limit=10`);
        return historicalData;
    } catch (error) {
        console.error('Erreur historique:', error);
        return null;
    }
}

// FONCTION pour afficher l'historique des revenus
function displayHistoricalData() {
    const { historicalData } = currentData;
    
    if (!historicalData || historicalData.length === 0) {
        document.getElementById('historicalData').innerHTML = '<p>Aucune donnée historique disponible</p>';
        return;
    }
    
    let html = '';
    
    // Trier par année (du plus récent au plus ancien)
    historicalData.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    historicalData.forEach((yearData, index) => {
        const year = new Date(yearData.date).getFullYear();
        const revenue = formatNumber(yearData.revenue);
        const growth = index < historicalData.length - 1 ? 
            ` (${calculateGrowth(historicalData[index + 1].revenue, yearData.revenue)}%)` : '';
        
        html += `
            <div class="data-item">
                <span class="data-label">${year}:</span>
                <span class="data-value">$${revenue}${growth}</span>
            </div>
        `;
    });
    
    document.getElementById('historicalData').innerHTML = html;
}

// Fonction utilitaire pour calculer la croissance
function calculateGrowth(previousRevenue, currentRevenue) {
    if (!previousRevenue || previousRevenue === 0) return 'N/A';
    const growth = ((currentRevenue - previousRevenue) / previousRevenue) * 100;
    return growth.toFixed(1);
}

    
function performAnalysis() {
    const { profile } = currentData;
    document.getElementById('companyName').textContent = profile.companyName;
    
    const metrics = calculateMetrics();
    displayProfitabilityAnalysis(metrics);
    displaySafetyAnalysis(metrics);
    displayValuationAnalysis(metrics);
    displaySummaryAnalysis(metrics);
    showAnalysisSection();
}

function calculateMetrics() {
    const { quote, balanceSheet, incomeStatement, cashFlow } = currentData;
    
    // Profitabilité
    const roe = (incomeStatement.netIncome / balanceSheet.totalStockholdersEquity) * 100;
    const netMargin = (incomeStatement.netIncome / incomeStatement.revenue) * 100;
    const grossMargin = ((incomeStatement.revenue - incomeStatement.costOfRevenue) / incomeStatement.revenue) * 100;
    const sgaMargin = (incomeStatement.sellingGeneralAndAdministrativeExpenses / incomeStatement.revenue) * 100;
    
    // Sécurité
    const debtToEquity = balanceSheet.totalLiabilities / balanceSheet.totalStockholdersEquity;
    const currentRatio = balanceSheet.totalCurrentAssets / balanceSheet.totalCurrentLiabilities;
    const interestCoverage = incomeStatement.operatingIncome / Math.abs(incomeStatement.interestExpense || 1);
    
    // Valuation
    const peRatio = quote.price / incomeStatement.epsDiluted;
    const earningsYield = (incomeStatement.epsDiluted / quote.price) * 100;
    const priceToFCF = quote.marketCap / cashFlow.freeCashFlow;
    
    return {
        roe, netMargin, grossMargin, sgaMargin,
        debtToEquity, currentRatio, interestCoverage,
        peRatio, earningsYield, priceToFCF
    };
}

function displayProfitabilityAnalysis(metrics) {
    const html = `
        ${createMetricCard('ROE', `${metrics.roe.toFixed(1)}%`, metrics.roe, 20, 15, 10)}
        ${createMetricCard('Marge Nette', `${metrics.netMargin.toFixed(1)}%`, metrics.netMargin, 20, 15, 10)}
        ${createMetricCard('Marge Brute', `${metrics.grossMargin.toFixed(1)}%`, metrics.grossMargin, 50, 40, 30)}
        ${createMetricCard('Marge SG&A', `${metrics.sgaMargin.toFixed(1)}%`, metrics.sgaMargin, 10, 20, 30, true)}
    `;
    document.getElementById('profitabilityAnalysis').innerHTML = html;
}

function displaySafetyAnalysis(metrics) {
    const html = `
        ${createMetricCard('Dette/Equity', metrics.debtToEquity.toFixed(2), metrics.debtToEquity, 0.3, 0.5, 1.0, true)}
        ${createMetricCard('Current Ratio', metrics.currentRatio.toFixed(2), metrics.currentRatio, 2.0, 1.5, 1.0)}
        ${createMetricCard('Couverture Intérêts', metrics.interestCoverage > 1000 ? '∞' : metrics.interestCoverage.toFixed(1) + 'x', 
                          metrics.interestCoverage, 10, 5, 3)}
    `;
    document.getElementById('safetyAnalysis').innerHTML = html;
}

function displayValuationAnalysis(metrics) {
    const html = `
        ${createMetricCard('P/E Ratio', metrics.peRatio.toFixed(1), metrics.peRatio, 10, 15, 25, true)}
        ${createMetricCard('Earnings Yield', `${metrics.earningsYield.toFixed(1)}%`, metrics.earningsYield, 10, 6, 4)}
        ${createMetricCard('Price/FCF', metrics.priceToFCF.toFixed(1), metrics.priceToFCF, 10, 15, 20, true)}
    `;
    document.getElementById('valuationAnalysis').innerHTML = html;
}

function displaySummaryAnalysis(metrics) {
    const scores = calculateScores(metrics);
    const totalScore = scores.excellent * 3 + scores.good * 2 + scores.medium;
    const maxScore = (scores.excellent + scores.good + scores.medium + scores.bad) * 3;
    const percentage = (totalScore / maxScore) * 100;
    
    let rating, ratingClass, recommendation;
    
    if (percentage >= 80) {
        rating = 'EXCELLENT';
        ratingClass = 'summary-excellent';
        recommendation = '✅ Forte recommandation selon les critères Buffett';
    } else if (percentage >= 60) {
        rating = 'BON';
        ratingClass = 'summary-good';
        recommendation = '👍 Bonne opportunité, à surveiller';
    } else if (percentage >= 40) {
        rating = 'MOYEN';
        ratingClass = 'summary-medium';
        recommendation = '⚠️ Opportunité moyenne, nécessite plus d\'analyse';
    } else {
        rating = 'FAIBLE';
        ratingClass = 'summary-bad';
        recommendation = '❌ Ne correspond pas aux critères Buffett';
    }
    
    const html = `
        <div class="summary-box">
            <h3>Score Global: ${percentage.toFixed(0)}%</h3>
            <div class="summary-rating ${ratingClass}">${rating}</div>
            <p><strong>Recommandation:</strong> ${recommendation}</p>
            
            <div class="summary-points">
                <h4>Points Clés:</h4>
                ${getKeyPoints(metrics)}
            </div>
            
            <div class="scores">
                <p>📊 Excellent: ${scores.excellent} | Bon: ${scores.good} | Moyen: ${scores.medium} | Faible: ${scores.bad}</p>
            </div>
        </div>
    `;
    
    document.getElementById('summaryAnalysis').innerHTML = html;
}

function calculateScores(metrics) {
    const scores = { excellent: 0, good: 0, medium: 0, bad: 0 };
    
    // Profitabilité
    scores[getRating(metrics.roe, 20, 15, 10)]++;
    scores[getRating(metrics.netMargin, 20, 15, 10)]++;
    scores[getRating(metrics.grossMargin, 50, 40, 30)]++;
    scores[getRating(metrics.sgaMargin, 10, 20, 30, true)]++;
    
    // Sécurité
    scores[getRating(metrics.debtToEquity, 0.3, 0.5, 1.0, true)]++;
    scores[getRating(metrics.currentRatio, 2.0, 1.5, 1.0)]++;
    scores[getRating(metrics.interestCoverage, 10, 5, 3)]++;
    
    // Valuation
    scores[getRating(metrics.peRatio, 10, 15, 25, true)]++;
    scores[getRating(metrics.earningsYield, 10, 6, 4)]++;
    scores[getRating(metrics.priceToFCF, 10, 15, 20, true)]++;
    
    return scores;
}

function getKeyPoints(metrics) {
    const points = [];
    
    if (metrics.roe > 20) points.push('point-positive ROE exceptionnel (> 20%)');
    else if (metrics.roe < 10) points.push('point-negative ROE faible (< 10%)');
    
    if (metrics.netMargin > 20) points.push('point-positive Forte marge nette (> 20%)');
    
    if (metrics.debtToEquity > 1.0) points.push('point-negative Dette élevée (D/E > 1.0)');
    else if (metrics.debtToEquity < 0.3) points.push('point-positive Faible endettement (D/E < 0.3)');
    
    if (metrics.currentRatio < 1.0) points.push('point-negative Problème de liquidité (Current Ratio < 1.0)');
    
    if (metrics.peRatio < 15) points.push('point-positive Valorisation attractive (P/E < 15)');
    else if (metrics.peRatio > 25) points.push('point-warning Valorisation élevée (P/E > 25)');
    
    if (metrics.earningsYield > 6.5) points.push('point-positive Rendement des bénéfices attractif (> 6.5%)');
    
    return points.map(point => `<div class="point ${point.split(' ')[0]}">${point.substring(12)}</div>`).join('');
}

function createMetricCard(name, value, actual, excellent, good, medium, reverse = false) {
    const rating = getRating(actual, excellent, good, medium, reverse);
    const ratingClass = `rating-${rating}`;
    
    return `
        <div class="metric">
            <div class="metric-header">
                <span class="metric-name">${name}</span>
                <span class="metric-value">${value}</span>
            </div>
            <div class="metric-rating ${ratingClass}">${getRatingText(rating)}</div>
            <div class="metric-details">
                Seuils: Excellent ${reverse ? '<' : '>'} ${excellent} | Bon ${excellent}-${good} | Moyen ${good}-${medium} | Faible ${reverse ? '>' : '<'} ${medium}
            </div>
        </div>
    `;
}

function getRating(actual, excellent, good, medium, reverse = false) {
    if (reverse) {
        if (actual <= excellent) return 'excellent';
        if (actual <= good) return 'good';
        if (actual <= medium) return 'medium';
        return 'bad';
    } else {
        if (actual >= excellent) return 'excellent';
        if (actual >= good) return 'good';
        if (actual >= medium) return 'medium';
        return 'bad';
    }
}

function getRatingText(rating) {
    const texts = {
        'excellent': 'Excellent',
        'good': 'Bon', 
        'medium': 'Moyen',
        'bad': 'Faible'
    };
    return texts[rating];
}

function formatNumber(num) {
    if (!num) return 'N/A';
    if (num >= 1e9) {
        return (num / 1e9).toFixed(2) + 'B';
    } else if (num >= 1e6) {
        return (num / 1e6).toFixed(2) + 'M';
    } else if (num >= 1e3) {
        return (num / 1e3).toFixed(2) + 'K';
    }
    return num.toFixed(2);
}

function showLoading() {
    loading.classList.remove('hidden');
}

function hideLoading() {
    loading.classList.add('hidden');
}

function showError(message) {
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
}

function hideError() {
    errorDiv.classList.add('hidden');
}

function showDataSection() {
    dataSection.classList.remove('hidden');
}

function showAnalysisSection() {
    analysisSection.classList.remove('hidden');
    analysisSection.scrollIntoView({ behavior: 'smooth' });
}

// Initialisation
console.log('Dashboard Buffett initialisé');
