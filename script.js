// VOTRE CLÉ API
const API_KEY = 'S9PuvPa0mLK9FlCMS3cUYQjnbndSJFOY';

// Fonction principale pour collecter toutes les données
async function collecterDonneesEntreprise(symbole) {
    const bouton = document.getElementById('collecterDonnees');
    const loadingElement = document.getElementById('loading');
    const resultatsElement = document.getElementById('resultats');
    const texteOriginal = bouton.textContent;
    
    try {
        // Préparer l'interface
        bouton.disabled = true;
        bouton.textContent = 'Collecte en cours...';
        loadingElement.style.display = 'block';
        resultatsElement.innerHTML = '';
        
        console.log('🔄 Début de la collecte pour:', symbole);

        // Collecter toutes les données en parallèle
        const [
            incomeData, 
            balanceData, 
            cashflowData, 
            quoteData, 
            profileData,
            metricsData
        ] = await Promise.all([
            fetch(`https://financialmodelingprep.com/stable/income-statement?symbol=${symbole}&apikey=${API_KEY}`).then(r => r.json()),
            fetch(`https://financialmodelingprep.com/stable/balance-sheet-statement?symbol=${symbole}&apikey=${API_KEY}`).then(r => r.json()),
            fetch(`https://financialmodelingprep.com/stable/cash-flow-statement?symbol=${symbole}&apikey=${API_KEY}`).then(r => r.json()),
            fetch(`https://financialmodelingprep.com/stable/quote?symbol=${symbole}&apikey=${API_KEY}`).then(r => r.json()),
            fetch(`https://financialmodelingprep.com/stable/profile?symbol=${symbole}&apikey=${API_KEY}`).then(r => r.json()),
            fetch(`https://financialmodelingprep.com/stable/key-metrics?symbol=${symbole}&apikey=${API_KEY}`).then(r => r.json())
        ]);

        // Vérifier les données
        if (!incomeData || incomeData.length === 0) throw new Error('Aucune donnée de revenus trouvée');
        if (!balanceData || balanceData.length === 0) throw new Error('Aucune donnée de bilan trouvée');
        if (!cashflowData || cashflowData.length === 0) throw new Error('Aucune donnée de flux de trésorerie trouvée');
        if (!quoteData || quoteData.length === 0) throw new Error('Aucune donnée de cotation trouvée');

        // Prendre les données les plus récentes
        const income = incomeData[0];
        const balance = balanceData[0];
        const cashflow = cashflowData[0];
        const quote = quoteData[0];
        const profile = profileData[0] || {};
        const metrics = metricsData[0] || {};

        console.log('📊 Données collectées avec succès');

        // Afficher toutes les données
        afficherToutesLesDonnees({
            symbole,
            income,
            balance,
            cashflow,
            quote,
            profile,
            metrics
        });
        
    } catch (erreur) {
        console.error('❌ Erreur lors de la collecte:', erreur);
        resultatsElement.innerHTML = `
            <div class="error">
                <h3>❌ Erreur de collecte</h3>
                <p>${erreur.message}</p>
                ${erreur.message.includes('403') ? `
                    <p><strong>Problème d'authentification API:</strong></p>
                    <ul>
                        <li>Clé API invalide ou expirée</li>
                        <li>Limite de requêtes dépassée (250/jour)</li>
                        <li>Vérifiez votre dashboard FMP</li>
                    </ul>
                ` : ''}
            </div>
        `;
    } finally {
        bouton.disabled = false;
        bouton.textContent = texteOriginal;
        loadingElement.style.display = 'none';
    }
}

// Fonction pour formater les grands nombres
function formaterMontant(montant) {
    if (!montant && montant !== 0) return 'N/A';
    
    if (Math.abs(montant) >= 1000000000) {
        return `$${(montant / 1000000000).toFixed(2)} Md`;
    } else if (Math.abs(montant) >= 1000000) {
        return `$${(montant / 1000000).toFixed(2)} M`;
    } else if (Math.abs(montant) >= 1000) {
        return `$${(montant / 1000).toFixed(2)} k`;
    } else {
        return `$${montant.toFixed(2)}`;
    }
}

