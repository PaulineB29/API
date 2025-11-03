document.getElementById('chargerDonnees').addEventListener('click', async function() {
    // 🔑 VOTRE CLÉ API
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

// Fonction pour formater et afficher l'état des revenus
function afficherIncomeStatement(data) {
    const formatMillions = (montant) => {
        if (!montant) return 'N/A';
        return `$${(montant / 1000000).toFixed(2)}M`;
    };

    const formatDollars = (montant) => {
        if (!montant) return 'N/A';
        return `$${montant.toLocaleString()}`;
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

// Permettre d'appuyer sur Entrée dans le champ de saisie
document.getElementById('symbolInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        document.getElementById('chargerDonnees').click();
    }
});

console.log('🚀 Application Income Statement chargée');
console.log('💡 Entrez un symbole (AAPL, MSFT, etc.) et cliquez sur le bouton');
