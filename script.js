// VOTRE CLÉ API
const API_KEY = 'S9PuvPa0mLK9FlCMS3cUYQjnbndSJFOY';

// ==================== FONCTIONS POUR LE CHARGEMENT AUTOMATIQUE ====================

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

// ==================== FONCTIONS POUR L'ÉTAT DES REVENUS ====================

function afficherIncomeStatement(data) {
    const formatMillions = (montant) => {
        if (!montant) return 'N/A';
        return `$${(montant / 1000000).toFixed(2)}M`;
    };

    const html = `
        <div class="income-statement">
            <div class="statement-header">
                <h2>🏢 ${data.symbol} - État des Revenus</h2>
                <p>Période: ${data.period} ${data.fiscalYear} (${data.date})</p>
            </div>
            
            <div class="statement-section">
                <div class="statement-section-title">💰 REVENUS ET BÉNÉFICE BRUT</div>
                
                <div class="statement-row">
                    <span class="statement-label">Revenus totaux:</span>
                    <span class="statement-value">${formatMillions(data.revenue)}</span>
                </div>
                <div class="statement-row">
                    <span class="statement-label">Coût des revenus:</span>
                    <span class="statement-value">${formatMillions(data.costOfRevenue)}</span>
                </div>
                <div class="statement-row">
                    <span class="statement-label">Bénéfice brut:</span>
                    <span class="statement-value" style="color: #27ae60;">${formatMillions(data.grossProfit)}</span>
                </div>
            </div>
            
            <div class="statement-section">
                <div class="statement-section-title">📊 DÉPENSES OPÉRATIONNELLES</div>
                
                <div class="statement-row">
                    <span class="statement-label">Recherche & Développement:</span>
                    <span class="statement-value">${formatMillions(data.researchAndDevelopmentExpenses)}</span>
                </div>
                <div class="statement-row">
                    <span class="statement-label">Frais généraux & admin:</span>
                    <span class="statement-value">${formatMillions(data.sellingGeneralAndAdministrativeExpenses)}</span>
                </div>
                <div class="statement-row">
                    <span class="statement-label">Dépenses opérationnelles totales:</span>
                    <span class="statement-value">${formatMillions(data.operatingExpenses)}</span>
                </div>
            </div>
            
            <div class="statement-section">
                <div class="statement-section-title">📈 RÉSULTATS OPÉRATIONNELS</div>
                
                <div class="statement-row">
                    <span class="statement-label">Résultat opérationnel (EBIT):</span>
                    <span class="statement-value" style="color: #27ae60;">${formatMillions(data.operatingIncome)}</span>
                </div>
                <div class="statement-row">
                    <span class="statement-label">EBITDA:</span>
                    <span class="statement-value">${formatMillions(data.ebitda)}</span>
                </div>
            </div>
            
            <div class="statement-section">
                <div class="statement-section-title">💵 RÉSULTAT NET</div>
                
                <div class="statement-row">
                    <span class="statement-label">Résultat avant impôts:</span>
                    <span class="statement-value">${formatMillions(data.incomeBeforeTax)}</span>
                </div>
                <div class="statement-row">
                    <span class="statement-label">Impôts sur le revenu:</span>
                    <span class="statement-value">${formatMillions(data.incomeTaxExpense)}</span>
                </div>
                <div class="statement-row">
                    <span class="statement-label">RÉSULTAT NET:</span>
                    <span class="statement-value" style="color: #e74c3c; font-size: 18px;">${formatMillions(data.netIncome)}</span>
                </div>
            </div>
            
            <div class="statement-section">
                <div class="statement-section-title">📊 INDICATEURS PAR ACTION</div>
                
                <div class="statement-row">
                    <span class="statement-label">Bénéfice par action (EPS):</span>
                    <span class="statement-value">$${data.eps || 'N/A'}</span>
                </div>
                <div class="statement-row">
                    <span class="statement-label">EPS dilué:</span>
                    <span class="statement-value">$${data.epsDiluted || 'N/A'}</span>
                </div>
                <div class="statement-row">
                    <span class="statement-label">Actions en circulation:</span>
                    <span class="statement-value">${data.weightedAverageShsOut ? (data.weightedAverageShsOut / 1000000).toFixed(2) + 'M' : 'N/A'}</span>
                </div>
            </div>
            
            <div class="statement-section" style="background-color: #e8f6f3; text-align: center;">
                <div style="font-size: 14px; color: #7f8c8d;">
                    Données mises à jour: ${data.filingDate || data.date} | Devise: ${data.reportedCurrency}
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('resultat').innerHTML = html;
}

// ==================== GESTIONNAIRES D'ÉVÉNEMENTS ====================

// Pour le chargement automatique des données
document.getElementById('chargerAutoDonnees').addEventListener('click', function() {
    const symbole = document.getElementById('autoSymbol').value.trim().toUpperCase();
    if (symbole) {
        peuplerDonneesEntreprise(symbole);
    } else {
        alert('Veuillez entrer un symbole');
    }
});

// Pour l'état des revenus (votre fonction originale)
document.getElementById('chargerDonnees').addEventListener('click', async function() {
    const API_KEY = 'S9PuvPa0mLK9FlCMS3cUYQjnbndSJFOY';
    const symbole = document.getElementById('symbolInput').value.toUpperCase().trim();
    
    if (!symbole) {
        alert('Veuillez entrer un symbole boursier');
        return;
    }

    const loadingElement = document.getElementById('loading');
    const resultatElement = document.getElementById('resultat');
    const bouton = document.getElementById('chargerDonnees');
    
    // Réinitialiser l'affichage
    loadingElement.style.display = 'block';
    resultatElement.innerHTML = '';
    bouton.disabled = true;

    try {
        // 📍 ENDPOINT SPÉCIFIQUE POUR INCOME STATEMENT
        const url = `https://financialmodelingprep.com/stable/income-statement?symbol=${symbole}&apikey=${API_KEY}`;
        console.log('🔄 Requête URL:', url);

        const reponse = await fetch(url);
        
        if (!reponse.ok) {
            throw new Error(`Erreur HTTP ${reponse.status}: ${reponse.statusText}`);
        }

        const donnees = await reponse.json();
        
        // Vérifier si on a des données
        if (!donnees || donnees.length === 0) {
            throw new Error(`Aucun état des revenus trouvé pour le symbole "${symbole}"`);
        }

        // Prendre le dernier état des revenus (le plus récent)
        const incomeStatement = donnees[0];
        
        // Afficher les données formatées
        afficherIncomeStatement(incomeStatement);
        
    } catch (erreur) {
        console.error('Erreur:', erreur);
        
        let messageErreur = `❌ Erreur: ${erreur.message}`;
        
        if (erreur.message.includes('403')) {
            messageErreur = `
                ❌ Erreur 403 - Accès refusé
                
                Problèmes possibles:
                • Clé API invalide ou expirée
                • Limite de requêtes dépassée (250/jour)
                • Clé non activée
                
                Vérifiez votre dashboard FMP: https://site.financialmodelingprep.com/dashboard
            `;
        }
        
        resultatElement.innerHTML = `<div class="error">${messageErreur}</div>`;
        
    } finally {
        loadingElement.style.display = 'none';
        bouton.disabled = false;
    }
});

// ==================== ÉVÉNEMENTS AU CHARGEMENT DE LA PAGE ====================

document.addEventListener('DOMContentLoaded', function() {
    // Permettre Entrée dans les champs symbole
    document.getElementById('autoSymbol').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            document.getElementById('chargerAutoDonnees').click();
        }
    });

    document.getElementById('symbolInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            document.getElementById('chargerDonnees').click();
        }
    });

    console.log('🚀 Application FMP chargée - Prête à utiliser !');
});
