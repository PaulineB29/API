// Configuration et constantes
const CONFIG = {
    SEUILS: {
        currentRatio: { bon: 1.5, excellent: 2.0 },
        debtToEquity: { bon: 0.5, excellent: 0.3 },
        interestCoverage: { bon: 5, excellent: 8 },
        freeCashFlow: { bon: 0, excellent: 100000 },
        
        roe: { bon: 0.15, excellent: 0.20 },
        roic: { bon: 0.12, excellent: 0.15 },
        netMargin: { bon: 0.10, excellent: 0.15 },
        operatingMargin: { bon: 0.15, excellent: 0.20 },
        
        peRatio: { bon: 15, excellent: 12 },
        pegRatio: { bon: 1, excellent: 0.8 },
        pbRatio: { bon: 1.5, excellent: 1.2 },
        pfcfRatio: { bon: 20, excellent: 15 },
        dividendYield: { bon: 0.02, excellent: 0.03 },
        evEbitda: { bon: 12, excellent: 8 },
        
        revenueGrowth: { bon: 0.08, excellent: 0.12 },
        epsGrowth: { bon: 0.10, excellent: 0.15 },
        priceVsMA200: { bon: 0, excellent: 0.05 }
    },



    // Configuration FMP API
    FMP_API: {
        KEY: 'S9PuvPa0mLK9FlCMS3cUYQjnbndSJFOY',
        BASE_URL: 'https://financialmodelingprep.com/api/v3',
        ENDPOINTS: {
            PROFILE: '/profile',
            INCOME_STATEMENT: '/income-statement',
            BALANCE_SHEET: '/balance-sheet-statement',
            CASH_FLOW: '/cash-flow-statement',
            QUOTE: '/quote',
            KEY_METRICS: '/key-metrics',
            RATIOS: '/ratios'
        }
    },

    CATEGORIES: {
        sante: ['currentRatio', 'debtToEquity', 'interestCoverage', 'freeCashFlow'],
        rentabilite: ['roe', 'roic', 'netMargin', 'operatingMargin'],
        evaluation: ['peRatio', 'pegRatio', 'pbRatio', 'pfcfRatio', 'dividendYield', 'evEbitda'],
        croissance: ['revenueGrowth', 'epsGrowth', 'priceVsMA200']
    },

    RATIOS_INVERSES: ['debtToEquity', 'peRatio', 'pegRatio', 'pbRatio', 'pfcfRatio', 'evEbitda']
};

// Utilitaires
const Utils = {
    formatFinancialValue(value, isPercentage = false) {
        if (value === null || isNaN(value)) return null;
        return isPercentage ? value : Math.round(value);
    },

    parseFinancialText(text, isPercentage = false) {
        if (!text) return null;

        let cleanedText = text.trim()
            .replace(/\s+/g, '')
            .replace(/[$,€]/g, '')
            .replace(/%/g, '')
            .replace(/,/g, '.');

        // Gérer les suffixes (K, M, B, T)
        const multiplier = {
            'k': 1000, 'K': 1000,
            'm': 1000000, 'M': 1000000,
            'b': 1000000000, 'B': 1000000000,
            't': 1000000000000, 'T': 1000000000000
        };

        const suffix = cleanedText.slice(-1);
        if (multiplier[suffix]) {
            cleanedText = parseFloat(cleanedText.slice(0, -1)) * multiplier[suffix];
        } else {
            cleanedText = parseFloat(cleanedText);
        }

        return this.formatFinancialValue(cleanedText, isPercentage);
    },

    getVerdict(valeur, seuil, nomRatio) {
        const nomCle = nomRatio.toLowerCase().replace(/[^a-zA-Z]/g, '');
        const estInverse = CONFIG.RATIOS_INVERSES.includes(nomCle);
        
        if (estInverse) {
            if (valeur <= seuil.excellent) return 'Excellent';
            if (valeur <= seuil.bon) return 'Bon';
            return 'Faible';
        }
        
        if (valeur >= seuil.excellent) return 'Excellent';
        if (valeur >= seuil.bon) return 'Bon';
        return 'Faible';
    },

    getClasseVerdict(verdict) {
        const classes = {
            'Excellent': 'ratio-excellent',
            'Bon': 'ratio-good',
            'Faible': 'ratio-bad'
        };
        return classes[verdict] || '';
    },

    showStatus(message, type, elementId = 'fetchStatus') {
        const statusDiv = document.getElementById(elementId);
        if (!statusDiv) return;

        statusDiv.textContent = message;
        statusDiv.className = `fetch-status ${type}`;
        
        setTimeout(() => {
            statusDiv.textContent = '';
            statusDiv.className = 'fetch-status';
        }, 5000);
    }
};

