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
const companySearchInput = document.getElementById('companySearchInput');
const searchCompanyBtn = document.getElementById('searchCompanyBtn');
const searchResults = document.getElementById('searchResults');

// Éléments recheche societe
const showAllCompaniesBtn = document.getElementById('showAllCompaniesBtn');
const companiesModal = document.getElementById('companiesModal');
const closeModal = document.querySelector('.close-modal');
const modalSearchInput = document.getElementById('modalSearchInput');
const companiesTableBody = document.getElementById('companiesTableBody');
const companiesCount = document.getElementById('companiesCount');


// Données stockées
let currentData = {};

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

searchCompanyBtn.addEventListener('click', searchCompany);
companySearchInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') searchCompany();
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
            fetchHistoricalData(symbol)
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
    
    document.getElementById('basicData').innerHTML = createBasicDataHTML(profile, quote);
    document.getElementById('balanceSheetData').innerHTML = createBalanceSheetHTML(balanceSheet);
    document.getElementById('incomeStatementData').innerHTML = createIncomeStatementHTML(incomeStatement);
    document.getElementById('cashFlowData').innerHTML = createCashFlowHTML(cashFlow);
    displayHistoricalData();
}

function createBasicDataHTML(profile, quote) {
    return `
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

function performAnalysis() {
    const { profile } = currentData;
    document.getElementById('companyName').textContent = profile.companyName;
    
    const metrics = calculateMetrics();
    const scores = calculateScores(metrics);
    const totalScore = scores.excellent * 3 + scores.good * 2 + scores.medium;
    const maxScore = (scores.excellent + scores.good + scores.medium + scores.bad) * 3;
    const percentage = (totalScore / maxScore) * 100;
    
    let recommendation;
    if (percentage >= 75) {
        recommendation = 'EXCELLENT';
    } else if (percentage >= 60) {
        recommendation = 'BON';
    } else if (percentage >= 45) {
        recommendation = 'MOYEN';
    } else {
        recommendation = 'FAIBLE';
    }
    
    displaySummaryAnalysis(metrics, recommendation);
    showAnalysisSection();
    
    console.log('💾 Tentative de sauvegarde...');
    sauvegarderAnalyse(metrics, recommendation);
}
// Fonction de recherche d'entreprise
async function searchCompany() {
    const query = companySearchInput.value.trim();
    
    if (!query) {
        showError('Veuillez entrer un nom d\'entreprise');
        return;
    }

    showLoading();
    hideError();
    searchResults.style.display = 'none';

    try {
        console.log(`Recherche d'entreprise: ${query}`);
        const searchData = await fetchAPI(`/search-symbol?query=${encodeURIComponent(query)}`);
        
        if (!searchData || searchData.length === 0) {
            searchResults.innerHTML = '<div class="search-result-item">Aucun résultat trouvé</div>';
            searchResults.style.display = 'block';
            return;
        }

        // Afficher les résultats
        displaySearchResults(searchData);
        
    } catch (error) {
        console.error('Erreur de recherche:', error);
        showError('Erreur lors de la recherche');
    } finally {
        hideLoading();
    }
}

// Fonction pour afficher les résultats de recherche
function displaySearchResults(results) {
    const html = results.map(company => `
        <div class="search-result-item" onclick="selectCompany('${company.symbol}', '${company.name.replace(/'/g, "\\'")}')">
            <div class="search-result-name">${company.name}</div>
            <div class="search-result-symbol">${company.symbol}</div>
            <div class="search-result-exchange">${company.exchange || 'N/A'} - ${company.currency || 'N/A'}</div>
        </div>
    `).join('');

    searchResults.innerHTML = html;
    searchResults.style.display = 'block';
}

// Fonction pour sélectionner une entreprise
function selectCompany(symbol, companyName) {
    symbolInput.value = symbol;
    companySearchInput.value = companyName;
    searchResults.style.display = 'none';
    
    // Lancer automatiquement la récupération des données
    fetchCompanyData();
}

