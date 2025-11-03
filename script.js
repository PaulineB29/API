// VOTRE CLÉ API
const API_KEY = 'S9PuvPa0mLK9FlCMS3cUYQjnbndSJFOY';

// Fonction principale pour charger les données
async function peuplerDonneesEntreprise(symbole) {
    const bouton = document.getElementById('chargerAutoDonnees');
    const texteOriginal = bouton.textContent;
    
    try {
        bouton.disabled = true;
        bouton.textContent = 'Chargement...';
        
        console.log('🔄 Chargement des données pour:', symbole);

        // Récupérer les 3 états financiers en parallèle
        const [incomeData, balanceData, cashflowData, quoteData] = await Promise.all([
            fetch(`https://financialmodelingprep.com/stable/income-statement?symbol=${symbole}&apikey=${API_KEY}`).then(r => r.json()),
            fetch(`https://financialmodelingprep.com/stable/balance-sheet-statement?symbol=${symbole}&apikey=${API_KEY}`).then(r => r.json()),
            fetch(`https://financialmodelingprep.com/stable/cash-flow-statement?symbol=${symbole}&apikey=${API_KEY}`).then(r => r.json()),
            fetch(`https://financialmodelingprep.com/stable/quote?symbol=${symbole}&apikey=${API_KEY}`).then(r => r.json())
        ]);

        // Vérifier les données
        if (!incomeData || incomeData.length === 0) throw new Error('Aucune donnée income statement');
        if (!balanceData || balanceData.length === 0) throw new Error('Aucune donnée balance sheet');
        if (!cashflowData || cashflowData.length === 0) throw new Error('Aucune donnée cash flow');
        if (!quoteData || quoteData.length === 0) throw new Error('Aucune donnée quote');

        // Prendre les données les plus récentes
        const income = incomeData[0];
        const balance = balanceData[0];
        const cashflow = cashflowData[0];
        const quote = quoteData[0];

        console.log('📊 Données reçues:', { income, balance, cashflow, quote });

        // 🏥 SANTÉ FINANCIÈRE
        setValueIfExists('currentAssets', balance.totalCurrentAssets);
        setValueIfExists('currentLiabilities', balance.totalCurrentLiabilities);
        setValueIfExists('totalDebt', balance.totalDebt);
        setValueIfExists('shareholdersEquity', balance.totalEquity);
        setValueIfExists('ebit', income.operatingIncome);
        setValueIfExists('interestExpense', income.interestExpense);
        setValueIfExists('operatingCashFlow', cashflow.operatingCashFlow);
        setValueIfExists('capitalExpenditures', cashflow.capitalExpenditure);

        // 📈 RENTABILITÉ
        setValueIfExists('netIncome', income.netIncome);
        setValueIfExists('revenue', income.revenue);
        // NOPAT = EBIT * (1 - taux d'imposition effectif)
        const taxRate = income.incomeTaxExpense && income.incomeBeforeTax ? 
            income.incomeTaxExpense / income.incomeBeforeTax : 0.25;
        const nopat = income.operatingIncome ? income.operatingIncome * (1 - taxRate) : null;
        setValueIfExists('nopat', nopat);

        // 💰 ÉVALUATION
        setValueIfExists('sharePrice', quote.price);
        setValueIfExists('sharesOutstanding', income.weightedAverageShsOut);
        // Valeur comptable par action = Capitaux propres / Nombre d'actions
        const bookValuePerShare = balance.totalEquity && income.weightedAverageShsOut ? 
            balance.totalEquity / income.weightedAverageShsOut : null;
        setValueIfExists('bookValuePerShare', bookValuePerShare);
        setValueIfExists('ebitda', income.ebitda);
        setValueIfExists('cash', balance.cashAndCashEquivalents);

        // 🚀 CROISSANCE (certains champs nécessitent des données historiques)
        // Ces champs resteront peut-être vides ou à remplir manuellement
        // car ils nécessitent des calculs avec des données historiques

        console.log('✅ Données chargées avec succès pour', symbole);
        alert(`✅ Données chargées avec succès pour ${symbole}`);
        
    } catch (erreur) {
        console.error('❌ Erreur lors du chargement:', erreur);
        alert('❌ Erreur lors du chargement: ' + erreur.message);
    } finally {
        bouton.disabled = false;
        bouton.textContent = texteOriginal;
    }
}

// Fonction utilitaire pour définir les valeurs
function setValueIfExists(elementId, value) {
    if (value && document.getElementById(elementId)) {
        document.getElementById(elementId).value = value;
    }
}

// Gestionnaire d'événements pour le bouton
document.addEventListener('DOMContentLoaded', function() {
    const boutonChargement = document.getElementById('chargerAutoDonnees');
    if (boutonChargement) {
        boutonChargement.addEventListener('click', function() {
            const symbole = document.getElementById('autoSymbol').value.trim().toUpperCase();
            if (symbole) {
                peuplerDonneesEntreprise(symbole);
            } else {
                alert('Veuillez entrer un symbole');
            }
        });
    }

    // Permettre Entrée dans le champ symbole
    const champSymbole = document.getElementById('autoSymbol');
    if (champSymbole) {
        champSymbole.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                document.getElementById('chargerAutoDonnees').click();
            }
        });
    }

    // Gestion des onglets (si pas déjà géré)
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Retirer active de tous
            tabButtons.forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            // Activer le bon
            this.classList.add('active');
            const tabId = this.getAttribute('data-tab') + '-tab';
            document.getElementById(tabId).classList.add('active');
        });
    });
});