// Gestion de l'interface utilisateur
const UI = {
    initTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));

                btn.classList.add('active');
                const tabId = btn.getAttribute('data-tab') + '-tab';
                document.getElementById(tabId)?.classList.add('active');
            });
        });
    },

    initYearSelector() {
        const yearSelect = document.getElementById('dataYear');
        if (!yearSelect) return;

        const currentYear = new Date().getFullYear();
        
        for (let i = currentYear; i >= currentYear - 4; i--) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            if (i === currentYear) option.selected = true;
            yearSelect.appendChild(option);
        }
    },

    toggleQuarterField() {
        const periodType = document.getElementById('periodType')?.value;
        const quarterField = document.getElementById('quarterField');
        if (!quarterField) return;

        quarterField.style.display = periodType === 'quarterly' ? 'block' : 'none';
    },

    afficherScores(scores) {
        const globalScoreElement = document.getElementById('globalScore');
        const scoreCircle = document.querySelector('.score-circle');
        
        if (globalScoreElement) {
            globalScoreElement.textContent = scores.global + '%';
        }
        if (scoreCircle) {
            scoreCircle.style.background = `conic-gradient(var(--primary) ${scores.global}%, var(--border) ${scores.global}%)`;
        }

        const scoreElements = {
            sante: 'healthScore',
            rentabilite: 'profitabilityScore',
            evaluation: 'valuationScore',
            croissance: 'growthScore'
        };

        Object.entries(scoreElements).forEach(([key, prefix]) => {
            const barElement = document.getElementById(prefix);
            const valueElement = document.getElementById(prefix.replace('Score', 'Value'));
            
            if (barElement) barElement.style.width = scores[key] + '%';
            if (valueElement) valueElement.textContent = scores[key] + '%';
        });
    },

    genererConclusion(scores) {
        const scoreGlobal = scores.global;
        const conclusionElement = document.getElementById('conclusion');
        if (!conclusionElement) return;

        let conclusionHTML, conclusionClasse;

        if (scoreGlobal >= 80) {
            conclusionClasse = 'conclusion-good';
            conclusionHTML = `
                <h3><i class="fas fa-trophy"></i> EXCELLENTE OPPORTUNITÉ</h3>
                <p><strong>Score global: ${scoreGlobal}%</strong> - L'entreprise présente des fondamentaux solides</p>
                <p>✅ Santé financière robuste | ✅ Rentabilité élevée | ✅ Évaluation attractive | ✅ Croissance soutenue</p>
                <p><em>Recommandation: Cette action mérite une place dans votre portefeuille.</em></p>
            `;
        } else if (scoreGlobal >= 65) {
            conclusionClasse = 'conclusion-neutral';
            conclusionHTML = `
                <h3><i class="fas fa-chart-line"></i> OPPORTUNITÉ MODÉRÉE</h3>
                <p><strong>Score global: ${scoreGlobal}%</strong> - L'entreprise a des points forts mais aussi des faiblesses</p>
                <p>⚠️ Analysez les points faibles avant d'investir</p>
                <p><em>Recommandation: À étudier plus en détail, pourrait convenir pour une allocation mineure.</em></p>
            `;
        } else {
            conclusionClasse = 'conclusion-bad';
            conclusionHTML = `
                <h3><i class="fas fa-exclamation-triangle"></i> OPPORTUNITÉ RISQUÉE</h3>
                <p><strong>Score global: ${scoreGlobal}%</strong> - L'entreprise présente trop de risques</p>
                <p>❌ Santé financière fragile | ❌ Rentabilité faible | ❌ Évaluation élevée | ❌ Croissance insuffisante</p>
                <p><em>Recommandation: Éviter cette action. De meilleures opportunités existent sur le marché.</em></p>
            `;
        }

        conclusionElement.className = `conclusion-card ${conclusionClasse}`;
        conclusionElement.innerHTML = conclusionHTML;
    }
};

