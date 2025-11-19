// =============================================================================
// ANALYSE AUTOMATIQUE AVEC GESTION DES ERREURS
// =============================================================================

async function processNextCompany() {
    if (currentAnalysisIndex >= analysisQueue.length) {
        finishAutoAnalysis();
        return;
    }

    const company = analysisQueue[currentAnalysisIndex];
    const progress = ((currentAnalysisIndex + 1) / analysisQueue.length) * 100;

    // Mettre à jour la progression
    updateProgressUI(company, progress);

    try {
        // Analyser cette entreprise
        await analyzeSingleCompany(company.symbol, company.companyName);
        
    } catch (error) {
        console.error(`❌ Erreur sur ${company.symbol}:`, error);
        
        // Déterminer le type d'erreur
        let errorMessage = error.message;
        let errorType = 'error';
        
        if (error.message.includes('non trouvé') || error.message.includes('not found') || error.message.includes('404')) {
            errorMessage = 'Symbole introuvable';
            errorType = 'not-found';
        } else if (error.message.includes('quota') || error.message.includes('limit')) {
            errorMessage = 'Limite API atteinte';
            errorType = 'api-limit';
        } else if (error.message.includes('timeout') || error.message.includes('time out')) {
            errorMessage = 'Timeout - Trop long';
            errorType = 'timeout';
        }
        
        addToAnalysisLog(company.symbol, `❌ ${errorMessage}`, errorType);
        
        // Stocker l'échec dans les résultats
        analysisResults.push({
            symbol: company.symbol,
            companyName: company.companyName,
            error: true,
            errorMessage: errorMessage,
            date: new Date().toISOString()
        });
    }

    // Passer à l'entreprise suivante après un délai
    currentAnalysisIndex++;
    
    // Délai adaptatif selon le type d'erreur
    let delay = 1000; // délai par défaut
    if (analysisQueue[currentAnalysisIndex - 1]?.errorMessage?.includes('Limite API')) {
        delay = 5000; // Délai plus long pour les limites API
    }
    
    await new Promise(resolve => setTimeout(resolve, delay));
    await processNextCompany();
}

// Version robuste de analyzeSingleCompany
async function analyzeSingleCompany(symbol, companyName) {
    addToAnalysisLog(symbol, `🔍 Analyse en cours...`, 'info');

    try {
        // Vérification initiale - timeout global
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout - Analyse trop longue')), 30000);
        });

        // Récupérer les données avec timeout
        const fetchPromise = Promise.all([
            fetchWithErrorHandling(`/profile?symbol=${symbol}`, 'profil'),
            fetchWithErrorHandling(`/quote?symbol=${symbol}`, 'cotation'),
            fetchWithErrorHandling(`/cash-flow-statement?symbol=${symbol}`, 'cash flow'),
            fetchWithErrorHandling(`/income-statement?symbol=${symbol}`, 'compte de résultat'),
            fetchWithErrorHandling(`/balance-sheet-statement?symbol=${symbol}`, 'bilan')
        ]);

        const [profile, quote, cashFlow, incomeStatement, balanceSheet] = 
            await Promise.race([fetchPromise, timeoutPromise]);

        // Vérifier si les données sont valides
        if (!profile || profile.length === 0 || !profile[0]) {
            throw new Error('Profil introuvable');
        }

        if (!quote || quote.length === 0 || !quote[0]) {
            throw new Error('Cotation introuvable');
        }

        const companyData = {
            profile: profile[0],
            quote: quote[0],
            cashFlow: cashFlow?.[0],
            incomeStatement: incomeStatement?.[0],
            balanceSheet: balanceSheet?.[0]
        };

        // Vérifier les données critiques
        if (!companyData.profile.companyName) {
            throw new Error('Données entreprise incomplètes');
        }

        if (!companyData.quote.price || companyData.quote.price === 0) {
            throw new Error('Prix non disponible');
        }

        // Calculer les métriques avec gestion d'erreur
        const metrics = calculateCompanyMetricsSafe(companyData);
        const scores = calculateScores(metrics);
        const totalScore = scores.excellent * 3 + scores.good * 2 + scores.medium;
        const maxScore = (scores.excellent + scores.good + scores.medium + scores.bad) * 3;
        const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

        // Déterminer la recommandation
        let recommendation;
        if (percentage >= 75) recommendation = 'EXCELLENT';
        else if (percentage >= 60) recommendation = 'BON';
        else if (percentage >= 45) recommendation = 'MOYEN';
        else recommendation = 'FAIBLE';

        // Stocker le résultat
        const result = {
            symbol,
            companyName,
            metrics,
            recommendation,
            score: percentage,
            date: new Date().toISOString(),
            success: true
        };

        analysisResults.push(result);

        // Sauvegarder en base de données (optionnel)
        try {
            await sauvegarderAnalyseAutomatique(metrics, recommendation, companyData);
        } catch (saveError) {
            console.warn(`⚠️ Erreur sauvegarde ${symbol}:`, saveError);
            // Ne pas bloquer l'analyse pour une erreur de sauvegarde
        }

        // Afficher le résultat
        const logClass = getRecommendationClass(recommendation);
        addToAnalysisLog(symbol, `${recommendation} (${percentage.toFixed(0)}%) - ${companyName}`, logClass);

        // Mettre à jour les compteurs
        updateResultsCounters();

    } catch (error) {
        // Relancer l'erreur pour la gestion dans processNextCompany
        throw error;
    }
}