// Fonction pour formater les pourcentages
function formaterPourcentage(valeur) {
    if (!valeur && valeur !== 0) return 'N/A';
    return `${valeur.toFixed(2)}%`;
}

// Fonction pour afficher toutes les données collectées
function afficherToutesLesDonnees(donnees) {
    const { symbole, income, balance, cashflow, quote, profile, metrics } = donnees;
    
    const html = `
        <!-- EN-TÊTE AVEC INFOS GÉNÉRALES -->
        <div class="data-section">
            <div class="section-header" onclick="toggleSection('general')">
                <h2>🏢 ${profile.companyName || symbole} - Informations Générales</h2>
                <span>📈</span>
            </div>
            <div class="section-content" id="general">
                <div class="metrics-grid">
                    <div class="metric-card valuation">
                        <h4>Prix Actuel</h4>
                        <p class="metric-value">$${quote.price || 'N/A'}</p>
                        <p class="metric-description">Variation: ${quote.change || 'N/A'} (${quote.changesPercentage || 'N/A'})</p>
                    </div>
                    <div class="metric-card valuation">
                        <h4>Capitalisation Boursière</h4>
                        <p class="metric-value">${formaterMontant(quote.marketCap)}</p>
                        <p class="metric-description">Volume: ${quote.volume ? (quote.volume / 1000000).toFixed(2) + 'M' : 'N/A'}</p>
                    </div>
                    <div class="metric-card financial">
                        <h4>Secteur & Industrie</h4>
                        <p class="metric-value">${profile.sector || 'N/A'}</p>
                        <p class="metric-description">${profile.industry || 'N/A'}</p>
                    </div>
                    <div class="metric-card financial">
                        <h4>Pays & Bourse</h4>
                        <p class="metric-value">${profile.country || 'N/A'}</p>
                        <p class="metric-description">${profile.exchange || 'N/A'}</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- ÉTAT DES REVENUS -->
        <div class="data-section">
            <div class="section-header" onclick="toggleSection('income')">
                <h2>💰 État des Revenus - ${income.period} ${income.fiscalYear}</h2>
                <span>📊</span>
            </div>
            <div class="section-content" id="income">
                <table class="data-table">
                    <tr>
                        <th>Poste</th>
                        <th>Valeur</th>
                    </tr>
                    <tr>
                        <td>Revenus totaux</td>
                        <td class="data-value">${formaterMontant(income.revenue)}</td>
                    </tr>
                    <tr>
                        <td>Coût des revenus</td>
                        <td class="data-value">${formaterMontant(income.costOfRevenue)}</td>
                    </tr>
                    <tr>
                        <td>Bénéfice brut</td>
                        <td class="data-value">${formaterMontant(income.grossProfit)}</td>
                    </tr>
                    <tr>
                        <td>Dépenses opérationnelles</td>
                        <td class="data-value">${formaterMontant(income.operatingExpenses)}</td>
                    </tr>
                    <tr>
                        <td>Résultat opérationnel (EBIT)</td>
                        <td class="data-value">${formaterMontant(income.operatingIncome)}</td>
                    </tr>
                    <tr>
                        <td>Résultat net</td>
                        <td class="data-value">${formaterMontant(income.netIncome)}</td>
                    </tr>
                    <tr>
                        <td>Bénéfice par action (EPS)</td>
                        <td class="data-value">$${income.eps || 'N/A'}</td>
                    </tr>
                </table>
            </div>
        </div>

        <!-- BILAN -->
        <div class="data-section">
            <div class="section-header" onclick="toggleSection('balance')">
                <h2>🏦 Bilan - ${balance.date || 'Dernière période'}</h2>
                <span>📋</span>
            </div>
            <div class="section-content" id="balance">
                <table class="data-table">
                    <tr>
                        <th>Poste</th>
                        <th>Valeur</th>
                    </tr>
                    <tr>
                        <td>Trésorerie et équivalents</td>
                        <td class="data-value">${formaterMontant(balance.cashAndCashEquivalents)}</td>
                    </tr>
                    <tr>
                        <td>Actifs totaux</td>
                        <td class="data-value">${formaterMontant(balance.totalAssets)}</td>
                    </tr>
                    <tr>
                        <td>Dette totale</td>
                        <td class="data-value">${formaterMontant(balance.totalDebt)}</td>
                    </tr>
                    <tr>
                        <td>Passifs totaux</td>
                        <td class="data-value">${formaterMontant(balance.totalLiabilities)}</td>
                    </tr>
                    <tr>
                        <td>Capitaux propres</td>
                        <td class="data-value">${formaterMontant(balance.totalEquity)}</td>
                    </tr>
                </table>
            </div>
        </div>

        <!-- FLUX DE TRÉSORERIE -->
        <div class="data-section">
            <div class="section-header" onclick="toggleSection('cashflow')">
                <h2>💸 Flux de Trésorerie</h2>
                <span>🔄</span>
            </div>
            <div class="section-content" id="cashflow">
                <table class="data-table">
                    <tr>
                        <th>Type de flux</th>
                        <th>Valeur</th>
                    </tr>
                    <tr>
                        <td>Flux opérationnel</td>
                        <td class="data-value">${formaterMontant(cashflow.operatingCashFlow)}</td>
                    </tr>
                    <tr>
                        <td>Flux d'investissement</td>
                        <td class="data-value">${formaterMontant(cashflow.investingCashFlow)}</td>
                    </tr>
                    <tr>
                        <td>Flux de financement</td>
                        <td class="data-value">${formaterMontant(cashflow.financingCashFlow)}</td>
                    </tr>
                    <tr>
                        <td>Dépenses en capital</td>
                        <td class="data-value">${formaterMontant(cashflow.capitalExpenditure)}</td>
                    </tr>
                </table>
            </div>
        </div>

        <!-- MÉTRIQUES CLÉS -->
        <div class="data-section">
            <div class="section-header" onclick="toggleSection('ratios')">
                <h2>📈 Ratios et Métriques Clés</h2>
                <span>🎯</span>
            </div>
            <div class="section-content" id="ratios">
                <div class="metrics-grid">
                    <div class="metric-card financial">
                        <h4>ROE (Return on Equity)</h4>
                        <p class="metric-value">${formaterPourcentage(metrics.roe)}</p>
                        <p class="metric-description">Rentabilité des capitaux propres</p>
                    </div>
                    <div class="metric-card financial">
                        <h4>ROA (Return on Assets)</h4>
                        <p class="metric-value">${formaterPourcentage(metrics.returnOnAssets)}</p>
                        <p class="metric-description">Rentabilité des actifs</p>
                    </div>
                    <div class="metric-card valuation">
                        <h4>P/E Ratio</h4>
                        <p class="metric-value">${metrics.peRatio || 'N/A'}</p>
                        <p class="metric-description">Ratio Prix/Bénéfice</p>
                    </div>
                    <div class="metric-card valuation">
                        <h4>P/B Ratio</h4>
                        <p class="metric-value">${metrics.pbRatio || 'N/A'}</p>
                        <p class="metric-description">Ratio Prix/Valeur comptable</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('resultats').innerHTML = html;
}

// Fonction pour ouvrir/fermer les sections
function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    section.classList.toggle('expanded');
}

// Gestionnaire d'événements pour le bouton de collecte
document.getElementById('collecterDonnees').addEventListener('click', function() {
    const symbole = document.getElementById('symbolInput').value.trim().toUpperCase();
    if (symbole) {
        collecterDonneesEntreprise(symbole);
    } else {
        alert('Veuillez entrer un symbole boursier');
    }
});

// Permettre d'appuyer sur Entrée
document.getElementById('symbolInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        document.getElementById('collecterDonnees').click();
    }
});

// Ouvrir la première section par défaut
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Application de collecte de données financières chargée');
});
