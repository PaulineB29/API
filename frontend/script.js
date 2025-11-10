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

// Fonction pour créer l'icône d'aide
function createHelpIcon(ratioKey) {
    const definition = ratioDefinitions[ratioKey];
    return `
        <span class="help-icon" title="${definition.name}">
            ?
            <div class="tooltip">
                <h4>${definition.name}</h4>
                <div class="tooltip-section">
                    <div class="tooltip-label">Définition:</div>
                    <div class="tooltip-value">${definition.definition}</div>
                </div>
                <div class="tooltip-section">
                    <div class="tooltip-label">Calcul:</div>
                    <div class="tooltip-value">${definition.calculation}</div>
                </div>
                <div class="tooltip-section">
                    <div class="tooltip-label">Signification:</div>
                    <div class="tooltip-value">${definition.significance}</div>
                </div>
            </div>
        </span>
    `;
}


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
        
        // Récupérer toutes les données en parallèle
        const [profile, quote, cashFlow, incomeStatement, balanceSheet, historicalData] = await Promise.all([
            fetchAPI(`/profile?symbol=${symbol}`),
            fetchAPI(`/quote?symbol=${symbol}`),
            fetchAPI(`/cash-flow-statement?symbol=${symbol}`),
            fetchAPI(`/income-statement?symbol=${symbol}`),
            fetchAPI(`/balance-sheet-statement?symbol=${symbol}`),
            fetchHistoricalData(symbol) // ✅ Maintenant historicalData est défini
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
            historicalData: historicalData // ✅ Maintenant correct
        };

        console.log('Données récupérées avec succès:', currentData);
        displayBasicData();
        showDataSection();
        
        // ✅ SAUVEGARDE AUTOMATIQUE DES DONNÉES FINANCIÈRES
        await sauvegarderDonneesFinancieres();
        
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

// NOUVELLE FONCTION pour sauvegarder dans VOTRE base de données
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
        // Ajoutez les données de base
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
        // Price data
        currentPrice: currentData.quote.price,
        movingAverage200: currentData.quote.priceAvg200,
        dividendPerShare: currentData.profile.lastDividend,
        marketCap: currentData.quote.marketCap,
        // Balance sheet
        cashEquivalents: currentData.balanceSheet.cashAndCashEquivalents,
        currentAssets: currentData.balanceSheet.totalCurrentAssets,
        currentLiabilities: currentData.balanceSheet.totalCurrentLiabilities,
        totalDebt: currentData.balanceSheet.totalDebt,
        shareholdersEquity: currentData.balanceSheet.totalStockholdersEquity,
        netCash: currentData.balanceSheet.cashAndCashEquivalents - currentData.balanceSheet.totalDebt,
        // Income statement
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
        
        // ⚠️ AJOUTEZ LA VÉRIFICATION DU STATUT
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

// Fonctions utilitaires
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

   // Balance Sheet - SECTION MODIFIÉE
document.getElementById('balanceSheetData').innerHTML = `
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
        <span class="data-label">Net Cash:</span>
        <span class="data-value">$${formatNumber(balanceSheet.cashAndCashEquivalents - balanceSheet.totalDebt)}</span>
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
        // Utilisez le même endpoint que pour les données annuelles
        const historicalData = await fetchAPI(`/income-statement?symbol=${symbol}`);
        return historicalData;
    } catch (error) {
        console.error('Erreur historique:', error);
        return null;
    }
}

// FONCTION pour afficher l'historique des revenus
function displayHistoricalData() {
    const { historicalData } = currentData;
    
    // Vérification plus robuste
    if (!historicalData || !Array.isArray(historicalData) || historicalData.length === 0) {
        document.getElementById('historicalData').innerHTML = '<p style="color: #7f8c8d;">Aucune donnée historique disponible</p>';
        return;
    }
    
    let html = '';
    
    // Trier par année (du plus récent au plus ancien)
    const sortedData = [...historicalData].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Prendre les 10 dernières années maximum
    const recentData = sortedData.slice(0, 10);
    
    recentData.forEach((yearData, index) => {
        const year = new Date(yearData.date).getFullYear();
        const revenue = formatNumber(yearData.revenue);
        
        // Calcul de la croissance seulement si on a l'année précédente
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
    
    // ✅ CALCULER LA VRAIE RECOMMANDATION
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
    
    // Afficher l'analyse avec la vraie recommandation
    displaySummaryAnalysis(metrics, recommendation);
    showAnalysisSection();
    
    // ✅ SAUVEGARDER avec la VRAIE recommandation
    console.log('💾 Tentative de sauvegarde...');
    sauvegarderAnalyse(metrics, recommendation);
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
    
    // Prix vs MM200
    const priceToMM200 = ((quote.price - quote.priceAvg200) / quote.priceAvg200) * 100;
    
    // Rendement Dividende
    const dividendYield = (profile.lastDividend / quote.price) * 100;
    
    // P/B Ratio
    const pbRatio = quote.price / (balanceSheet.totalStockholdersEquity / incomeStatement.weightedAverageShsOut);
    
    // PEG Ratio (estimation avec croissance historique)
    const pegRatio = peRatio / 15; // À remplacer par la croissance réelle
    
    // ROIC
    const taxRate = incomeStatement.incomeTaxExpense / incomeStatement.incomeBeforeTax;
    const nopat = incomeStatement.operatingIncome * (1 - taxRate);
    const investedCapital = balanceSheet.totalDebt + balanceSheet.totalStockholdersEquity;
    const roic = (nopat / investedCapital) * 100;
    
    // Free Cash Flow (déjà dans cashFlow.freeCashFlow)
    const freeCashFlow = cashFlow.freeCashFlow;
    
    // EV/EBITDA
    const enterpriseValue = quote.marketCap + balanceSheet.totalDebt - balanceSheet.cashAndCashEquivalents;
    const evToEbitda = enterpriseValue / incomeStatement.ebitda;
    
    return {
        // Métriques existantes
        roe, netMargin, grossMargin, sgaMargin,
        debtToEquity, currentRatio, interestCoverage,
        peRatio, earningsYield, priceToFCF,
        priceToMM200, dividendYield, pbRatio, pegRatio,
        roic, freeCashFlow, evToEbitda
    };
}
function displayProfitabilityAnalysis(metrics) {
    const html = `
        ${createMetricCard('ROE', `${metrics.roe.toFixed(1)}%`, metrics.roe, 20, 15, 10, false, 'roe')}
        ${createMetricCard('Marge Nette', `${metrics.netMargin.toFixed(1)}%`, metrics.netMargin, 20, 15, 10, false, 'netMargin')}
        ${createMetricCard('Marge Brute', `${metrics.grossMargin.toFixed(1)}%`, metrics.grossMargin, 50, 40, 30, false, 'grossMargin')}
        ${createMetricCard('Marge SG&A', `${metrics.sgaMargin.toFixed(1)}%`, metrics.sgaMargin, 10, 20, 30, true, 'sgaMargin')}
        ${createMetricCard('ROIC', `${metrics.roic.toFixed(1)}%`, metrics.roic, 15, 10, 8, false, 'roic')}
    `;
    document.getElementById('profitabilityAnalysis').innerHTML = html;
}

function displaySafetyAnalysis(metrics) {
    const html = `
        ${createMetricCard('Dette/Equity', metrics.debtToEquity.toFixed(2), metrics.debtToEquity, 0.3, 0.5, 1.0, true, 'debtToEquity')}
        ${createMetricCard('Current Ratio', metrics.currentRatio.toFixed(2), metrics.currentRatio, 2.0, 1.5, 1.0, false, 'currentRatio')}
        ${createMetricCard('Couverture Intérêts', metrics.interestCoverage > 1000 ? '∞' : metrics.interestCoverage.toFixed(1) + 'x', 
                          metrics.interestCoverage, 10, 5, 3, false, 'interestCoverage')}
        ${createMetricCard('Free Cash Flow', `$${formatNumber(metrics.freeCashFlow)}`, metrics.freeCashFlow > 0 ? 1 : 0, 1, 0, -1, false, 'freeCashFlow')}
    `;
    document.getElementById('safetyAnalysis').innerHTML = html;
}

function displayValuationAnalysis(metrics) {
    const html = `
        ${createMetricCard('P/E Ratio', metrics.peRatio.toFixed(1), metrics.peRatio, 10, 15, 25, true, 'peRatio')}
        ${createMetricCard('Earnings Yield', `${metrics.earningsYield.toFixed(1)}%`, metrics.earningsYield, 10, 6, 4, false, 'earningsYield')}
        ${createMetricCard('Price/FCF', metrics.priceToFCF.toFixed(1), metrics.priceToFCF, 10, 15, 20, true, 'priceToFCF')}
        ${createMetricCard('Prix vs MM200', `${metrics.priceToMM200.toFixed(1)}%`, metrics.priceToMM200, 5, 0, -5, false, 'priceToMM200')}
        ${createMetricCard('Rendement Dividende', `${metrics.dividendYield.toFixed(2)}%`, metrics.dividendYield, 4, 2, 1, false, 'dividendYield')}
        ${createMetricCard('P/B Ratio', metrics.pbRatio.toFixed(2), metrics.pbRatio, 1.5, 3, 5, true, 'pbRatio')}
        ${createMetricCard('PEG Ratio', metrics.pegRatio.toFixed(2), metrics.pegRatio, 0.8, 1.0, 1.2, true, 'pegRatio')}
        ${createMetricCard('EV/EBITDA', metrics.evToEbitda.toFixed(1), metrics.evToEbitda, 8, 12, 15, true, 'evToEbitda')}
    `;
    document.getElementById('valuationAnalysis').innerHTML = html;
}

function displaySummaryAnalysis(metrics) {
    const scores = calculateScores(metrics);
    const totalScore = scores.excellent * 3 + scores.good * 2 + scores.medium;
    const maxScore = (scores.excellent + scores.good + scores.medium + scores.bad) * 3;
    const percentage = (totalScore / maxScore) * 100;
    
    // Analyse détaillée par catégorie
    const categoryAnalysis = analyzeByCategory(metrics, scores);
    
    let rating, ratingClass, recommendation, details;
    
    if (percentage >= 75) {
        rating = 'EXCELLENT';
        ratingClass = 'summary-excellent';
        recommendation = '✅ FORTE RECOMMANDATION - Correspond bien aux critères Buffett';
        details = 'Entreprise de haute qualité avec valorisation attractive';
    } else if (percentage >= 60) {
        rating = 'BON';
        ratingClass = 'summary-good';
        recommendation = '👍 BONNE OPPORTUNITÉ - À surveiller de près';
        details = 'Solide fondamentaux mais valorisation à surveiller';
    } else if (percentage >= 45) {
        rating = 'MOYEN';
        ratingClass = 'summary-medium';
        recommendation = '⚠️ OPPORTUNITÉ MOYENNE - Nécessite une analyse plus poussée';
        details = 'Points forts et faibles équilibrés, décision contextuelle';
    } else if (percentage >= 30) {
        rating = 'FAIBLE';
        ratingClass = 'summary-bad';
        recommendation = '📉 OPPORTUNITÉ FAIBLE - Plusieurs points de vigilance';
        details = 'Problèmes significatifs sur la valorisation ou la structure financière';
    } else {
        rating = 'TRÈS FAIBLE';
        ratingClass = 'summary-bad';
        recommendation = '❌ DÉCONSEILLÉ - Ne correspond pas aux critères Buffett';
        details = 'Multiples problèmes structurels et de valorisation';
    }
    
    const html = `
        <div class="summary-box">
            <div class="score-header">
                <h3>Score Global: ${percentage.toFixed(0)}%</h3>
                <div class="performance-breakdown">
                    <div class="performance-item">
                        <span class="performance-label">Profitabilité:</span>
                        <span class="performance-value ${categoryAnalysis.profitability.rating}">${categoryAnalysis.profitability.score}%</span>
                    </div>
                    <div class="performance-item">
                        <span class="performance-label">Sécurité:</span>
                        <span class="performance-value ${categoryAnalysis.safety.rating}">${categoryAnalysis.safety.score}%</span>
                    </div>
                    <div class="performance-item">
                        <span class="performance-label">Valorisation:</span>
                        <span class="performance-value ${categoryAnalysis.valuation.rating}">${categoryAnalysis.valuation.score}%</span>
                    </div>
                </div>
            </div>
            
            <div class="summary-rating ${ratingClass}">
                ${rating}
                <div class="rating-details">${details}</div>
            </div>
            
            <p><strong>Recommandation:</strong> ${recommendation}</p>
            
            <div class="analysis-details">
                <div class="analysis-section">
                    <h4>📈 Points Forts</h4>
                    <div class="strengths-list">
                        ${categoryAnalysis.profitability.strengths.map(strength => 
                            `<div class="analysis-point positive">${strength}</div>`
                        ).join('')}
                    </div>
                </div>
                
                <div class="analysis-section">
                    <h4>⚠️ Points de Vigilance</h4>
                    <div class="concerns-list">
                        ${categoryAnalysis.valuation.concerns.map(concern => 
                            `<div class="analysis-point warning">${concern}</div>`
                        ).join('')}
                        ${categoryAnalysis.safety.concerns.map(concern => 
                            `<div class="analysis-point warning">${concern}</div>`
                        ).join('')}
                    </div>
                </div>
            </div>
            
            <div class="summary-points">
                <h4>🎯 Analyse Détailée</h4>
                ${getKeyPoints(metrics)}
            </div>
            
            <div class="scores-breakdown">
                <h4>📊 Répartition des Scores</h4>
                <div class="scores-grid">
                    <div class="score-category">
                        <span class="score-label">Excellent:</span>
                        <div class="score-bar">
                            <div class="score-fill score-excellent" style="width: ${(scores.excellent/16)*100}%"></div>
                        </div>
                        <span class="score-count">${scores.excellent}/16</span>
                    </div>
                    <div class="score-category">
                        <span class="score-label">Bon:</span>
                        <div class="score-bar">
                            <div class="score-fill score-good" style="width: ${(scores.good/16)*100}%"></div>
                        </div>
                        <span class="score-count">${scores.good}/16</span>
                    </div>
                    <div class="score-category">
                        <span class="score-label">Moyen:</span>
                        <div class="score-bar">
                            <div class="score-fill score-medium" style="width: ${(scores.medium/16)*100}%"></div>
                        </div>
                        <span class="score-count">${scores.medium}/16</span>
                    </div>
                    <div class="score-category">
                        <span class="score-label">Faible:</span>
                        <div class="score-bar">
                            <div class="score-fill score-bad" style="width: ${(scores.bad/16)*100}%"></div>
                        </div>
                        <span class="score-count">${scores.bad}/16</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('summaryAnalysis').innerHTML = html;
}

