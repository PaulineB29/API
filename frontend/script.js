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

// Templates
const metricCardTemplate = document.getElementById('metricCardTemplate');
const helpIconTemplate = document.getElementById('helpIconTemplate');

// Éléments DOM pour la recherche
const searchResults = document.getElementById('searchResults');

// Éléments recheche societe
const showAllCompaniesBtn = document.getElementById('showAllCompaniesBtn');
const companiesModal = document.getElementById('companiesModal');
const closeModal = document.querySelector('.close-modal');
const modalSearchInput = document.getElementById('modalSearchInput');
const companiesTableBody = document.getElementById('companiesTableBody');
const companiesCount = document.getElementById('companiesCount');

const navTabs = document.querySelectorAll('.nav-tab');
const pages = document.querySelectorAll('.page');

// Navigation entre les pages
function switchPage(pageId) {
    // Mettre à jour les onglets
    navTabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.page === pageId);
    });
    
    // Mettre à jour les pages
    pages.forEach(page => {
        page.classList.toggle('active', page.id === `${pageId}Page`);
    });
}

// Événements de navigation
navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        switchPage(tab.dataset.page);
    });
});

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    // Page par défaut
    switchPage('analysis');
});

//conversion de la recherche en majuscule
document.getElementById('symbolInput').addEventListener('input', function(e) {
    this.value = this.value.toUpperCase();
});

// Données stockées
let currentData = {};
let datePublication = new Date().toISOString().split('T')[0];

// Dictionnaire des définitions des ratios
const ratioDefinitions = {
    roe: {
        name: "ROE (Return on Equity)",
        definition: "Rentabilité des capitaux propres - montre combien l'entreprise gagne avec l'argent des actionnaires",
        calculation: "Bénéfice Net / Capitaux Propres × 100",
        significance: "> 20% = Excellent, > 15% = Bon, < 10% = Faible"
    },
    netMargin: {
        name: "Marge Nette", 
        definition: "Pourcentage du bénéfice dans le chiffre d'affaires",
        calculation: "Bénéfice Net / Chiffre d'Affaires × 100",
        significance: "> 20% = Excellent, > 15% = Bon, < 10% = Faible"
    },
    grossMargin: {
        name: "Marge Brute",
        definition: "Profitabilité après coût des marchandises vendues",
        calculation: "(Chiffre d'Affaires - Coût des Ventes) / Chiffre d'Affaires × 100",
        significance: "> 50% = Excellent, > 40% = Bon, < 30% = Faible"
    },
    sgaMargin: {
        name: "Marge SG&A",
        definition: "Part du chiffre d'affaires consacrée aux frais généraux et administratifs",
        calculation: "Frais Généraux / Chiffre d'Affaires × 100",
        significance: "< 10% = Excellent, < 20% = Bon, > 30% = Faible"
    },
    debtToEquity: {
        name: "Dette/Equity",
        definition: "Niveau d'endettement par rapport aux capitaux propres",
        calculation: "Dette Totale / Capitaux Propres",
        significance: "< 0.3 = Excellent, < 0.5 = Bon, > 1.0 = Faible"
    },
    currentRatio: {
        name: "Current Ratio",
        definition: "Capacité à payer les dettes à court terme",
        calculation: "Actifs Courants / Passifs Courants", 
        significance: "> 2.0 = Excellent, > 1.5 = Bon, < 1.0 = Faible"
    },
    interestCoverage: {
        name: "Couverture d'Intérêts",
        definition: "Capacité à payer les frais financiers avec le résultat opérationnel",
        calculation: "EBIT / Frais Financiers",
        significance: "> 10x = Excellent, > 5x = Bon, < 3x = Faible"
    },
    peRatio: {
        name: "P/E Ratio",
        definition: "Nombre d'années de bénéfices pour payer le prix de l'action",
        calculation: "Prix de l'Action / BPA (EPS)",
        significance: "< 10 = Excellent, < 15 = Bon, > 25 = Faible"
    },
    earningsYield: {
        name: "Earnings Yield", 
        definition: "Rendement des bénéfices pour l'actionnaire",
        calculation: "BPA / Prix de l'Action × 100",
        significance: "> 10% = Excellent, > 6% = Bon, < 4% = Faible"
    },
    priceToFCF: {
        name: "Prix/Free Cash Flow",
        definition: "Valorisation par rapport au cash flow libre généré",
        calculation: "Prix de l'Action / Free Cash Flow par Action",
        significance: "< 10 = Excellent, < 15 = Bon, > 20 = Faible"
    },
    priceToMM200: {
        name: "Prix vs MM200",
        definition: "Position du prix actuel par rapport à la moyenne mobile sur 200 jours",
        calculation: "(Prix Actuel - MM200) / MM200 × 100",
        significance: "> +5% = Hausier, ±5% = Neutre, < -5% = Baissier"
    },
    dividendYield: {
        name: "Rendement Dividende",
        definition: "Revenu annuel du dividende en pourcentage du prix de l'action",
        calculation: "Dividende par Action / Prix de l'Action × 100",
        significance: "> 4% = Élevé, 2-4% = Moyen, < 2% = Faible"
    },
    pbRatio: {
        name: "P/B Ratio",
        definition: "Valorisation par rapport à la valeur comptable",
        calculation: "Prix de l'Action / Valeur Comptable par Action",
        significance: "< 1.5 = Bon, 1.5-3 = Moyen, > 3 = Élevé"
    },
    pegRatio: {
        name: "PEG Ratio",
        definition: "P/E ratio ajusté pour le taux de croissance des bénéfices",
        calculation: "P/E Ratio / Taux de Croissance des Bénéfices",
        significance: "< 1 = Sous-évalué, ≈1 = Juste valeur, > 1 = Surévalué"
    },
    roic: {
        name: "ROIC",
        definition: "Rentabilité du capital investi total",
        calculation: "NOPAT / Capital Investi × 100",
        significance: "> 15% = Excellent, > 10% = Bon, < 8% = Faible"
    },
    freeCashFlow: {
        name: "Free Cash Flow",
        definition: "Cash disponible après les investissements nécessaires",
        calculation: "Cash Flow Opérationnel - Dépenses en Capital",
        significance: "> 0 = Sain, croissance constante = Très bon"
    },
    evToEbitda: {
        name: "EV/EBITDA",
        definition: "Valorisation d'entreprise complète (dette incluse) par rapport à l'EBITDA",
        calculation: "Enterprise Value / EBITDA",
        significance: "< 8 = Bon, 8-12 = Moyen, > 12 = Élevé"
    }
};