// Fonction de fetch avec gestion d'erreur détaillée
async function fetchWithErrorHandling(endpoint, dataType) {
    try {
        const data = await fetchAPI(endpoint);
        
        if (!data) {
            throw new Error(`Données ${dataType} non disponibles`);
        }
        
        if (data.error) {
            throw new Error(`Erreur API: ${data.error}`);
        }
        
        return data;
    } catch (error) {
        // Améliorer le message d'erreur
        if (error.message.includes('404') || error.message.includes('not found')) {
            throw new Error(`${dataType} introuvable`);
        } else if (error.message.includes('401') || error.message.includes('403')) {
            throw new Error(`Accès ${dataType} refusé`);
        } else if (error.message.includes('500') || error.message.includes('503')) {
            throw new Error(`Service ${dataType} indisponible`);
        } else {
            throw new Error(`Erreur ${dataType}: ${error.message}`);
        }
    }
}

// Version sécurisée de calculateCompanyMetrics
function calculateCompanyMetricsSafe(companyData) {
    const { profile, quote, balanceSheet, incomeStatement, cashFlow } = companyData;
    const metrics = {};
    
    // Profitabilité avec vérifications
    try {
        if (incomeStatement?.netIncome && balanceSheet?.totalStockholdersEquity && balanceSheet.totalStockholdersEquity !== 0) {
            metrics.roe = (incomeStatement.netIncome / balanceSheet.totalStockholdersEquity) * 100;
        }
    } catch (e) { metrics.roe = null; }
    
    try {
        if (incomeStatement?.netIncome && incomeStatement?.revenue && incomeStatement.revenue !== 0) {
            metrics.netMargin = (incomeStatement.netIncome / incomeStatement.revenue) * 100;
        }
    } catch (e) { metrics.netMargin = null; }
    
    try {
        if (incomeStatement?.revenue && incomeStatement?.costOfRevenue && incomeStatement.revenue !== 0) {
            metrics.grossMargin = ((incomeStatement.revenue - incomeStatement.costOfRevenue) / incomeStatement.revenue) * 100;
        }
    } catch (e) { metrics.grossMargin = null; }
    
    // Sécurité financière avec vérifications
    try {
        if (balanceSheet?.totalLiabilities && balanceSheet?.totalStockholdersEquity && balanceSheet.totalStockholdersEquity !== 0) {
            metrics.debtToEquity = balanceSheet.totalLiabilities / balanceSheet.totalStockholdersEquity;
        }
    } catch (e) { metrics.debtToEquity = null; }
    
    try {
        if (balanceSheet?.totalCurrentAssets && balanceSheet?.totalCurrentLiabilities && balanceSheet.totalCurrentLiabilities !== 0) {
            metrics.currentRatio = balanceSheet.totalCurrentAssets / balanceSheet.totalCurrentLiabilities;
        }
    } catch (e) { metrics.currentRatio = null; }
    
    try {
        if (incomeStatement?.operatingIncome && incomeStatement?.interestExpense && Math.abs(incomeStatement.interestExpense) > 0) {
            metrics.interestCoverage = incomeStatement.operatingIncome / Math.abs(incomeStatement.interestExpense);
        }
    } catch (e) { metrics.interestCoverage = null; }
    
    // Valuation avec vérifications
    try {
        if (quote?.price && incomeStatement?.epsDiluted && incomeStatement.epsDiluted !== 0) {
            metrics.peRatio = quote.price / incomeStatement.epsDiluted;
        }
    } catch (e) { metrics.peRatio = null; }
    
    try {
        if (incomeStatement?.epsDiluted && quote?.price && quote.price !== 0) {
            metrics.earningsYield = (incomeStatement.epsDiluted / quote.price) * 100;
        }
    } catch (e) { metrics.earningsYield = null; }
    
    // Nettoyer les métriques infinies ou invalides
    Object.keys(metrics).forEach(key => {
        if (metrics[key] === null || 
            metrics[key] === undefined || 
            !isFinite(metrics[key]) || 
            Math.abs(metrics[key]) > 1000000) {
            metrics[key] = null;
        }
    });
    
    return metrics;
}

