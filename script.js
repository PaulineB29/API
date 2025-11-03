document.getElementById('chargerDonnees').addEventListener('click', async function() {
    // 🔑 VOTRE CLÉ API
    const apiKey = 'S9PuvPa0mLK9FlCMS3cUYQjnbndSJFOY';
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
    resultatElement.className = '';
    resultatElement.textContent = '';
    bouton.disabled = true;

    try {
        // Essayer différentes URLs d'API
        const urls = [
            `https://financialmodelingprep.com/api/v3/profile/${symbole}?apikey=${apiKey}`,
            `https://fmpcloud.io/api/v3/profile/${symbole}?apikey=${apiKey}`,
            `https://financialmodelingprep.com/api/v3/quote/${symbole}?apikey=${apiKey}`,
            `https://financialmodelingprep.com/stable/income-statement?symbol=${symbole}&apikey=${apiKey}`
        ];

        let donnees = null;
        let derniereErreur = null;
        let urlUtilisee = '';

        // Essayer chaque URL jusqu'à ce qu'une fonctionne
        for (const url of urls) {
            try {
                console.log('Tentative avec URL:', url);
                const reponse = await fetch(url);
                
                if (reponse.ok) {
                    const donneesBrutes = await reponse.json();
                    
                    // Vérifier si la réponse contient une erreur de l'API
                    if (donneesBrutes['Error Message']) {
                        derniereErreur = `Erreur API: ${donneesBrutes['Error Message']}`;
                        continue;
                    }
                    
                    if (donneesBrutes['Note']) {
                        derniereErreur = `Note API: ${donneesBrutes['Note']}`;
                        continue;
                    }

                    donnees = donneesBrutes;
                    urlUtilisee = url;
                    break;
                    
                } else {
                    derniereErreur = `Erreur HTTP ${reponse.status}: ${reponse.statusText}`;
                    console.error('Erreur avec URL:', url, derniereErreur);
                    
                    // Si c'est une erreur 403, essayer l'URL suivante
                    if (reponse.status === 403) {
                        continue;
                    }
                }
            } catch (erreur) {
                derniereErreur = `Erreur réseau: ${erreur.message}`;
                console.error('Erreur fetch:', erreur);
            }
        }

        if (!donnees) {
            throw new Error(derniereErreur || 'Aucune des URLs API ne fonctionne');
        }

        // Traitement des données selon le type de réponse
        let donneesFormatees = '';
        
        if (urlUtilisee.includes('/profile/')) {
            // Données de profil
            if (!donnees || donnees.length === 0) {
                throw new Error('Aucune donnée de profil trouvée pour ce symbole');
            }
            
            const compagnie = donnees[0];
            donneesFormatees = `
🏢 ${compagnie.companyName} (${compagnie.symbol})

📊 Informations générales:
   • Prix: $${compagnie.price || 'N/A'}
   • Variation: ${compagnie.changes || 'N/A'} (${compagnie.changesPercentage || 'N/A'})
   • MCAP: $${compagnie.mktCap ? (compagnie.mktCap / 1000000000).toFixed(2) + ' milliards' : 'N/A'}

📈 Détails:
   • Secteur: ${compagnie.sector || 'N/A'}
   • Industrie: ${compagnie.industry || 'N/A'}
   • Échange: ${compagnie.exchange || 'N/A'}
   • Site web: ${compagnie.website || 'N/A'}

📍 Description:
${compagnie.description || 'Non disponible'}
            `;
            
        } else if (urlUtilisee.includes('/quote/')) {
            // Données de citation
            if (!donnees || donnees.length === 0) {
                throw new Error('Aucune donnée de citation trouvée pour ce symbole');
            }
            
            const quote = donnees[0];
            donneesFormatees = `
📈 Citation: ${quote.name} (${quote.symbol})

💵 Prix: $${quote.price || 'N/A'}
📊 Variation: ${quote.change || 'N/A'} (${quote.changesPercentage || 'N/A'})
📈 Plus haut: $${quote.dayHigh || 'N/A'}
📉 Plus bas: $${quote.dayLow || 'N/A'}
            `;
            
        } else if (urlUtilisee.includes('/income-statement')) {
            // États financiers
            if (!donnees || donnees.length === 0) {
                throw new Error('Aucun état financier trouvé pour ce symbole');
            }
            
            const dernierEtat = donnees[0];
            donneesFormatees = `
📊 État des revenus: ${symbole}

💰 Revenus: $${(dernierEtat.revenue / 1000000).toFixed(2)}M
💵 Bénéfice brut: $${(dernierEtat.grossProfit / 1000000).toFixed(2)}M
📈 Bénéfice net: $${(dernierEtat.netIncome / 1000000).toFixed(2)}M
📅 Date: ${dernierEtat.date || 'N/A'}
            `;
        }

        resultatElement.textContent = donneesFormatees;
        resultatElement.className = 'success';
        
    } catch (erreur) {
        console.error('Erreur complète:', erreur);
        
        let messageErreur = `❌ Erreur: ${erreur.message}`;
        
        // Messages d'erreur spécifiques
        if (erreur.message.includes('403')) {
            messageErreur += '\n\n🔑 Problème avec la clé API:';
            messageErreur += '\n• Clé invalide ou expirée';
            messageErreur += '\n• Limite de requêtes dépassée (250/jour)';
            messageErreur += '\n• Clé non activée';
            messageErreur += '\n• Vérifiez votre dashboard FMP';
        } else if (erreur.message.includes('404')) {
            messageErreur += '\n\n🔍 Symbole non trouvé';
            messageErreur += '\n• Vérifiez le symbole boursier';
            messageErreur += '\n• Essayez un symbole différent (AAPL, MSFT, etc.)';
        } else if (erreur.message.includes('network') || erreur.message.includes('fetch')) {
            messageErreur += '\n\n🌐 Problème de réseau';
            messageErreur += '\n• Vérifiez votre connexion internet';
            messageErreur += '\n• Problème CORS possible';
        }
        
        resultatElement.textContent = messageErreur;
        resultatElement.className = 'error';
        
    } finally {
        loadingElement.style.display = 'none';
        bouton.disabled = false;
    }
});

// Permettre d'appuyer sur Entrée dans le champ de saisie
document.getElementById('symbolInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        document.getElementById('chargerDonnees').click();
    }
});

// Message d'information au chargement de la page
console.log('🚀 Application FMP API chargée');
console.log('📋 Utilisez le bouton pour récupérer les données financières');
