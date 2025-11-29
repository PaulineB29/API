import React, { useState, useEffect } from 'https://esm.sh/react@18'
import ReactDOM from 'https://esm.sh/react-dom@18/client'

// Configuration API
const API_KEY = 'S9PuvPa0mLK9FlCMS3cUYQjnbndSJFOY';
const BASE_URL = 'https://financialmodelingprep.com/stable';

// Composant principal
const InvestmentAnalyzer = () => {
    const [activeTab, setActiveTab] = useState('search');
    const [symbol, setSymbol] = useState('AAPL');
    const [companyData, setCompanyData] = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showCompaniesModal, setShowCompaniesModal] = useState(false);
    const [allCompanies, setAllCompanies] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Fonction pour récupérer les données
    const fetchCompanyData = async (symbolToFetch = symbol) => {
        setLoading(true);
        setError(null);
        
        try {
            console.log(`Récupération des données pour ${symbolToFetch}...`);
            
            const [profile, quote, cashFlow, incomeStatement, balanceSheet, historicalData] = await Promise.all([
                fetchAPI(`/profile?symbol=${symbolToFetch}`),
                fetchAPI(`/quote?symbol=${symbolToFetch}`),
                fetchAPI(`/cash-flow-statement?symbol=${symbolToFetch}`),
                fetchAPI(`/income-statement?symbol=${symbolToFetch}`),
                fetchAPI(`/balance-sheet-statement?symbol=${symbolToFetch}`),
                fetchHistoricalData(symbolToFetch)
            ]);

            if (!profile || profile.length === 0) {
                throw new Error('Symbole non trouvé ou données indisponibles');
            }

            const data = {
                profile: profile[0],
                quote: quote[0],
                cashFlow: cashFlow[0],
                incomeStatement: incomeStatement[0],
                balanceSheet: balanceSheet[0],
                historicalData: historicalData
            };

            setCompanyData(data);
            setActiveTab('data');
            
        } catch (error) {
            console.error('Erreur détaillée:', error);
            setError(`Erreur: ${error.message}. Vérifiez le symbole et votre connexion.`);
        } finally {
            setLoading(false);
        }
    };

    const fetchAPI = async (endpoint) => {
        const separator = endpoint.includes('?') ? '&' : '?';
        const url = `${BASE_URL}${endpoint}${separator}apikey=${API_KEY}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Erreur API: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (Array.isArray(data) && data.length === 0) {
            throw new Error('Aucune donnée disponible');
        }
        
        return data;
    };

    const fetchHistoricalData = async (symbol) => {
        try {
            return await fetchAPI(`/income-statement?symbol=${symbol}`);
        } catch (error) {
            console.error('Erreur historique:', error);
            return null;
        }
    };

    // Fonction d'analyse
    const performAnalysis = () => {
        if (!companyData) return;

        const metrics = calculateMetrics();
        const secteur = companyData.profile.sector || 'General';
        const advancedScores = calculateAdvancedScores(metrics, secteur);
        const percentage = advancedScores.total;
        
        let recommendation;
        if (percentage >= 80) recommendation = 'EXCELLENT';
        else if (percentage >= 65) recommendation = 'BON';
        else if (percentage >= 50) recommendation = 'MOYEN';
        else recommendation = 'FAIBLE';

        setAnalysis({
            metrics,
            recommendation,
            advancedScores,
            percentage
        });
        setActiveTab('analysis');
    };

    // Charger toutes les entreprises
    const loadAllCompanies = async () => {
        setLoading(true);
        try {
            const companies = await fetchAPI('/stock-list?');
            setAllCompanies(companies || []);
            setShowCompaniesModal(true);
        } catch (error) {
            console.error('Erreur chargement entreprises:', error);
            setError('Erreur lors du chargement des entreprises');
        } finally {
            setLoading(false);
        }
    };

    // Sélectionner une entreprise
    const selectCompany = (companySymbol) => {
        setSymbol(companySymbol);
        setShowCompaniesModal(false);
        setSearchTerm('');
        fetchCompanyData(companySymbol);
    };

    // Filtrer les entreprises
    const filteredCompanies = allCompanies.filter(company => 
        company.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (company.companyName && company.companyName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return React.createElement('div', { className: 'min-h-screen bg-gray-900 text-white' },
        React.createElement('div', { className: 'max-w-7xl mx-auto p-4' },
            [
                // Header
                React.createElement('div', { 
                    className: 'glass-header mb-6',
                    key: 'header'
                },
                    [
                        React.createElement('div', {
                            className: 'flex items-center gap-4',
                            key: 'title-section'
                        },
                            [
                                React.createElement('div', {
                                    className: 'header-icon text-2xl',
                                    key: 'icon'
                                }, '📈'),
                                
                                React.createElement('div', { key: 'title-text' },
                                    [
                                        React.createElement('h1', { 
                                            className: 'text-3xl font-bold text-white mb-2',
                                            key: 'main-title'
                                        }, 'Analyse par action'),
                                        React.createElement('p', {
                                            className: 'text-gray-300 text-lg',
                                            key: 'subtitle'
                                        }, 'Analyse fondamentale selon les méthodes de Warren Buffett')
                                    ]
                                )
                            ]
                        )
                    ]
                ),

                // Onglets
                React.createElement('div', { 
                    className: 'tabs-container mb-6',
                    key: 'tabs'
                },
                    React.createElement('div', { className: 'tabs' },
                        [
                            React.createElement('button', {
                                key: 'search',
                                onClick: () => setActiveTab('search'),
                                className: `tab tab-gradient ${activeTab === 'search' ? 'active' : ''}`
                            }, '🔍 Recherche'),
                            companyData && React.createElement('button', {
                                key: 'data',
                                onClick: () => setActiveTab('data'),
                                className: `tab tab-gradient ${activeTab === 'data' ? 'active' : ''}`
                            }, '📊 Données'),
                            analysis && React.createElement('button', {
                                key: 'analysis',
                                onClick: () => setActiveTab('analysis'),
                                className: `tab tab-gradient ${activeTab === 'analysis' ? 'active' : ''}`
                            }, '🎯 Analyse Buffett')
                        ]
                    )
                ),

                // Contenu des onglets
                activeTab === 'search' && React.createElement(SearchTab, {
                    key: 'search-tab',
                    symbol: symbol,
                    setSymbol: setSymbol,
                    fetchCompanyData: fetchCompanyData,
                    loadAllCompanies: loadAllCompanies,
                    loading: loading
                }),

                activeTab === 'data' && companyData && React.createElement(DataTab, {
                    key: 'data-tab',
                    companyData: companyData,
                    performAnalysis: performAnalysis,
                    loading: loading
                }),

                activeTab === 'analysis' && analysis && React.createElement(AnalysisTab, {
                    key: 'analysis-tab',
                    analysis: analysis,
                    companyData: companyData
                }),

                // Loading
                loading && React.createElement('div', {
                    className: 'fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50',
                    key: 'loading'
                },
                    [
                        React.createElement('div', { 
                            className: 'animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4',
                            key: 'spinner'
                        }),
                        React.createElement('p', { 
                            className: 'text-white text-lg',
                            key: 'text'
                        }, 'Chargement des données...')
                    ]
                ),

                // Error
                error && React.createElement('div', {
                    className: 'bg-red-600 text-white p-4 rounded-lg mb-6',
                    key: 'error'
                },
                    [
                        React.createElement('p', { key: 'message' }, error),
                        React.createElement('button', {
                            onClick: () => setError(null),
                            className: 'mt-2 px-4 py-2 bg-red-700 rounded hover:bg-red-800',
                            key: 'close-btn'
                        }, 'Fermer')
                    ]
                ),

                // Modal entreprises
                showCompaniesModal && React.createElement(CompaniesModal, {
                    key: 'companies-modal',
                    companies: filteredCompanies,
                    searchTerm: searchTerm,
                    setSearchTerm: setSearchTerm,
                    selectCompany: selectCompany,
                    onClose: () => setShowCompaniesModal(false)
                })
            ]
        )
    );
};

// Composant Onglet Recherche
const SearchTab = ({ symbol, setSymbol, fetchCompanyData, loadAllCompanies, loading }) => {
    const handleSubmit = (e) => {
        e.preventDefault();
        fetchCompanyData();
    };

    return React.createElement('div', { className: 'glass-main p-6' },
        [
            React.createElement('form', {
                onSubmit: handleSubmit,
                className: 'space-y-6',
                key: 'search-form'
            },
                [
                    React.createElement('div', { key: 'input-group' },
                        [
                            React.createElement('label', {
                                className: 'block text-sm font-medium text-gray-300 mb-2',
                                key: 'label'
                            }, 'Symbole boursier'),
                            
                            React.createElement('div', {
                                className: 'flex gap-3',
                                key: 'input-container'
                            },
                                [
                                    React.createElement('input', {
                                        type: 'text',
                                        value: symbol,
                                        onChange: (e) => setSymbol(e.target.value.toUpperCase()),
                                        placeholder: 'Ex: AAPL, MSFT, GOOGL...',
                                        className: 'flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none',
                                        key: 'input'
                                    }),
                                    
                                    React.createElement('button', {
                                        type: 'submit',
                                        disabled: loading,
                                        className: 'px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50',
                                        key: 'submit-btn'
                                    }, loading ? 'Chargement...' : 'Analyser')
                                ]
                            )
                        ]
                    ),

                    React.createElement('div', {
                        className: 'flex justify-center',
                        key: 'companies-btn'
                    },
                        React.createElement('button', {
                            type: 'button',
                            onClick: loadAllCompanies,
                            disabled: loading,
                            className: 'px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 flex items-center gap-2',
                            key: 'companies-btn'
                        }, '📋 Voir toutes les entreprises')
                    )
                ]
            )
        ]
    );
};

// Composant Onglet Données
const DataTab = ({ companyData, performAnalysis, loading }) => {
    const { profile, quote, balanceSheet, incomeStatement, cashFlow, historicalData } = companyData;

    return React.createElement('div', { className: 'space-y-6' },
        [
            // En-tête entreprise
            React.createElement('div', { 
                className: 'glass-main p-6',
                key: 'company-header'
            },
                [
                    React.createElement('div', {
                        className: 'flex items-center justify-between',
                        key: 'header-content'
                    },
                        [
                            React.createElement('div', { key: 'company-info' },
                                [
                                    React.createElement('h2', {
                                        className: 'text-2xl font-bold text-white',
                                        key: 'name'
                                    }, profile.companyName),
                                    React.createElement('p', {
                                        className: 'text-gray-300',
                                        key: 'symbol'
                                    }, `${profile.symbol} • ${profile.sector}`)
                                ]
                            ),
                            
                            React.createElement('div', {
                                className: 'text-right',
                                key: 'price-info'
                            },
                                [
                                    React.createElement('p', {
                                        className: 'text-xl font-bold text-white',
                                        key: 'price'
                                    }, `$${quote.price?.toFixed(2)}`),
                                    React.createElement('p', {
                                        className: 'text-gray-300',
                                        key: 'market-cap'
                                    }, `Market Cap: $${formatNumber(quote.marketCap)}`)
                                ]
                            )
                        ]
                    )
                ]
            ),

            // Grille de données
            React.createElement('div', {
                className: 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6',
                key: 'data-grid'
            },
                [
                    createDataCard('📊 Données de base', createBasicDataHTML(profile, quote, incomeStatement)),
                    createDataCard('💰 Bilan', createBalanceSheetHTML(balanceSheet)),
                    createDataCard('📈 Compte de résultat', createIncomeStatementHTML(incomeStatement)),
                    createDataCard('💸 Flux de trésorerie', createCashFlowHTML(cashFlow)),
                    createDataCard('📊 Historique CA (10 ans)', createHistoricalDataHTML(historicalData))
                ]
            ),

            // Bouton analyse
            React.createElement('div', {
                className: 'flex justify-center',
                key: 'analyze-btn'
            },
                React.createElement('button', {
                    onClick: performAnalysis,
                    disabled: loading,
                    className: 'px-8 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-lg font-semibold disabled:opacity-50',
                    key: 'analyze-btn'
                }, '🎯 Lancer l\'analyse Buffett')
            )
        ]
    );
};

// Composant Onglet Analyse
const AnalysisTab = ({ analysis, companyData }) => {
    const { metrics, recommendation, advancedScores, percentage } = analysis;
    const { profile } = companyData;

    return React.createElement('div', { className: 'space-y-6' },
        [
            // Score global
            React.createElement('div', { 
                className: 'glass-main p-6',
                key: 'global-score'
            },
                [
                    React.createElement('div', {
                        className: 'flex items-center justify-between mb-4',
                        key: 'header'
                    },
                        [
                            React.createElement('h2', {
                                className: 'text-2xl font-bold text-white',
                                key: 'title'
                            }, `Analyse - ${profile.companyName}`),
                            React.createElement('span', {
                                className: 'text-sm text-gray-400',
                                key: 'sector'
                            }, profile.sector)
                        ]
                    ),

                    React.createElement('div', {
                        className: 'global-score-modern',
                        key: 'score-content'
                    },
                        [
                            React.createElement('div', {
                                className: 'score-main-modern',
                                key: 'score'
                            },
                                [
                                    React.createElement('div', {
                                        className: 'score-value-modern',
                                        key: 'value'
                                    }, `${percentage}%`),
                                    React.createElement('div', {
                                        className: 'score-label-modern',
                                        key: 'label'
                                    }, 'Score Buffett')
                                ]
                            ),

                            React.createElement('div', {
                                className: `rating-badge-modern ${recommendation.toLowerCase()}`,
                                key: 'rating'
                            }, recommendation),

                            React.createElement('div', {
                                className: 'score-details-modern',
                                key: 'details'
                            },
                                [
                                    React.createElement('div', {
                                        className: 'details-text-modern',
                                        key: 'text'
                                    }, getRecommendationText(recommendation)),
                                    React.createElement('div', {
                                        className: 'recommendation-modern',
                                        key: 'sector-note'
                                    }, getSectorNote(advancedScores.adjustments))
                                ]
                            )
                        ]
                    )
                ]
            ),

            // Métriques détaillées
            React.createElement('div', {
                className: 'grid grid-cols-1 lg:grid-cols-2 gap-6',
                key: 'metrics-grid'
            },
                [
                    createAnalysisSection('📈 Profitabilité', advancedScores.categories.profitability, metrics, [
                        { key: 'roe', name: 'ROE', value: metrics.roe, format: 'percent', excellent: 20, good: 15, medium: 10 },
                        { key: 'netMargin', name: 'Marge Nette', value: metrics.netMargin, format: 'percent', excellent: 20, good: 15, medium: 10 },
                        { key: 'roic', name: 'ROIC', value: metrics.roic, format: 'percent', excellent: 15, good: 10, medium: 8 }
                    ]),

                    createAnalysisSection('🛡️ Sécurité', advancedScores.categories.safety, metrics, [
                        { key: 'debtToEquity', name: 'Dette/Equity', value: metrics.debtToEquity, format: 'number', excellent: 0.3, good: 0.5, medium: 1.0, reverse: true },
                        { key: 'currentRatio', name: 'Current Ratio', value: metrics.currentRatio, format: 'number', excellent: 2.0, good: 1.5, medium: 1.0 },
                        { key: 'interestCoverage', name: 'Couverture Intérêts', value: metrics.interestCoverage, format: 'number', excellent: 10, good: 5, medium: 3 }
                    ]),

                    createAnalysisSection('💰 Valorisation', advancedScores.categories.valuation, metrics, [
                        { key: 'peRatio', name: 'P/E Ratio', value: metrics.peRatio, format: 'number', excellent: 10, good: 15, medium: 25, reverse: true },
                        { key: 'earningsYield', name: 'Earnings Yield', value: metrics.earningsYield, format: 'percent', excellent: 10, good: 6, medium: 4 },
                        { key: 'priceToFCF', name: 'Price/FCF', value: metrics.priceToFCF, format: 'number', excellent: 10, good: 15, medium: 20, reverse: true }
                    ])
                ]
            )
        ]
    );
};

// Composant Modal Entreprises
const CompaniesModal = ({ companies, searchTerm, setSearchTerm, selectCompany, onClose }) => {
    return React.createElement('div', {
        className: 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4'
    },
        React.createElement('div', {
            className: 'bg-gray-800 rounded-lg w-full max-w-6xl max-h-[80vh] flex flex-col'
        },
            [
                // Header modal
                React.createElement('div', {
                    className: 'flex justify-between items-center p-6 border-b border-gray-700',
                    key: 'modal-header'
                },
                    [
                        React.createElement('h3', {
                            className: 'text-xl font-bold text-white',
                            key: 'title'
                        }, '📋 Toutes les entreprises disponibles'),
                        React.createElement('button', {
                            onClick: onClose,
                            className: 'text-gray-400 hover:text-white text-2xl',
                            key: 'close-btn'
                        }, '×')
                    ]
                ),

                // Barre de recherche
                React.createElement('div', {
                    className: 'p-4 border-b border-gray-700',
                    key: 'search-bar'
                },
                    React.createElement('input', {
                        type: 'text',
                        placeholder: '🔍 Rechercher par symbole ou nom...',
                        value: searchTerm,
                        onChange: (e) => setSearchTerm(e.target.value),
                        className: 'w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none',
                        key: 'search-input'
                    })
                ),

                // Tableau
                React.createElement('div', {
                    className: 'flex-1 overflow-y-auto',
                    key: 'table-container'
                },
                    React.createElement('table', {
                        className: 'w-full'
                    },
                        [
                            React.createElement('thead', {
                                className: 'bg-gray-700 sticky top-0',
                                key: 'table-header'
                            },
                                React.createElement('tr', {},
                                    [
                                        React.createElement('th', {
                                            className: 'px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider',
                                            key: 'symbol'
                                        }, 'Symbole'),
                                        React.createElement('th', {
                                            className: 'px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider',
                                            key: 'name'
                                        }, 'Nom de l\'entreprise')
                                    ]
                                )
                            ),
                            React.createElement('tbody', {
                                className: 'bg-gray-800 divide-y divide-gray-700',
                                key: 'table-body'
                            },
                                companies.map((company, index) =>
                                    React.createElement('tr', {
                                        key: company.symbol + index,
                                        className: 'hover:bg-gray-700 cursor-pointer transition-colors',
                                        onClick: () => selectCompany(company.symbol)
                                    },
                                        [
                                            React.createElement('td', {
                                                className: 'px-6 py-4 whitespace-nowrap text-sm font-medium text-white',
                                                key: 'symbol'
                                            }, company.symbol),
                                            React.createElement('td', {
                                                className: 'px-6 py-4 text-sm text-gray-300',
                                                key: 'name'
                                            }, company.companyName || company.name || 'N/A')
                                        ]
                                    )
                                )
                            )
                        ]
                    )
                ),

                // Footer
                React.createElement('div', {
                    className: 'p-4 border-t border-gray-700 text-sm text-gray-400',
                    key: 'modal-footer'
                }, `${companies.length} entreprise(s)`)
            ]
        )
    );
};

// Fonctions utilitaires (à conserver de votre code original)
function createDataCard(title, content) {
    return React.createElement('div', {
        className: 'glass-main p-6'
    },
        [
            React.createElement('h3', {
                className: 'text-lg font-semibold text-white mb-4',
                key: 'title'
            }, title),
            React.createElement('div', {
                className: 'space-y-3',
                key: 'content'
            }, content)
        ]
    );
}

function createAnalysisSection(title, score, metrics, metricConfigs) {
    return React.createElement('div', {
        className: 'glass-main p-6'
    },
        [
            React.createElement('div', {
                className: 'flex justify-between items-center mb-4',
                key: 'header'
            },
                [
                    React.createElement('h3', {
                        className: 'text-lg font-semibold text-white',
                        key: 'title'
                    }, title),
                    React.createElement('span', {
                        className: `px-3 py-1 rounded-full text-sm font-bold ${
                            score >= 80 ? 'bg-green-600' :
                            score >= 65 ? 'bg-blue-600' :
                            score >= 50 ? 'bg-yellow-600' : 'bg-red-600'
                        }`,
                        key: 'score'
                    }, `${score}%`)
                ]
            ),
            React.createElement('div', {
                className: 'space-y-4',
                key: 'metrics'
            },
                metricConfigs.map(config => createMetricRow(config, metrics[config.key]))
            )
        ]
    );
}

function createMetricRow(config, value) {
    const rating = getRating(value, config.excellent, config.good, config.medium, config.reverse);
    const formattedValue = config.format === 'percent' ? 
        `${value?.toFixed(1)}%` : value?.toFixed(2);
    
    return React.createElement('div', {
        className: 'flex justify-between items-center',
        key: config.key
    },
        [
            React.createElement('span', {
                className: 'text-gray-300',
                key: 'name'
            }, config.name),
            React.createElement('span', {
                className: `font-semibold ${
                    rating === 'excellent' ? 'text-green-400' :
                    rating === 'good' ? 'text-blue-400' :
                    rating === 'medium' ? 'text-yellow-400' : 'text-red-400'
                }`,
                key: 'value'
            }, formattedValue)
        ]
    );
}

// Les fonctions calculateMetrics, calculateAdvancedScores, etc. restent identiques à votre code original
// ... (copiez toutes vos fonctions utilitaires existantes ici)

// Rendu de l'application
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(InvestmentAnalyzer));