function calculateMetrics() {
    const { profile, quote, balanceSheet, incomeStatement, cashFlow } = currentData;
    
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
    const priceToMM200 = ((quote.price - quote.priceAvg200) / quote.priceAvg200) * 100;
    const dividendYield = (profile.lastDividend / quote.price) * 100;
    const pbRatio = quote.price / (balanceSheet.totalStockholdersEquity / incomeStatement.weightedAverageShsOut);
    const pegRatio = peRatio / 15;
    
    // ROIC
    const taxRate = incomeStatement.incomeTaxExpense / incomeStatement.incomeBeforeTax;
    const nopat = incomeStatement.operatingIncome * (1 - taxRate);
    const investedCapital = balanceSheet.totalDebt + balanceSheet.totalStockholdersEquity;
    const roic = (nopat / investedCapital) * 100;
    
    // Free Cash Flow
    const freeCashFlow = cashFlow.freeCashFlow;
    
    // EV/EBITDA
    const enterpriseValue = quote.marketCap + balanceSheet.totalDebt - balanceSheet.cashAndCashEquivalents;
    const evToEbitda = enterpriseValue / incomeStatement.ebitda;
    
    return {
        roe, netMargin, grossMargin, sgaMargin,
        debtToEquity, currentRatio, interestCoverage,
        peRatio, earningsYield, priceToFCF,
        priceToMM200, dividendYield, pbRatio, pegRatio,
        roic, freeCashFlow, evToEbitda
    };
}

