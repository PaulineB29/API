document.getElementById('chargerDonnees').addEventListener('click', function() {
    // 🔑 UTILISEZ VOTRE CLÉ API FOURNIE
    const apiKey = 'S9PuvPa0mLK9FlCMS3cUYQjnbndSJFOY';
    const symbole = document.getElementById('symbolInput').value.toUpperCase();
    
    if (!symbole) {
        alert('Veuillez entrer un symbole boursier');
        return;
    }

    const url = `https://financialmodelingprep.com/api/v3/profile/${symbole}?apikey=${apiKey}`;
    
    // Afficher le loader
    const loadingElement = document.getElementById('loading');
    const resultatElement = document.getElementById('resultat');
    const bouton = document.getElementById('chargerDonnees');
    
    loadingElement.style.display = 'block';
    resultatElement.textContent = '';
    bouton.disabled = true;

    // Faire une requête GET à l'API FMP [citation:1][citation:4]
    fetch(url)
        .then(reponse => {
            if (!reponse.ok) {
                throw new Error(`Erreur HTTP! Statut: ${reponse.status}`);
            }
            return reponse.json();
        })
        .then(donnees => {
            if (!donnees || donnees.length === 0) {
                throw new Error('Aucune donnée trouvée pour ce symbole');
            }
            
            const compagnie = donnees[0];
            // Formater les données de manière lisible
            const donneesFormatees = `
🏢 ${compagnie.companyName} (${compagnie.symbol})

📊 Informations générales:
   • Prix: $${compagnie.price}
   • Variation: ${compagnie.changes} (${compagnie.changesPercentage})
   • MCAP: $${(compagnie.mktCap / 1000000000).toFixed(2)} milliards

📈 Détails:
   • Secteur: ${compagnie.sector}
   • Industrie: ${compagnie.industry}
   • Échange: ${compagnie.exchange}
   • Site web: ${compagnie.website}

📋 Description:
${compagnie.description}

Données brutes JSON:
${JSON.stringify(donnees, null, 2)}
            `;
            
            resultatElement.textContent = donneesFormatees;
        })
        .catch(erreur => {
            console.error('Erreur:', erreur);
            resultatElement.textContent = `❌ Une erreur est survenue: ${erreur.message}`;
        })
        .finally(() => {
            loadingElement.style.display = 'none';
            bouton.disabled = false;
        });
});

// Fonction pour récupérer les états financiers (exemple supplémentaire)
function recupererEtatsFinanciers(symbole, apiKey) {
    const url = `https://financialmodelingprep.com/api/v3/income-statement/${symbole}?limit=5&apikey=${apiKey}`;
    
    return fetch(url)
        .then(reponse => reponse.json())
        .then(donnees => {
            if (donnees && donnees.length > 0) {
                console.log('Dernier état des revenus:', donnees[0]);
                return donnees;
            }
            return null;
        });
}