// Événements
fetchDataBtn.addEventListener('click', fetchCompanyData);
analyzeBtn.addEventListener('click', performAnalysis);
symbolInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        fetchCompanyData();
    }
});

showAllCompaniesBtn.addEventListener('click', loadAllCompanies);
closeModal.addEventListener('click', hideCompaniesModal);
modalSearchInput.addEventListener('input', filterCompaniesTable);

// Fonctions principales
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
        
        const [profile, quote, cashFlow, incomeStatement, balanceSheet, historicalData] = await Promise.all([
            fetchAPI(`/profile?symbol=${symbol}`),
            fetchAPI(`/quote?symbol=${symbol}`),
            fetchAPI(`/cash-flow-statement?symbol=${symbol}`),
            fetchAPI(`/income-statement?symbol=${symbol}`),
            fetchAPI(`/balance-sheet-statement?symbol=${symbol}`),
            fetchHistoricalData(symbol),
            fetchAPI('/stock-list?') 
        ]);

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
        
        await sauvegarderDonneesFinancieres();
        
    } catch (error) {
        console.error('Erreur détaillée:', error);
        showError(`Erreur: ${error.message}. Vérifiez le symbole et votre connexion.`);
    } finally {
        hideLoading();
    }
}

async function fetchAPI(endpoint) {
    console.log(`Appel API: ${endpoint}`);
    
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${BASE_URL}${endpoint}${separator}apikey=${API_KEY}`;
    
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
    
    if (Array.isArray(data) && data.length === 0) {
        throw new Error('Aucune donnée disponible pour ce symbole');
    }
    
    return data;
}

async function sauvegarderAnalyse(metrics, recommendation) {
    console.log('📤 Préparation de la sauvegarde...', metrics, recommendation);
    
    const analyseData = {
        symbol: currentData.profile.symbol,
        date_analyse: new Date().toISOString().split('T')[0],
        periode: 'FY',
        date_publication: datePublication,
        ...metrics,
        recommandation: recommendation,
        points_forts: getStrengths(metrics),
        points_faibles: getWeaknesses(metrics),
        prix_actuel: currentData.quote.price,
        mm_200: currentData.quote.priceAvg200,
        dividende_action: currentData.profile.lastDividend,
        market_cap: currentData.quote.marketCap,
        tresorerie: currentData.balanceSheet.cashAndCashEquivalents,
        actifs_courants: currentData.balanceSheet.totalCurrentAssets,
        passifs_courants: currentData.balanceSheet.totalCurrentLiabilities,
        dette_totale: currentData.balanceSheet.totalDebt,
        capitaux_propres: currentData.balanceSheet.totalStockholdersEquity,
        net_cash: currentData.balanceSheet.cashAndCashEquivalents - currentData.balanceSheet.totalDebt,
        revenus: currentData.incomeStatement.revenue,
        ebit: currentData.incomeStatement.operatingIncome,
        benefice_net: currentData.incomeStatement.netIncome,
        bpa: currentData.incomeStatement.eps,
        frais_financiers: Math.abs(currentData.incomeStatement.interestExpense || 0),
        ebitda: currentData.incomeStatement.ebitda,
        cash_flow_operationnel: currentData.cashFlow.operatingCashFlow,
        free_cash_flow: currentData.cashFlow.freeCashFlow
    };
    
    console.log('📦 Données à sauvegarder:', analyseData);
    
    try {
        const response = await fetch('https://api-u54u.onrender.com/api/analyses', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(analyseData)
        });
        
        const result = await response.json();
        console.log('📨 Réponse du serveur:', result);
        
        if (result.success) {
            console.log('✅ Analyse sauvegardée en base de données. ID:', result.id);
        } else {
            console.error('❌ Erreur sauvegarde:', result.message);
        }
    } catch (error) {
        console.error('❌ Erreur réseau:', error);
    }
}

async function sauvegarderDonneesFinancieres() {
    console.log('💾 Sauvegarde des données financières brutes...');
    
    const donneesFinancieres = {
        symbol: currentData.profile.symbol,
        date_import: new Date().toISOString().split('T')[0],
        currentPrice: currentData.quote.price,
        movingAverage200: currentData.quote.priceAvg200,
        dividendPerShare: currentData.profile.lastDividend,
        marketCap: currentData.quote.marketCap,
        cashEquivalents: currentData.balanceSheet.cashAndCashEquivalents,
        currentAssets: currentData.balanceSheet.totalCurrentAssets,
        currentLiabilities: currentData.balanceSheet.totalCurrentLiabilities,
        totalDebt: currentData.balanceSheet.totalDebt,
        shareholdersEquity: currentData.balanceSheet.totalStockholdersEquity,
        netCash: currentData.balanceSheet.cashAndCashEquivalents - currentData.balanceSheet.totalDebt,
        revenue: currentData.incomeStatement.revenue,
        ebit: currentData.incomeStatement.operatingIncome,
        netIncome: currentData.incomeStatement.netIncome,
        eps: currentData.incomeStatement.eps,
        interestExpense: Math.abs(currentData.incomeStatement.interestExpense || 0),
        ebitda: currentData.incomeStatement.ebitda,
        operatingCashFlow: currentData.cashFlow.operatingCashFlow,
        freeCashFlow: currentData.cashFlow.freeCashFlow
    };
    
    try {
        const response = await fetch('https://api-u54u.onrender.com/api/analyses/donnees-financieres', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(donneesFinancieres)
        });
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('📨 Réponse sauvegarde données financières:', result);
        
        if (result.success) {
            console.log('✅ Données financières sauvegardées. ID:', result.id);
        }
    } catch (error) {
        console.error('❌ Erreur sauvegarde données financières:', error);
    }
}

// Fonctions d'affichage
function displayBasicData() {
    const { profile, quote, balanceSheet, incomeStatement, cashFlow } = currentData;
    
    document.getElementById('basicData').innerHTML = createBasicDataHTML(profile, quote, incomeStatement);
    document.getElementById('balanceSheetData').innerHTML = createBalanceSheetHTML(balanceSheet);
    document.getElementById('incomeStatementData').innerHTML = createIncomeStatementHTML(incomeStatement);
    document.getElementById('cashFlowData').innerHTML = createCashFlowHTML(cashFlow);
    displayHistoricalData();
}

function createBasicDataHTML(profile, quote, incomeStatement) {
      const publicationDate = incomeStatement?.date || incomeStatement?.filingDate || 'Date non disponible';
      const formattedDate = publicationDate !== 'Date non disponible' ? 
        new Date(publicationDate).toLocaleDateString('fr-FR') : publicationDate;
    
    return `
        <div class="data-item publication-date">
            <span class="data-label">Date de publication:</span>
            <span class="data-value">${formattedDate}</span>
        </div>
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
            <span class="data-label">Capitalisation Boursière:</span>
            <span class="data-value">$${formatNumber(quote.marketCap)}</span>
        </div>
        <div class="data-item">
            <span class="data-label">Secteur:</span>
            <span class="data-value">${profile.sector}</span>
        </div>
    `;
}

function createBalanceSheetHTML(balanceSheet) {
    // Calculer la trésorerie nette
    const cash = balanceSheet.cashAndCashEquivalents || 0;
    const totalDebt = balanceSheet.totalDebt || 0;
    const netCash = cash - totalDebt;
    
    return `
        <div class="data-item">
            <span class="data-label">Trésorerie:</span>
            <span class="data-value">$${formatNumber(balanceSheet.cashAndCashEquivalents)}</span>
        </div>
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
        <div class="data-item">
            <span class="data-label">Trésorerie Nette:</span>
            <span class="data-value">$${formatNumber(balanceSheet.cashAndCashEquivalents - balanceSheet.totalDebt)}</span>
        </div>
    `;
}

function createIncomeStatementHTML(incomeStatement) {
    return `
        <div class="data-item">
            <span class="data-label">Chiffre d'affaires:</span>
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
            <span class="data-label">Bénéfice Par Action:</span>
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
}