// Gestion des données FMP API
const FMPAPI = {
    async recupererDonneesFMP() {
        const symbole = document.getElementById('companySymbol')?.value.trim().toUpperCase();
        const fetchBtn = document.getElementById('fetchFMPDataBtn');
        
        if (!symbole) {
            Utils.showStatus('Veuillez entrer un symbole boursier', 'error', 'fmpStatus');
            return;
        }

        try {
            this.setFetchButtonState(fetchBtn, true);
            Utils.showStatus('Connexion à FMP API...', 'loading', 'fmpStatus');

            // Récupérer toutes les données en parallèle
            const [
                profileData, 
                incomeData, 
                balanceData, 
                cashflowData, 
                quoteData,
                metricsData
            ] = await Promise.all([
                this.fetchFMPData(CONFIG.FMP_API.ENDPOINTS.PROFILE, symbole),
                this.fetchFMPData(CONFIG.FMP_API.ENDPOINTS.INCOME_STATEMENT, symbole),
                this.fetchFMPData(CONFIG.FMP_API.ENDPOINTS.BALANCE_SHEET, symbole),
                this.fetchFMPData(CONFIG.FMP_API.ENDPOINTS.CASH_FLOW, symbole),
                this.fetchFMPData(CONFIG.FMP_API.ENDPOINTS.QUOTE, symbole),
                this.fetchFMPData(CONFIG.FMP_API.ENDPOINTS.KEY_METRICS, symbole)
            ]);

            // Vérifier les données
            if (!incomeData || incomeData.length === 0) throw new Error('Aucune donnée de revenus trouvée');
            if (!balanceData || balanceData.length === 0) throw new Error('Aucune donnée de bilan trouvée');
            if (!cashflowData || cashflowData.length === 0) throw new Error('Aucune donnée de flux de trésorerie trouvée');

            // Prendre les données les plus récentes
            const profile = profileData[0] || {};
            const income = incomeData[0];
            const balance = balanceData[0];
            const cashflow = cashflowData[0];
            const quote = quoteData[0] || {};
            const metrics = metricsData[0] || {};

            console.log('📊 Données FMP récupérées:', { profile, income, balance, cashflow, quote, metrics });

            // Remplir le formulaire
            this.fillFormWithFMPData({
                symbole,
                profile,
                income,
                balance,
                cashflow,
                quote,
                metrics
            });

            Utils.showStatus('Données FMP chargées avec succès!', 'success', 'fmpStatus');
            
        } catch (erreur) {
            console.error('❌ Erreur FMP API:', erreur);
            Utils.showStatus(`Erreur FMP: ${erreur.message}`, 'error', 'fmpStatus');
        } finally {
            this.setFetchButtonState(fetchBtn, false);
        }
    },

    async fetchFMPData(endpoint, symbole) {
        const url = `${CONFIG.FMP_API.BASE_URL}${endpoint}/${symbole}?apikey=${CONFIG.FMP_API.KEY}&limit=1`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Vérifier les erreurs de l'API FMP
        if (data['Error Message']) {
            throw new Error(`API FMP: ${data['Error Message']}`);
        }
        
        return data;
    },

    fillFormWithFMPData(data) {
        const { profile, income, balance, cashflow, quote, metrics } = data;

        // Remplir le nom de l'entreprise
        if (profile.companyName) {
            document.getElementById('companyName').value = profile.companyName;
        }

        // 🏥 SANTÉ FINANCIÈRE
        this.setInputValue('currentAssets', balance.totalCurrentAssets);
        this.setInputValue('currentLiabilities', balance.totalCurrentLiabilities);
        this.setInputValue('totalDebt', balance.totalDebt);
        this.setInputValue('shareholdersEquity', balance.totalEquity);
        this.setInputValue('ebit', income.operatingIncome);
        this.setInputValue('interestExpense', income.interestExpense);
        this.setInputValue('operatingCashFlow', cashflow.operatingCashFlow);
        this.setInputValue('capitalExpenditures', cashflow.capitalExpenditure);

        // 📈 RENTABILITÉ
        this.setInputValue('netIncome', income.netIncome);
        this.setInputValue('revenue', income.revenue);
        // NOPAT = EBIT * (1 - taux d'imposition effectif)
        const taxRate = income.incomeTaxExpense && income.incomeBeforeTax ? 
            income.incomeTaxExpense / income.incomeBeforeTax : 0.25;
        const nopat = income.operatingIncome ? income.operatingIncome * (1 - taxRate) : null;
        this.setInputValue('nopat', nopat);

        // 💰 ÉVALUATION
        this.setInputValue('sharePrice', quote.price);
        this.setInputValue('sharesOutstanding', income.weightedAverageShsOut);
        // Valeur comptable par action = Capitaux propres / Nombre d'actions
        const bookValuePerShare = balance.totalEquity && income.weightedAverageShsOut ? 
            balance.totalEquity / income.weightedAverageShsOut : null;
        this.setInputValue('bookValuePerShare', bookValuePerShare);
        this.setInputValue('ebitda', income.ebitda);
        this.setInputValue('cash', balance.cashAndCashEquivalents);

        // 🚀 CROISSANCE (valeurs estimées ou par défaut)
        this.setInputValue('revenueGrowth', 10); // Valeur par défaut
        this.setInputValue('epsGrowth', 12); // Valeur par défaut
        this.setInputValue('priceVsMA200', 5); // Valeur par défaut

        // Données supplémentaires si disponibles
        if (metrics.dividendYield) {
            const dividendPerShare = quote.price * metrics.dividendYield;
            this.setInputValue('dividendPerShare', dividendPerShare);
        }

        console.log('✅ Formulaire rempli avec les données FMP');
    },

    setInputValue(elementId, value) {
        const input = document.getElementById(elementId);
        if (input && value !== null && !isNaN(value)) {
            input.value = Math.round(value);
        }
    },

    setFetchButtonState(button, isLoading) {
        if (!button) return;

        if (isLoading) {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Chargement FMP...';
        } else {
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-cloud-download-alt"></i> Charger via API FMP';
        }
    }
};