// Nouvelle fonction pour l'analyse par catégorie
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

function createMetricCard(name, value, actual, excellent, good, medium, reverse = false, ratioKey = null) {
    const rating = getRating(actual, excellent, good, medium, reverse);
    const ratingClass = `rating-${rating}`;
    
    // Ajouter un indicateur de performance
    const performanceIndicator = getPerformanceIndicator(actual, excellent, good, medium, reverse);
    
    const helpIcon = ratioKey ? createHelpIcon(ratioKey) : '';
    
    return `
        <div class="metric">
            <div class="metric-header">
                <span class="metric-name">${name}${helpIcon}</span>
                <div class="metric-score">
                    <span class="metric-value">${value}</span>
                    ${performanceIndicator}
                </div>
            </div>
            <div class="metric-rating ${ratingClass}">${getRatingText(rating)}</div>
            <div class="score-bar">
                <div class="score-fill ${ratingClass}" style="width: ${calculateScoreWidth(actual, excellent, good, medium, reverse)}%"></div>
            </div>
            <div class="metric-details">
                Seuils: ${getThresholdsText(excellent, good, medium, reverse)}
            </div>
        </div>
    `;
}

// Fonctions utilitaires pour les améliorations
function getPerformanceIndicator(actual, excellent, good, medium, reverse) {
    if (reverse ? actual <= excellent : actual >= excellent) {
        return '<span class="performance-indicator indicator-positive">✓ Excellent</span>';
    } else if (reverse ? actual <= good : actual >= good) {
        return '<span class="performance-indicator indicator-positive">✓ Bon</span>';
    } else if (reverse ? actual <= medium : actual >= medium) {
        return '<span class="performance-indicator indicator-warning">⚠ Moyen</span>';
    } else {
        return '<span class="performance-indicator indicator-negative">✗ Faible</span>';
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

function getKeyPoints(metrics) {
    const points = [];
    
    if (metrics.roe > 20) points.push('point-positive ROE exceptionnel (> 20%)');
    else if (metrics.roe < 10) points.push('point-negative ROE faible (< 10%)');
    
    if (metrics.netMargin > 20) points.push('point-positive Forte marge nette (> 20%)');
    else if (metrics.netMargin < 10) points.push('point-negative Marge nette faible (< 10%)');
    
    if (metrics.grossMargin > 50) points.push('point-positive Forte marge brute (> 50%)');
    
    if (metrics.debtToEquity > 1.0) points.push('point-negative Dette élevée (D/E > 1.0)');
    else if (metrics.debtToEquity < 0.3) points.push('point-positive Faible endettement (D/E < 0.3)');
    
    if (metrics.currentRatio < 1.0) points.push('point-negative Problème de liquidité (Current Ratio < 1.0)');
    else if (metrics.currentRatio > 2.0) points.push('point-positive Excellente liquidité (Current Ratio > 2.0)');
    
    if (metrics.peRatio < 15) points.push('point-positive Valorisation attractive (P/E < 15)');
    else if (metrics.peRatio > 25) points.push('point-warning Valorisation élevée (P/E > 25)');
    
    if (metrics.earningsYield > 6.5) points.push('point-positive Rendement des bénéfices attractif (> 6.5%)');
    
    if (metrics.dividendYield > 3) points.push('point-positive Dividende attractif (> 3%)');
    
    if (metrics.roic > 15) points.push('point-positive ROIC excellent (> 15%)');
    
    return points.map(point => `<div class="point ${point.split(' ')[0]}">${point.substring(12)}</div>`).join('');
}

// Fonction pour calculer la croissance 
function calculateGrowth(previousRevenue, currentRevenue) {
    if (!previousRevenue || previousRevenue === 0) return 'N/A';
    const growth = ((currentRevenue - previousRevenue) / previousRevenue) * 100;
    return growth.toFixed(1);
}
// Initialisation
console.log('Dashboard Buffett initialisé');