function displaySummaryAnalysis(metrics, recommendation) {
    const scores = calculateScores(metrics);
    const totalScore = scores.excellent * 3 + scores.good * 2 + scores.medium;
    const maxScore = (scores.excellent + scores.good + scores.medium + scores.bad) * 3;
    const percentage = (totalScore / maxScore) * 100;
    const categoryAnalysis = analyzeByCategory(metrics, scores);
    
    let rating, ratingClass, details;
    
    if (percentage >= 75) {
        rating = 'EXCELLENT';
        ratingClass = 'summary-excellent';
        details = 'Entreprise de haute qualité avec valorisation attractive';
    } else if (percentage >= 60) {
        rating = 'BON';
        ratingClass = 'summary-good';
        details = 'Solide fondamentaux mais valorisation à surveiller';
    } else if (percentage >= 45) {
        rating = 'MOYEN';
        ratingClass = 'summary-medium';
        details = 'Points forts et faibles équilibrés';
    } else {
        rating = 'FAIBLE';
        ratingClass = 'summary-bad';
        details = 'Problèmes significatifs détectés';
    }
    
    const summaryHTML = createSummaryHTML(percentage, rating, ratingClass, details, recommendation, categoryAnalysis, metrics);
    document.getElementById('summaryAnalysis').innerHTML = summaryHTML;
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

// Charger toutes les entreprises
async function loadAllCompanies() {
    showLoading();
    companiesModal.classList.remove('hidden');
    
    try {
        console.log('Chargement de toutes les entreprises...');
        const companies = await fetchAPI('/stock-list');
        
        if (!companies || companies.length === 0) {
            companiesTableBody.innerHTML = '<tr><td colspan="2">Aucune entreprise trouvée</td></tr>';
            return;
        }

        allCompaniesData = companies;
        displayCompaniesTable(companies);
        
    } catch (error) {
        console.error('Erreur chargement entreprises:', error);
        companiesTableBody.innerHTML = '<tr><td colspan="2">Erreur de chargement</td></tr>';
    } finally {
        hideLoading();
    }
}

// Afficher le tableau
function displayCompaniesTable(companies) {
    const html = companies.map(company => `
        <tr onclick="selectCompanyFromTable('${company.symbol}', '${company.name.replace(/'/g, "\\'")}')">
            <td><strong>${company.symbol}</strong></td>
            <td>${company.name}</td>
        </tr>
    `).join('');

    companiesTableBody.innerHTML = html;
    companiesCount.textContent = `${companies.length} entreprises`;
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
        company.name.toLowerCase().includes(searchTerm)
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

function calculateScores(metrics) {
    const scores = { excellent: 0, good: 0, medium: 0, bad: 0 };
    
    // Profitabilité
    scores[getRating(metrics.roe, 20, 15, 10)]++;
    scores[getRating(metrics.netMargin, 20, 15, 10)]++;
    scores[getRating(metrics.grossMargin, 50, 40, 30)]++;
    scores[getRating(metrics.sgaMargin, 10, 20, 30, true)]++;
    scores[getRating(metrics.roic, 15, 10, 8)]++;
    
    // Sécurité
    scores[getRating(metrics.debtToEquity, 0.3, 0.5, 1.0, true)]++;
    scores[getRating(metrics.currentRatio, 2.0, 1.5, 1.0)]++;
    scores[getRating(metrics.interestCoverage, 10, 5, 3)]++;
    
    // Valuation
    scores[getRating(metrics.peRatio, 10, 15, 25, true)]++;
    scores[getRating(metrics.earningsYield, 10, 6, 4)]++;
    scores[getRating(metrics.priceToFCF, 10, 15, 20, true)]++;
    scores[getRating(metrics.priceToMM200, 5, 0, -5)]++;
    scores[getRating(metrics.dividendYield, 4, 2, 1)]++;
    scores[getRating(metrics.pbRatio, 1.5, 3, 5, true)]++;
    scores[getRating(metrics.pegRatio, 0.8, 1.0, 1.2, true)]++;
    scores[getRating(metrics.evToEbitda, 8, 12, 15, true)]++;
    
    return scores;
}

function analyzeByCategory(metrics, scores) {
    return {
        profitability: {
            score: Math.round(((metrics.roe > 20 ? 1 : 0) + (metrics.netMargin > 20 ? 1 : 0) + 
                             (metrics.grossMargin > 40 ? 1 : 0) + (metrics.sgaMargin < 20 ? 1 : 0) + 
                             (metrics.roic > 10 ? 1 : 0)) / 5 * 100),
            rating: getCategoryRating(metrics.roe > 20 && metrics.netMargin > 20 && metrics.roic > 15),
            strengths: [
                metrics.roe > 20 ? "ROE exceptionnel" : "",
                metrics.netMargin > 20 ? "Forte marge nette" : "",
                metrics.roic > 15 ? "ROIC excellent" : "",
                metrics.grossMargin > 40 ? "Bonne marge brute" : ""
            ].filter(Boolean),
            concerns: []
        },
        safety: {
            score: Math.round(((metrics.debtToEquity < 0.5 ? 1 : 0) + (metrics.currentRatio > 1.5 ? 1 : 0) + 
                             (metrics.interestCoverage > 5 ? 1 : 0) + (metrics.freeCashFlow > 0 ? 1 : 0)) / 4 * 100),
            rating: getCategoryRating(metrics.debtToEquity < 0.5 && metrics.currentRatio > 1.5),
            strengths: [
                metrics.interestCoverage > 10 ? "Excellente couverture des intérêts" : "",
                metrics.freeCashFlow > 0 ? "Génération de cash flow saine" : ""
            ].filter(Boolean),
            concerns: [
                metrics.debtToEquity > 1.0 ? "Dette élevée" : "",
                metrics.currentRatio < 1.0 ? "Problème de liquidité" : ""
            ].filter(Boolean)
        },
        valuation: {
            score: Math.round(((metrics.peRatio < 20 ? 1 : 0) + (metrics.earningsYield > 5 ? 1 : 0) + 
                             (metrics.priceToFCF < 20 ? 1 : 0) + (metrics.pbRatio < 3 ? 1 : 0) + 
                             (metrics.pegRatio < 1.5 ? 1 : 0) + (metrics.evToEbitda < 15 ? 1 : 0)) / 6 * 100),
            rating: getCategoryRating(metrics.peRatio < 15 && metrics.pegRatio < 1),
            strengths: [
                metrics.priceToMM200 > 5 ? "Tendance haussière vs MM200" : "",
                metrics.dividendYield > 2 ? "Dividende attractif" : ""
            ].filter(Boolean),
            concerns: [
                metrics.peRatio > 25 ? "Valorisation élevée (P/E)" : "",
                metrics.earningsYield < 4 ? "Rendement des bénéfices faible" : "",
                metrics.priceToFCF > 20 ? "Cash flow cher" : "",
                metrics.pbRatio > 3 ? "Prime importante vs actifs" : "",
                metrics.evToEbitda > 12 ? "Valorisation d'entreprise élevée" : ""
            ].filter(Boolean)
        }
    };
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