// Mettre à jour l'interface pour montrer les échecs
function updateResultsCounters() {
    const successResults = analysisResults.filter(r => r.success);
    const errorResults = analysisResults.filter(r => r.error);
    
    const counts = {
        excellent: successResults.filter(r => r.recommendation === 'EXCELLENT').length,
        good: successResults.filter(r => r.recommendation === 'BON').length,
        medium: successResults.filter(r => r.recommendation === 'MOYEN').length,
        bad: successResults.filter(r => r.recommendation === 'FAIBLE').length,
        errors: errorResults.length
    };

    document.getElementById('countExcellent').textContent = counts.excellent;
    document.getElementById('countGood').textContent = counts.good;
    document.getElementById('countMedium').textContent = counts.medium;
    document.getElementById('countBad').textContent = counts.bad;
    
    // Ajouter un compteur d'erreurs si nécessaire
    let errorCounter = document.getElementById('countErrors');
    if (!errorCounter) {
        const resultsSummary = document.querySelector('.results-summary');
        if (resultsSummary) {
            resultsSummary.innerHTML += `<span class="result-error">❌ Erreurs: <span id="countErrors">0</span></span>`;
            errorCounter = document.getElementById('countErrors');
        }
    }
    if (errorCounter) {
        errorCounter.textContent = counts.errors;
    }
}

// Ajouter les styles pour les erreurs
const enhancedCSS = `
.result-error { color: #e74c3c; font-weight: bold; }
.log-not-found { color: #95a5a6; font-style: italic; }
.log-api-limit { color: #e67e22; font-weight: bold; }
.log-timeout { color: #d35400; }
`;

// Injecter le CSS supplémentaire
const enhancedStyle = document.createElement('style');
enhancedStyle.textContent = enhancedCSS;
document.head.appendChild(enhancedStyle);

// Fonction pour filtrer les entreprises problématiques avant l'analyse
function filterCompaniesBeforeAnalysis(companies) {
    return companies.filter(company => {
        // Exclure les symboles vides ou invalides
        if (!company.symbol || company.symbol.length === 0) return false;
        
        // Exclure les symboles trop courts (potentiellement invalides)
        if (company.symbol.length < 2) return false;
        
        // Exclure les symboles avec caractères spéciaux (ajuster selon votre API)
        if (!/^[A-Z0-9.-]+$/.test(company.symbol)) return false;
        
        return true;
    });
}

// Modifier startAutoAnalysis pour inclure le filtrage
async function startAutoAnalysis() {
    if (allCompaniesData.length === 0) {
        alert('Veuillez d\'abord charger les entreprises');
        return;
    }

    // Filtrer les entreprises avant analyse
    const filteredCompanies = filterCompaniesBeforeAnalysis(allCompaniesData);
    
    if (filteredCompanies.length === 0) {
        alert('Aucune entreprise valide à analyser');
        return;
    }

    const originalCount = allCompaniesData.length;
    const filteredCount = filteredCompanies.length;
    
    if (filteredCount < originalCount) {
        if (!confirm(`${originalCount - filteredCount} entreprises ont été exclues (symboles invalides).\nAnalyser les ${filteredCount} entreprises restantes ?`)) {
            return;
        }
    } else {
        if (!confirm(`Voulez-vous analyser ${filteredCount} entreprises ? Cela peut prendre plusieurs minutes.`)) {
            return;
        }
    }

    // Préparer la file d'attente avec les entreprises filtrées
    analysisQueue = filteredCompanies;
    currentAnalysisIndex = 0;
    analysisResults = [];

    // Créer l'interface de progression
    createAnalysisProgressUI();

    // Démarrer l'analyse
    await processNextCompany();
}