function createCashFlowHTML(cashFlow) {
    return `
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
}

async function fetchHistoricalData(symbol) {
    try {
        const historicalData = await fetchAPI(`/income-statement?symbol=${symbol}`);
        return historicalData;
    } catch (error) {
        console.error('Erreur historique:', error);
        return null;
    }
}

function displayHistoricalData() {
    const { historicalData } = currentData;
    
    if (!historicalData || !Array.isArray(historicalData) || historicalData.length === 0) {
        document.getElementById('historicalData').innerHTML = '<p style="color: #7f8c8d;">Aucune donnée historique disponible</p>';
        return;
    }
    
    let html = '';
    const sortedData = [...historicalData].sort((a, b) => new Date(b.date) - new Date(a.date));
    const recentData = sortedData.slice(0, 10);
    
    recentData.forEach((yearData, index) => {
        const year = new Date(yearData.date).getFullYear();
        const revenue = formatNumber(yearData.revenue);
        
        let growthHtml = '';
        if (index < recentData.length - 1) {
            const previousRevenue = recentData[index + 1].revenue;
            if (previousRevenue && previousRevenue > 0) {
                const growth = ((yearData.revenue - previousRevenue) / previousRevenue) * 100;
                const growthColor = growth >= 0 ? '#27ae60' : '#e74c3c';
                const growthSymbol = growth >= 0 ? '↗' : '↘';
                growthHtml = ` <span style="color: ${growthColor}; font-size: 0.9em;">${growthSymbol} ${growth.toFixed(1)}%</span>`;
            }
        }
        
        html += `
            <div class="data-item">
                <span class="data-label">${year}:</span>
                <span class="data-value">$${revenue}${growthHtml}</span>
            </div>
        `;
    });
    
    document.getElementById('historicalData').innerHTML = html;
}

// 📝 MISE À JOUR DE performAnalysis()
function performAnalysis() {
    const { profile } = currentData;
    document.getElementById('companyName').textContent = profile.companyName;
    
    const metrics = calculateMetrics();
    const secteur = profile.sector || 'General';
    
    // ⭐ UTILISER LE NOUVEAU SYSTÈME AVEC SECTEUR
    const advancedScores = calculateAdvancedScores(metrics, secteur);
    const percentage = advancedScores.total;
    
    let recommendation;
    if (percentage >= 80) {
        recommendation = 'EXCELLENT';
    } else if (percentage >= 65) {
        recommendation = 'BON';
    } else if (percentage >= 50) {
        recommendation = 'MOYEN';
    } else {
        recommendation = 'FAIBLE';
    }
    
    displaySummaryAnalysis(metrics, recommendation, advancedScores);
    showAnalysisSection();
    
    console.log('💾 Tentative de sauvegarde...');
    sauvegarderAnalyse(metrics, recommendation);
}

function safeDivision(numerator, denominator, fallback = 0) {
    return denominator && denominator !== 0 ? numerator / denominator : fallback;
}

function calculateMetrics() {
    const { profile, quote, balanceSheet, incomeStatement, cashFlow } = currentData;
    
    // Protection contre les divisions par zéro
    const revenue = incomeStatement.revenue || 1;
    const equity = balanceSheet.totalStockholdersEquity || 1;
    const currentLiabilities = balanceSheet.totalCurrentLiabilities || 1;
    const interestExpense = Math.abs(incomeStatement.interestExpense) || 1;
    const eps = incomeStatement.epsDiluted || 1;
    const shares = incomeStatement.weightedAverageShsOut || 1;
    
    // Profitabilité avec safe division
    const roe = safeDivision(incomeStatement.netIncome, equity) * 100;
    const netMargin = safeDivision(incomeStatement.netIncome, revenue) * 100;
    const grossMargin = safeDivision(
        revenue - (incomeStatement.costOfRevenue || 0), 
        revenue
    ) * 100;
    
    const sgaExpense = incomeStatement.sellingGeneralAndAdministrativeExpenses || 0;
    const sgaMargin = safeDivision(sgaExpense, revenue) * 100;
    
    // Sécurité financière
    const debtToEquity = safeDivision(balanceSheet.totalLiabilities, equity);
    const currentRatio = safeDivision(balanceSheet.totalCurrentAssets, currentLiabilities);
    const interestCoverage = safeDivision(incomeStatement.operatingIncome, interestExpense);
    
    // Valuation
    const peRatio = safeDivision(quote.price, eps);
    const earningsYield = safeDivision(eps, quote.price) * 100;
    const priceToFCF = safeDivision(quote.marketCap, cashFlow.freeCashFlow);
    const priceToMM200 = safeDivision(
        quote.price - quote.priceAvg200, 
        quote.priceAvg200
    ) * 100;
    
    const dividendYield = safeDivision(profile.lastDividend, quote.price) * 100;
    const bookValuePerShare = safeDivision(equity, shares);
    const pbRatio = safeDivision(quote.price, bookValuePerShare);
    
    // ROIC amélioré
    const taxRate = safeDivision(
        incomeStatement.incomeTaxExpense, 
        incomeStatement.incomeBeforeTax
    );
    const nopat = incomeStatement.operatingIncome * (1 - taxRate);
    const investedCapital = (balanceSheet.totalDebt || 0) + equity;
    const roic = safeDivision(nopat, investedCapital) * 100;
    
    // EV/EBITDA sécurisé
    const enterpriseValue = quote.marketCap + 
                          (balanceSheet.totalDebt || 0) - 
                          (balanceSheet.cashAndCashEquivalents || 0);
    const evToEbitda = safeDivision(enterpriseValue, incomeStatement.ebitda);
    
    // PEG ratio avec croissance estimée sécurisée
    const estimatedGrowth = Math.max(5, Math.min(roic, 25)); // Entre 5% et 25%
    const pegRatio = safeDivision(peRatio, estimatedGrowth);

    return {
        roe, netMargin, grossMargin, sgaMargin,
        debtToEquity, currentRatio, interestCoverage,
        peRatio, earningsYield, priceToFCF,
        priceToMM200, dividendYield, pbRatio, pegRatio,
        roic, freeCashFlow: cashFlow.freeCashFlow, evToEbitda
    };
}

// 🆕 MISE À JOUR DE displaySummaryAnalysis()
function displaySummaryAnalysis(metrics, recommendation, advancedScores) {
    const percentage = advancedScores.total;
    const secteur = advancedScores.sector || 'General';
    
    let rating, ratingClass, details;
    
    if (percentage >= 80) {
        rating = 'EXCELLENT';
        ratingClass = 'summary-excellent';
        details = 'Entreprise de haute qualité avec valorisation attractive';
    } else if (percentage >= 65) {
        rating = 'BON';
        ratingClass = 'summary-good';
        details = 'Solide fondamentaux mais valorisation à surveiller';
    } else if (percentage >= 50) {
        rating = 'MOYEN';
        ratingClass = 'summary-medium';
        details = 'Points forts et faibles équilibrés';
    } else {
        rating = 'FAIBLE';
        ratingClass = 'summary-bad';
        details = 'Problèmes significatifs détectés';
    }
    
    // Ajouter la note sectorielle
    if (advancedScores.adjustments) {
        const sectorNote = getSectorNote(advancedScores.adjustments);
        if (sectorNote) {
            details += ` | ${sectorNote}`;
        }
    }
    
    const categoryAnalysis = analyzeByCategoryAdvanced(metrics, advancedScores);
    
    const summaryHTML = createSummaryHTML(percentage, rating, ratingClass, details, recommendation, categoryAnalysis, metrics, secteur);
    document.getElementById('summaryAnalysis').innerHTML = summaryHTML;
}

function getSectorNote(adjustments) {
    const notes = [];
    if (adjustments.valuation?.description) notes.push(adjustments.valuation.description);
    if (adjustments.safety?.description) notes.push(adjustments.safety.description);
    return notes.join(', ');
}

function analyzeByCategoryAdvanced(metrics, advancedScores) {
    return {
        profitability: {
            score: advancedScores.categories.profitability,
            rating: getCategoryRating(advancedScores.categories.profitability >= 80),
            strengths: getProfitabilityStrengths(metrics),
            concerns: getProfitabilityConcerns(metrics)
        },
        safety: {
            score: advancedScores.categories.safety,
            rating: getCategoryRating(advancedScores.categories.safety >= 80),
            strengths: getSafetyStrengths(metrics),
            concerns: getSafetyConcerns(metrics)
        },
        valuation: {
            score: advancedScores.categories.valuation,
            rating: getCategoryRating(advancedScores.categories.valuation >= 80),
            strengths: getValuationStrengths(metrics),
            concerns: getValuationConcerns(metrics)
        }
    };
}

function calculateSafetyScore(metrics, secteur = 'General') {
    const sectorAdjustments = getSectorAdjustments(secteur);
    
    const factors = [
        { 
            value: metrics.debtToEquity, 
            weight: 0.4, 
            excellent: sectorAdjustments.debtToEquity?.excellent || 0.3, 
            good: sectorAdjustments.debtToEquity?.good || 0.5, 
            medium: sectorAdjustments.debtToEquity?.medium || 1.0, 
            reverse: true 
        },
        { 
            value: metrics.currentRatio, 
            weight: 0.3, 
            excellent: sectorAdjustments.currentRatio?.excellent || 2.0, 
            good: sectorAdjustments.currentRatio?.good || 1.5, 
            medium: sectorAdjustments.currentRatio?.medium || 1.0 
        },
        { 
            value: metrics.interestCoverage, 
            weight: 0.3, 
            excellent: 10, 
            good: 5, 
            medium: 3 
        }
    ];
    
    return calculateWeightedScore(factors);
}


// 🎯 FONCTIONS DE SCORING AVEC SEUILS SECTORIELS
function calculateValuationScore(metrics, secteur = 'General') {
    const sectorAdjustments = getSectorAdjustments(secteur);
    
    const factors = [
        { 
            value: metrics.peRatio, 
            weight: 0.25, 
            excellent: sectorAdjustments.peRatio?.excellent || 10, 
            good: sectorAdjustments.peRatio?.good || 15, 
            medium: sectorAdjustments.peRatio?.medium || 25, 
            reverse: true 
        },
        { 
            value: metrics.earningsYield, 
            weight: 0.25, 
            excellent: sectorAdjustments.earningsYield?.excellent || 10, 
            good: sectorAdjustments.earningsYield?.good || 6, 
            medium: sectorAdjustments.earningsYield?.medium || 4 
        },
        { 
            value: metrics.priceToFCF, 
            weight: 0.20, 
            excellent: sectorAdjustments.priceToFCF?.excellent || 10, 
            good: sectorAdjustments.priceToFCF?.good || 15, 
            medium: sectorAdjustments.priceToFCF?.medium || 20, 
            reverse: true 
        },
        { 
            value: metrics.pbRatio, 
            weight: 0.15, 
            excellent: sectorAdjustments.pbRatio?.excellent || 1.5, 
            good: sectorAdjustments.pbRatio?.good || 3, 
            medium: sectorAdjustments.pbRatio?.medium || 5, 
            reverse: true 
        },
        { 
            value: metrics.evToEbitda, 
            weight: 0.15, 
            excellent: sectorAdjustments.evToEbitda?.excellent || 8, 
            good: sectorAdjustments.evToEbitda?.good || 12, 
            medium: sectorAdjustments.evToEbitda?.medium || 15, 
            reverse: true 
        }
    ];
    
    return calculateWeightedScore(factors);
}


function calculateWeightedScore(factors) {
    let totalScore = 0;
    let totalWeight = 0;
    
    factors.forEach(factor => {
        const rating = getRating(
            factor.value, 
            factor.excellent, 
            factor.good, 
            factor.medium || factor.good * 0.7, // Valeur moyenne par défaut
            factor.reverse || false
        );
        
        const scoreValue = getScoreValue(rating);
        totalScore += scoreValue * factor.weight;
        totalWeight += factor.weight;
    });
    
    return Math.round((totalScore / totalWeight) * 100);
}

function getScoreValue(rating) {
    const values = {
        'excellent': 1.0,
        'good': 0.75, 
        'medium': 0.5,
        'bad': 0.25
    };
    return values[rating] || 0;
}

function calculateAdvancedScores(metrics, secteur) {
    const categoryWeights = {
        profitability: 0.35,
        safety: 0.35, 
        valuation: 0.30
    };
    
    let categoryScores = {
        profitability: calculateProfitabilityScore(metrics),
        safety: calculateSafetyScore(metrics),
        valuation: calculateValuationScore(metrics)
    };
    
    // APPLIQUER LES BONUS/MALUS SECTORIELS
    const sectorAdjustments = getSectorAdjustments(secteur);
    categoryScores = applySectorAdjustments(categoryScores, sectorAdjustments);
    
    // Score global pondéré
    const totalScore = Object.entries(categoryScores).reduce((total, [category, score]) => {
        return total + (score * categoryWeights[category]);
    }, 0);
    
    return {
        total: Math.round(totalScore),
        categories: categoryScores,
        breakdown: getScoreBreakdown(metrics),
        sector: secteur,
        adjustments: sectorAdjustments
    };
}

// 🎯 CONFIGURATION DES SECTEURS
function getSectorAdjustments(secteur) {
    const sectorConfig = {
        'Technology': {
            valuation: { bonus: 15, description: 'Valorisation tech premium acceptée' },
            profitability: { bonus: 5, description: 'Croissance élevée récompensée' },
            peRatio: { excellent: 25, good: 35, medium: 45 },
            priceToFCF: { excellent: 25, good: 35, medium: 50 },
            evToEbitda: { excellent: 15, good: 20, medium: 25 }
        },
        'Healthcare': {
            valuation: { bonus: 10, description: 'Valorisation pharma/healthcare' },
            safety: { bonus: 5, description: 'Secteur défensif' },
            peRatio: { excellent: 20, good: 30, medium: 40 },
            priceToFCF: { excellent: 20, good: 30, medium: 40 },
            debtToEquity: { excellent: 0.4, good: 0.7, medium: 1.0 }
        },
        'Financial Services': {
            valuation: { bonus: 0, description: 'Valorisation standard' },
            safety: { malus: -10, description: 'Dette structurelle du secteur' },
            profitability: { bonus: 0, description: 'ROE élevé attendu' },
            peRatio: { excellent: 8, good: 12, medium: 18 },
            pbRatio: { excellent: 0.8, good: 1.2, medium: 1.8 },
            debtToEquity: { excellent: 2.0, good: 4.0, medium: 6.0 } // Plus tolérant
        },
        'Energy': {
            valuation: { bonus: 5, description: 'Secteur cyclique' },
            safety: { malus: -5, description: 'Volatilité des prix' },
            peRatio: { excellent: 8, good: 12, medium: 18 },
            evToEbitda: { excellent: 4, good: 6, medium: 8 },
            currentRatio: { excellent: 1.2, good: 1.0, medium: 0.8 } // Plus flexible
        },
        'Utilities': {
            valuation: { bonus: 8, description: 'Secteur défensif' },
            safety: { bonus: 5, description: 'Cash flows stables' },
            profitability: { malus: -5, description: 'ROE modéré normal' },
            peRatio: { excellent: 15, good: 20, medium: 25 },
            earningsYield: { excellent: 8, good: 5, medium: 4 },
            debtToEquity: { excellent: 0.8, good: 1.2, medium: 1.8 } // Dette acceptée
        },
        'Consumer Defensive': {
            valuation: { bonus: 5, description: 'Secteur défensif' },
            safety: { bonus: 8, description: 'Revenus stables' },
            peRatio: { excellent: 18, good: 25, medium: 30 },
            netMargin: { excellent: 12, good: 8, medium: 5 } // Marges plus faibles acceptées
        },
        'Consumer Cyclical': {
            valuation: { bonus: 0, description: 'Secteur cyclique' },
            safety: { malus: -8, description: 'Sensibilité économique' },
            peRatio: { excellent: 12, good: 18, medium: 25 },
            currentRatio: { excellent: 1.5, good: 1.2, medium: 0.9 }
        },
        'Industrials': {
            valuation: { bonus: 0, description: 'Secteur traditionnel' },
            safety: { bonus: 0, description: 'Standard' },
            peRatio: { excellent: 15, good: 20, medium: 28 },
            debtToEquity: { excellent: 0.4, good: 0.7, medium: 1.2 }
        },
        'Real Estate': {
            valuation: { bonus: 5, description: 'Valorisation immobilier' },
            safety: { malus: -5, description: 'Secteur endetté' },
            profitability: { malus: -10, description: 'ROE faible normal' },
            peRatio: { excellent: 12, good: 18, medium: 25 },
            debtToEquity: { excellent: 1.0, good: 1.5, medium: 2.5 }, // Dette élevée acceptée
            currentRatio: { excellent: 1.0, good: 0.8, medium: 0.6 } // Liquidité réduite
        },
        'Basic Materials': {
            valuation: { bonus: 0, description: 'Secteur cyclique' },
            safety: { malus: -5, description: 'Volatilité matières premières' },
            peRatio: { excellent: 10, good: 15, medium: 22 },
            evToEbitda: { excellent: 6, good: 9, medium: 12 }
        },
        'Communication Services': {
            valuation: { bonus: 10, description: 'Croissance digitale' },
            profitability: { bonus: 5, description: 'Économies d échelle' },
            peRatio: { excellent: 18, good: 25, medium: 35 },
            priceToFCF: { excellent: 15, good: 25, medium: 35 }
        }
    };
    
    return sectorConfig[secteur] || {
        valuation: { bonus: 0, description: 'Secteur non spécifique' },
        safety: { bonus: 0, description: 'Standards généraux' },
        profitability: { bonus: 0, description: 'Standards généraux' }
    };
}

// 🔧 APPLICATION DES AJUSTEMENTS
function applySectorAdjustments(categoryScores, adjustments) {
    const adjustedScores = { ...categoryScores };
    
    // Appliquer les bonus/malus par catégorie
    Object.keys(adjustedScores).forEach(category => {
        if (adjustments[category]) {
            const adjustment = adjustments[category].bonus || adjustments[category].malus || 0;
            adjustedScores[category] = Math.max(0, Math.min(100, adjustedScores[category] + adjustment));
        }
    });
    
    return adjustedScores;
}


function calculateProfitabilityScore(metrics, secteur = 'General') {
    const sectorAdjustments = getSectorAdjustments(secteur);
    
    const factors = [
        { 
            value: metrics.roe, 
            weight: 0.3, 
            excellent: 20, 
            good: 15, 
            medium: 10 
        },
        { 
            value: metrics.netMargin, 
            weight: 0.25, 
            excellent: sectorAdjustments.netMargin?.excellent || 20, 
            good: sectorAdjustments.netMargin?.good || 15, 
            medium: sectorAdjustments.netMargin?.medium || 10 
        },
        { 
            value: metrics.roic, 
            weight: 0.25, 
            excellent: 15, 
            good: 10, 
            medium: 8 
        },
        { 
            value: metrics.grossMargin, 
            weight: 0.2, 
            excellent: 50, 
            good: 40, 
            medium: 30 
        }
    ];
    
    return calculateWeightedScore(factors);
}

function getScoreBreakdown(metrics) {
    return {
        roe: getRating(metrics.roe, 20, 15, 10),
        netMargin: getRating(metrics.netMargin, 20, 15, 10),
        debtToEquity: getRating(metrics.debtToEquity, 0.3, 0.5, 1.0, true),
        currentRatio: getRating(metrics.currentRatio, 2.0, 1.5, 1.0),
        peRatio: getRating(metrics.peRatio, 10, 15, 25, true)
    };
}

function getProfitabilityStrengths(metrics) {
    const strengths = [];
    if (metrics.roe > 20) strengths.push('ROE exceptionnel (>20%)');
    if (metrics.netMargin > 20) strengths.push('Forte marge nette (>20%)');
    if (metrics.roic > 15) strengths.push('ROIC excellent (>15%)');
    if (metrics.grossMargin > 50) strengths.push('Marge brute élevée (>50%)');
    return strengths.length > 0 ? strengths : ['Rentabilité standard'];
}

function getProfitabilityConcerns(metrics) {
    const concerns = [];
    if (metrics.roe < 10) concerns.push('ROE faible (<10%)');
    if (metrics.netMargin < 10) concerns.push('Marge nette faible (<10%)');
    if (metrics.roic < 8) concerns.push('ROIC insuffisant (<8%)');
    return concerns;
}

function getSafetyStrengths(metrics) {
    const strengths = [];
    if (metrics.debtToEquity < 0.3) strengths.push('Faible endettement (<0.3)');
    if (metrics.currentRatio > 2.0) strengths.push('Excellente liquidité (>2.0)');
    if (metrics.interestCoverage > 10) strengths.push('Couverture intérêts solide (>10x)');
    return strengths.length > 0 ? strengths : ['Solidité financière standard'];
}

function getSafetyConcerns(metrics) {
    const concerns = [];
    if (metrics.debtToEquity > 1.0) concerns.push('Dette élevée (>1.0)');
    if (metrics.currentRatio < 1.0) concerns.push('Problème de liquidité (<1.0)');
    if (metrics.interestCoverage < 3) concerns.push('Couverture intérêts faible (<3x)');
    return concerns;
}

function getValuationStrengths(metrics) {
    const strengths = [];
    if (metrics.peRatio < 15) strengths.push('PER attractif (<15)');
    if (metrics.earningsYield > 8) strengths.push('Rendement bénéfices élevé (>8%)');
    if (metrics.priceToFCF < 15) strengths.push('Cash flow bien valorisé (<15)');
    if (metrics.priceToMM200 > 5) strengths.push('Tendance haussière vs MM200');
    return strengths.length > 0 ? strengths : ['Valorisation raisonnable'];
}

function getValuationConcerns(metrics) {
    const concerns = [];
    if (metrics.peRatio > 25) concerns.push('PER élevé (>25)');
    if (metrics.earningsYield < 4) concerns.push('Rendement bénéfices faible (<4%)');
    if (metrics.priceToFCF > 20) concerns.push('Cash flow cher (>20)');
    if (metrics.priceToMM200 < -5) concerns.push('Tendance baissière vs MM200');
    return concerns;
}

function createSummaryHTML(percentage, rating, ratingClass, details, recommendation, categoryAnalysis, metrics) {
    return `
        <div class="analysis-container">
            <!-- SCORE GLOBAL -->
            <div class="global-score-modern">
                <div class="score-main-modern">
                    <div class="score-value-modern">${percentage.toFixed(0)}%</div>
                    <div class="score-label-modern">Score</div>
                </div>
                
                <div class="rating-badge-modern ${ratingClass}">${rating}</div>
                
                <div class="score-details-modern">
                    <div class="details-text-modern">${details}</div>
                </div>
            </div>
            <div class="context-note">
                ${percentage < 70 ? '💡 Conseil: ' + getInvestmentAdvice(metrics, categoryAnalysis) : ''}
            </div>
            <!-- PROFITABILITE -->
            <div class="compact-section">
                <div class="section-header" onclick="toggleSection('profitability')">
                    <span>📈 Profitabilité</span>
                    <span class="section-score ${categoryAnalysis.profitability.rating}">
                        ${categoryAnalysis.profitability.score}%
                    </span>
                </div>
                <div class="section-content" id="profitability">
                    <div class="metrics-grid">
                        ${createMetricCard({
                            key: 'roe', 
                            name: 'ROE', 
                            value: `${metrics.roe?.toFixed(1) || 'N/A'}%`, 
                            actual: metrics.roe || 0, 
                            excellent: 20, 
                            good: 15, 
                            medium: 10, 
                            reverse: false
                        })}
                        ${createMetricCard({
                            key: 'netMargin', 
                            name: 'Marge Nette', 
                            value: `${metrics.netMargin?.toFixed(1) || 'N/A'}%`, 
                            actual: metrics.netMargin || 0, 
                            excellent: 20, 
                            good: 15, 
                            medium: 10, 
                            reverse: false
                        })}
                        ${createMetricCard({
                            key: 'grossMargin', 
                            name: 'Marge Brute', 
                            value: `${metrics.grossMargin?.toFixed(1) || 'N/A'}%`, 
                            actual: metrics.grossMargin || 0, 
                            excellent: 50, 
                            good: 40, 
                            medium: 30, 
                            reverse: false
                        })}
                        ${createMetricCard({
                            key: 'roic', 
                            name: 'ROIC', 
                            value: `${metrics.roic?.toFixed(1) || 'N/A'}%`, 
                            actual: metrics.roic || 0, 
                            excellent: 15, 
                            good: 10, 
                            medium: 8, 
                            reverse: false
                        })}
                    </div>
                </div>
            </div>

            <!-- SECURITE -->
            <div class="compact-section">
                <div class="section-header" onclick="toggleSection('safety')">
                    <span>🛡️ Sécurité Financière</span>
                    <span class="section-score ${categoryAnalysis.safety.rating}">
                        ${categoryAnalysis.safety.score}%
                    </span>
                </div>
                <div class="section-content" id="safety">
                    <div class="metrics-grid">
                        ${createMetricCard({
                            key: 'debtToEquity', 
                            name: 'Dette/Equity', 
                            value: metrics.debtToEquity?.toFixed(2) || 'N/A', 
                            actual: metrics.debtToEquity || 0, 
                            excellent: 0.3, 
                            good: 0.5, 
                            medium: 1.0, 
                            reverse: true
                        })}
                        ${createMetricCard({
                            key: 'currentRatio', 
                            name: 'Current Ratio', 
                            value: metrics.currentRatio?.toFixed(2) || 'N/A', 
                            actual: metrics.currentRatio || 0, 
                            excellent: 2.0, 
                            good: 1.5, 
                            medium: 1.0, 
                            reverse: false
                        })}
                        ${createMetricCard({
                            key: 'interestCoverage', 
                            name: 'Couverture Intérêts', 
                            value: metrics.interestCoverage > 1000 ? '∞' : (metrics.interestCoverage?.toFixed(1) || 'N/A') + 'x', 
                            actual: metrics.interestCoverage || 0, 
                            excellent: 10, 
                            good: 5, 
                            medium: 3, 
                            reverse: false
                        })}
                    </div>
                </div>
            </div>

            <!-- VALORISATION -->
            <div class="compact-section">
                <div class="section-header" onclick="toggleSection('valuation')">
                    <span>💰 Valorisation</span>
                    <span class="section-score ${categoryAnalysis.valuation.rating}">
                        ${categoryAnalysis.valuation.score}%
                    </span>
                </div>
                <div class="section-content" id="valuation">
                    <div class="metrics-grid">
                        ${createMetricCard({
                            key: 'peRatio', 
                            name: 'P/E Ratio', 
                            value: metrics.peRatio?.toFixed(1) || 'N/A', 
                            actual: metrics.peRatio || 0, 
                            excellent: 10, 
                            good: 15, 
                            medium: 25, 
                            reverse: true
                        })}
                        ${createMetricCard({
                            key: 'earningsYield', 
                            name: 'Earnings Yield', 
                            value: `${metrics.earningsYield?.toFixed(1) || 'N/A'}%`, 
                            actual: metrics.earningsYield || 0, 
                            excellent: 10, 
                            good: 6, 
                            medium: 4, 
                            reverse: false
                        })}
                        ${createMetricCard({
                            key: 'priceToFCF', 
                            name: 'Price/FCF', 
                            value: metrics.priceToFCF?.toFixed(1) || 'N/A', 
                            actual: metrics.priceToFCF || 0, 
                            excellent: 10, 
                            good: 15, 
                            medium: 20, 
                            reverse: true
                        })}
                        ${createMetricCard({
                            key: 'priceToMM200', 
                            name: 'Prix vs MM200', 
                            value: `${metrics.priceToMM200?.toFixed(1) || 'N/A'}%`, 
                            actual: metrics.priceToMM200 || 0, 
                            excellent: 5, 
                            good: 0, 
                            medium: -5, 
                            reverse: false
                        })}
                    </div>
                </div>
            </div>

            <!-- POINTS CLES -->
            <div class="compact-section">
                <div class="section-header" onclick="toggleSection('keypoints')">
                    <span>🎯 Points Clés</span>
                </div>
                <div class="section-content" id="keypoints">
                    <div class="keypoints-grid">
                        <div>
                            <h4 class="points-title positive">✅ Points Forts</h4>
                            ${getStrengths(metrics).map(strength => 
                                `<div class="analysis-point positive">${strength}</div>`
                            ).join('')}
                        </div>
                        <div>
                            <h4 class="points-title warning">⚠️ Points Faibles</h4>
                            ${getWeaknesses(metrics).map(weakness => 
                                `<div class="analysis-point warning">${weakness}</div>`
                            ).join('')}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Cache toutes les données pour la recherche
let allCompaniesData = [];

function getInvestmentAdvice(metrics, categoryAnalysis) {
    if (categoryAnalysis.profitability.score >= 80 && categoryAnalysis.valuation.score < 40) {
        return "Entreprise excellente mais attendre un meilleur prix d'entrée";
    }
    if (categoryAnalysis.valuation.score >= 60 && categoryAnalysis.profitability.score < 60) {
        return "Valorisation attractive mais profitabilité à surveiller";
    }
    return "Analyse équilibrée - convient pour un investissement progressif";
}

// Charger toutes les entreprises
async function loadAllCompanies() {
    showLoading();
    companiesModal.classList.remove('hidden');
    
    try {
        console.log('Chargement de toutes les entreprises...');
        
        // Utiliser l'endpoint stock-screener qui est disponible
        const companies = await fetchAPI('/stock-list?');
        
        console.log('Données reçues:', companies);
        
        if (!companies || companies.length === 0) {
            companiesTableBody.innerHTML = '<tr><td colspan="2">Aucune entreprise trouvée</td></tr>';
            companiesCount.textContent = '0 entreprises';
            return;
        }

        allCompaniesData = companies;
        displayCompaniesTable(companies);
        
    } catch (error) {
        console.error('Erreur chargement entreprises:', error);
        
        // Message d'erreur propre sans données de test
        companiesTableBody.innerHTML = `
            <tr>
                <td colspan="2" style="text-align: center; color: #e74c3c;">
                    ❌ Erreur de chargement: ${error.message}<br>
                    <small>Vérifiez votre connexion et votre clé API</small>
                </td>
            </tr>
        `;
        companiesCount.textContent = 'Erreur';
    } finally {
        hideLoading();
    }
}

// Afficher le tableau
function displayCompaniesTable(companies) {
    if (!companies || !Array.isArray(companies)) {
        companiesTableBody.innerHTML = '<tr><td colspan="2">Données invalides</td></tr>';
        return;
    }
// Trier par symbole pour une meilleure lisibilité
    const sortedCompanies = companies.sort((a, b) => a.symbol.localeCompare(b.symbol));

    const html = sortedCompanies.map(company => {
        if (!company || !company.symbol) return '';
        
        const symbol = company.symbol;
        const name = company.companyName || company.name || 'Nom non disponible';
        const safeName = String(name).replace(/'/g, "\\'").replace(/"/g, '\\"');
        
        return `
            <tr onclick="selectCompanyFromTable('${symbol}', '${safeName}')" 
                style="cursor: pointer; transition: background-color 0.2s;">
                <td><strong>${symbol}</strong></td>
                <td>${name}</td>
            </tr>
        `;
    }).join('');

    companiesTableBody.innerHTML = html;
    companiesCount.textContent = `${sortedCompanies.length} entreprises`;
    
    console.log(`Tableau affiché avec ${sortedCompanies.length} entreprises`);
}

// Filtrer le tableau
function filterCompaniesTable() {
    const searchTerm = modalSearchInput.value.toLowerCase().trim();
    
    if (!searchTerm) {
        displayCompaniesTable(allCompaniesData);
        return;
    }

    const filtered = allCompaniesData.filter(company => 
        company.symbol.toLowerCase().includes(searchTerm) ||
        (company.companyName && company.companyName.toLowerCase().includes(searchTerm))
    );

    displayCompaniesTable(filtered);
}

// Sélectionner une entreprise depuis le tableau
function selectCompanyFromTable(symbol, companyName) {
    symbolInput.value = symbol;
    hideCompaniesModal();
    
    // Optionnel: lancer la recherche automatiquement
    fetchCompanyData();
}

function hideCompaniesModal() {
    companiesModal.classList.add('hidden');
    modalSearchInput.value = '';
    allCompaniesData = [];
}

// Fonctions utilitaires
function createMetricCard({ key, name, value, actual, excellent, good, medium, reverse = false }) {
    const rating = getRating(actual, excellent, good, medium, reverse);
    const ratingClass = `rating-${rating}`;
    const helpIcon = createHelpIcon(key);
    const scoreWidth = calculateScoreWidth(actual, excellent, good, medium, reverse);
    const thresholdsText = getThresholdsText(excellent, good, medium, reverse);
    
    const metricCard = metricCardTemplate.content.cloneNode(true);
    const metricElement = metricCard.querySelector('.metric');
    
    metricElement.querySelector('.metric-name').innerHTML = name + helpIcon;
    metricElement.querySelector('.metric-value').textContent = value;
    metricElement.querySelector('.metric-rating').textContent = getRatingText(rating);
    metricElement.querySelector('.metric-rating').className = `metric-rating ${ratingClass}`;
    metricElement.querySelector('.score-fill').style.width = `${scoreWidth}%`;
    metricElement.querySelector('.score-fill').className = `score-fill ${ratingClass}`;
    metricElement.querySelector('.metric-details').textContent = `Seuils: ${thresholdsText}`;
    
    return metricElement.outerHTML;
}

function createHelpIcon(ratioKey) {
    const definition = ratioDefinitions[ratioKey];
    if (!definition) return '';
    
    const helpIcon = helpIconTemplate.content.cloneNode(true);
    const helpIconElement = helpIcon.querySelector('.help-icon');
        
    const definitionEl = helpIconElement.querySelector('.definition');
    const calculationEl = helpIconElement.querySelector('.calculation');
    
    if (definitionEl) {
        definitionEl.textContent = definition.definition;
    }
    
    if (calculationEl) {
        calculationEl.textContent = definition.calculation;
    }
    return helpIconElement.outerHTML;
}


function getStrengths(metrics) {
    const strengths = [];
    if (metrics.roe > 20) strengths.push('ROE exceptionnel');
    if (metrics.netMargin > 20) strengths.push('Forte marge nette');
    if (metrics.roic > 15) strengths.push('ROIC excellent');
    if (metrics.interestCoverage > 10) strengths.push('Bonne couverture intérêts');
    return strengths;
}

function getWeaknesses(metrics) {
    const weaknesses = [];
    if (metrics.debtToEquity > 1.0) weaknesses.push('Dette élevée');
    if (metrics.currentRatio < 1.0) weaknesses.push('Problème liquidité');
    if (metrics.peRatio > 25) weaknesses.push('Valorisation élevée');
    if (metrics.dividendYield < 2) weaknesses.push('Dividende faible');
    return weaknesses;
}


function getCategoryRating(isExcellent) {
    return isExcellent ? 'excellent' : 'good';
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

function calculateScoreWidth(actual, excellent, good, medium, reverse) {
    if (reverse) {
        if (actual <= excellent) return 100;
        if (actual <= good) return 75;
        if (actual <= medium) return 50;
        return 25;
    } else {
        if (actual >= excellent) return 100;
        if (actual >= good) return 75;
        if (actual >= medium) return 50;
        return 25;
    }
}

function getThresholdsText(excellent, good, medium, reverse) {
    if (reverse) {
        return `Excellent < ${excellent} | Bon ${excellent}-${good} | Moyen ${good}-${medium} | Faible > ${medium}`;
    } else {
        return `Excellent > ${excellent} | Bon ${excellent}-${good} | Moyen ${good}-${medium} | Faible < ${medium}`;
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

function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section.classList.contains('active')) {
        section.classList.remove('active');
    } else {
        section.classList.add('active');
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.section-content').forEach(section => {
        section.classList.remove('active');
    });
});

console.log('Dashboard initialisé');