// Gestion des données financières (existante)
const FinancialData = {
    getInputValues() {
        const periodType = document.getElementById('periodType')?.value || 'annual';
        const year = document.getElementById('dataYear')?.value || new Date().getFullYear();
        const quarter = document.getElementById('dataQuarter')?.value || 'Q1';
        
        const periodDisplay = periodType === 'quarterly' 
            ? `${quarter} ${year}` 
            : `année ${year}`;

        const fields = [
            'currentAssets', 'currentLiabilities', 'totalDebt', 'shareholdersEquity',
            'ebit', 'interestExpense', 'operatingCashFlow', 'capitalExpenditures',
            'netIncome', 'revenue', 'nopat', 'sharePrice', 'sharesOutstanding',
            'bookValuePerShare', 'dividendPerShare', 'epsGrowth', 'ebitda', 'cash',
            'revenueGrowth', 'previousEPS', 'priceVsMA200'
        ];

        const data = {
            companyName: document.getElementById('companyName')?.value || "Entreprise sans nom",
            periodType,
            year,
            quarter,
            periodDisplay
        };

        fields.forEach(field => {
            const element = document.getElementById(field);
            data[field] = element ? parseFloat(element.value) || 0 : 0;
        });

        return data;
    },

    calculerRatios(inputs) {
        const marketCap = inputs.sharePrice * inputs.sharesOutstanding;
        const enterpriseValue = marketCap + inputs.totalDebt - inputs.cash;
        const currentEPS = inputs.netIncome / inputs.sharesOutstanding;
        const peRatio = inputs.sharePrice / currentEPS;

        return {
            currentRatio: inputs.currentAssets / inputs.currentLiabilities,
            debtToEquity: inputs.totalDebt / inputs.shareholdersEquity,
            interestCoverage: inputs.ebit / inputs.interestExpense,
            freeCashFlow: inputs.operatingCashFlow - inputs.capitalExpenditures,
            
            roe: inputs.netIncome / inputs.shareholdersEquity,
            roic: inputs.nopat / (inputs.totalDebt + inputs.shareholdersEquity),
            netMargin: inputs.netIncome / inputs.revenue,
            operatingMargin: inputs.ebit / inputs.revenue,
            
            peRatio: peRatio,
            pegRatio: peRatio / inputs.epsGrowth,
            pbRatio: inputs.sharePrice / inputs.bookValuePerShare,
            pfcfRatio: marketCap / (inputs.operatingCashFlow - inputs.capitalExpenditures),
            dividendYield: inputs.dividendPerShare / inputs.sharePrice,
            evEbitda: enterpriseValue / inputs.ebitda,
            
            revenueGrowth: inputs.revenueGrowth / 100,
            epsGrowth: inputs.epsGrowth / 100,
            priceVsMA200: inputs.priceVsMA200 / 100
        };
    },

    calculerScores(ratios) {
        const scores = {};

        for (const [categorie, indicateurs] of Object.entries(CONFIG.CATEGORIES)) {
            let scoreCategorie = 0;
            let totalPoids = 0;

            indicateurs.forEach(indicateur => {
                const valeur = ratios[indicateur];
                const seuil = CONFIG.SEUILS[indicateur];
                const poids = 1;

                let score = 0;
                const estInverse = CONFIG.RATIOS_INVERSES.includes(indicateur);

                if (estInverse) {
                    score = valeur <= seuil.excellent ? 100 : valeur <= seuil.bon ? 70 : 30;
                } else {
                    score = valeur >= seuil.excellent ? 100 : valeur >= seuil.bon ? 70 : 30;
                }

                scoreCategorie += score * poids;
                totalPoids += poids;
            });

            scores[categorie] = Math.round(scoreCategorie / totalPoids);
        }

        scores.global = Math.round(
            (scores.sante + scores.rentabilite + scores.evaluation + scores.croissance) / 4
        );

        return scores;
    }
};

// Fonctions principales de l'application
function lancerAnalyse() {
    const inputs = FinancialData.getInputValues();
    const ratios = FinancialData.calculerRatios(inputs);
    const scores = FinancialData.calculerScores(ratios);
    
    afficherResultats(inputs.companyName, inputs.periodDisplay, ratios, scores);
    UI.afficherScores(scores);
    UI.genererConclusion(scores);
    
    document.getElementById('resultsSection')?.scrollIntoView({ behavior: 'smooth' });
}

function afficherResultats(companyName, periodDisplay, ratios, scores) {
    const companyNameElement = document.getElementById('resultsCompanyName');
    const periodElement = document.getElementById('resultsPeriod');
    const resultsSection = document.getElementById('resultsSection');
    const resultsTable = document.getElementById('resultsTable');
    
    if (companyNameElement) companyNameElement.textContent = companyName;
    if (periodElement) periodElement.textContent = periodDisplay;
    if (resultsTable) resultsTable.innerHTML = genererLignesTableau(ratios);
    if (resultsSection) resultsSection.style.display = 'block';
}

function genererLignesTableau(ratios) {
    const categories = {
        "Santé Financière": [
            { nom: "Current Ratio", valeur: ratios.currentRatio, seuil: CONFIG.SEUILS.currentRatio, format: (v) => v.toFixed(2) },
            { nom: "Dette/Capitaux Propres", valeur: ratios.debtToEquity, seuil: CONFIG.SEUILS.debtToEquity, format: (v) => v.toFixed(2) },
            { nom: "Couverture des Intérêts", valeur: ratios.interestCoverage, seuil: CONFIG.SEUILS.interestCoverage, format: (v) => v.toFixed(1) + "x" },
            { nom: "Free Cash Flow", valeur: ratios.freeCashFlow, seuil: CONFIG.SEUILS.freeCashFlow, format: (v) => v.toLocaleString('fr-FR') + " €" }
        ],
        "Rentabilité": [
            { nom: "ROE", valeur: ratios.roe, seuil: CONFIG.SEUILS.roe, format: (v) => (v * 100).toFixed(1) + "%" },
            { nom: "ROIC", valeur: ratios.roic, seuil: CONFIG.SEUILS.roic, format: (v) => (v * 100).toFixed(1) + "%" },
            { nom: "Marge Nette", valeur: ratios.netMargin, seuil: CONFIG.SEUILS.netMargin, format: (v) => (v * 100).toFixed(1) + "%" },
            { nom: "Marge d'Exploitation", valeur: ratios.operatingMargin, seuil: CONFIG.SEUILS.operatingMargin, format: (v) => (v * 100).toFixed(1) + "%" }
        ],
        "Évaluation": [
            { nom: "P/E Ratio", valeur: ratios.peRatio, seuil: CONFIG.SEUILS.peRatio, format: (v) => v.toFixed(1) },
            { nom: "PEG Ratio", valeur: ratios.pegRatio, seuil: CONFIG.SEUILS.pegRatio, format: (v) => v.toFixed(2) },
            { nom: "P/B Ratio", valeur: ratios.pbRatio, seuil: CONFIG.SEUILS.pbRatio, format: (v) => v.toFixed(2) },
            { nom: "P/FCF Ratio", valeur: ratios.pfcfRatio, seuil: CONFIG.SEUILS.pfcfRatio, format: (v) => v.toFixed(1) },
            { nom: "Rendement Dividende", valeur: ratios.dividendYield, seuil: CONFIG.SEUILS.dividendYield, format: (v) => (v * 100).toFixed(2) + "%" },
            { nom: "EV/EBITDA", valeur: ratios.evEbitda, seuil: CONFIG.SEUILS.evEbitda, format: (v) => v.toFixed(1) }
        ],
        "Croissance": [
            { nom: "Croissance CA", valeur: ratios.revenueGrowth, seuil: CONFIG.SEUILS.revenueGrowth, format: (v) => (v * 100).toFixed(1) + "%" },
            { nom: "Croissance BPA", valeur: ratios.epsGrowth, seuil: CONFIG.SEUILS.epsGrowth, format: (v) => (v * 100).toFixed(1) + "%" },
            { nom: "Prix vs MM200", valeur: ratios.priceVsMA200, seuil: CONFIG.SEUILS.priceVsMA200, format: (v) => (v * 100).toFixed(1) + "%" }
        ]
    };

    let html = '';
    
    for (const [categorie, indicateurs] of Object.entries(categories)) {
        indicateurs.forEach(indicateur => {
            const valeurFormatee = indicateur.format(indicateur.valeur);
            const seuilFormate = indicateur.seuil.bon;
            const verdict = Utils.getVerdict(indicateur.valeur, indicateur.seuil, indicateur.nom);
            const classe = Utils.getClasseVerdict(verdict);
            
            html += `
                <tr class="${classe}">
                    <td><strong>${categorie}</strong></td>
                    <td>${indicateur.nom}</td>
                    <td>${valeurFormatee}</td>
                    <td>${seuilFormate}</td>
                    <td>${verdict}</td>
                </tr>
            `;
        });
    }
    
    return html;
}

// Fonctions globales
function recupererDonneesFMP() {
    FMPAPI.recupererDonneesFMP();

}

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    UI.initTabs();
    UI.initYearSelector();
    UI.toggleQuarterField();
    }

    // Permettre Entrée dans le champ symbole
    const companySymbol = document.getElementById('companySymbol');
    if (companySymbol) {
        companySymbol.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                FMPAPI.recupererDonneesFMP();
            }
        });
    }
});
