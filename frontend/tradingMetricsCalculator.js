// 2.1 Créer un fichier : tradingMetricsCalculator.js
class TradingMetricsCalculator {
    
    // Normalized Free Cash Flow (3-year average)
    static calculateNormalizedFCF(cashFlowData, years = 3) {
        try {
            const fcfValues = cashFlowData
                .slice(0, years)
                .map(data => data.freeCashFlow || 0)
                .filter(val => val !== 0);
            
            if (fcfValues.length === 0) return null;
            
            const sum = fcfValues.reduce((a, b) => a + b, 0);
            return sum / fcfValues.length;
        } catch (error) {
            console.error('Error calculating normalized FCF:', error);
            return null;
        }
    }
    
    // Dynamic PEG with real growth calculation
    static calculateDynamicPEG(incomeStatementData, currentPE) {
        try {
            const revenues = incomeStatementData
                .slice(0, 5) // 5 years of data
                .map(data => data.revenue || 0)
                .filter(val => val > 0);
            
            if (revenues.length < 3) return null;
            
            // Calculate CAGR
            const startRevenue = revenues[revenues.length - 1];
            const endRevenue = revenues[0];
            const periods = revenues.length - 1;
            
            const cagr = Math.pow(endRevenue / startRevenue, 1 / periods) - 1;
            
            if (cagr <= 0 || !isFinite(cagr)) return null;
            
            return currentPE / (cagr * 100); // Convert to percentage
        } catch (error) {
            console.error('Error calculating dynamic PEG:', error);
            return null;
        }
    }
    
    // Earnings Quality Score
    static calculateEarningsQuality(incomeStatement, cashFlowStatement) {
        try {
            const netIncome = incomeStatement.netIncome || 0;
            const operatingCF = cashFlowStatement.operatingCashFlow || 0;
            const totalAssets = incomeStatement.totalAssets || 1;
            
            if (netIncome === 0) return null;
            
            // Cash Flow to Earnings ratio
            const cfToEarnings = operatingCF / Math.abs(netIncome);
            
            // Accruals ratio
            const accruals = (netIncome - operatingCF) / totalAssets;
            
            return {
                earningsQuality: cfToEarnings,
                accrualsRatio: Math.abs(accruals),
                score: cfToEarnings > 1.0 ? 80 : cfToEarnings > 0.8 ? 60 : 40
            };
        } catch (error) {
            console.error('Error calculating earnings quality:', error);
            return null;
        }
    }
    
    // Price Momentum (63 days = 3 months)
    static calculatePriceMomentum(priceHistory, period = 63) {
        try {
            if (!priceHistory || priceHistory.length < period) return null;
            
            const recentPrices = priceHistory.slice(0, period);
            const startPrice = recentPrices[recentPrices.length - 1];
            const endPrice = recentPrices[0];
            
            return (endPrice - startPrice) / startPrice;
        } catch (error) {
            console.error('Error calculating price momentum:', error);
            return null;
        }
    }
    
    // Relative Strength vs Sector
    static calculateRelativeStrength(stockReturns, sectorReturns) {
        try {
            if (!stockReturns || !sectorReturns || stockReturns.length !== sectorReturns.length) {
                return null;
            }
            
            const stockPerformance = stockReturns.reduce((a, b) => a * (1 + b), 1);
            const sectorPerformance = sectorReturns.reduce((a, b) => a * (1 + b), 1);
            
            return stockPerformance / sectorPerformance - 1;
        } catch (error) {
            console.error('Error calculating relative strength:', error);
            return null;
        }
    }
    
    // Volatility (30-day historical)
    static calculateVolatility(priceHistory, period = 30) {
        try {
            if (!priceHistory || priceHistory.length < period) return null;
            
            const returns = [];
            for (let i = 0; i < period - 1; i++) {
                const returnVal = (priceHistory[i] - priceHistory[i + 1]) / priceHistory[i + 1];
                returns.push(returnVal);
            }
            
            const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
            const variance = returns.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / returns.length;
            
            return Math.sqrt(variance) * Math.sqrt(252); // Annualized
        } catch (error) {
            console.error('Error calculating volatility:', error);
            return null;
        }
    }
    
    // Short Interest Analysis
    static calculateSqueezePotential(shortInterest, averageVolume, daysToCoverThreshold = 5) {
        try {
            if (!shortInterest || !averageVolume) return null;
            
            const daysToCover = shortInterest / averageVolume;
            let squeezePotential = 'LOW';
            
            if (daysToCover > 8) squeezePotential = 'VERY_HIGH';
            else if (daysToCover > 5) squeezePotential = 'HIGH';
            else if (daysToCover > 3) squeezePotential = 'MEDIUM';
            
            return {
                shortInterestRatio: daysToCover,
                squeezePotential: squeezePotential
            };
        } catch (error) {
            console.error('Error calculating squeeze potential:', error);
            return null;
        }
    }
    
    // Composite Scores
    static calculateCompositeScores(metrics) {
        try {
            let qualityScore = 0;
            let momentumScore = 0;
            let valueScore = 0;
            
            // Quality Score (0-100)
            if (metrics.earningsQuality > 1.2) qualityScore += 40;
            else if (metrics.earningsQuality > 0.8) qualityScore += 25;
            
            if (metrics.accrualsRatio < 0.05) qualityScore += 30;
            else if (metrics.accrualsRatio < 0.1) qualityScore += 15;
            
            // Momentum Score (0-100)
            if (metrics.priceMomentum > 0.15) momentumScore += 50;
            else if (metrics.priceMomentum > 0.05) momentumScore += 30;
            
            if (metrics.relativeStrength > 0.1) momentumScore += 30;
            else if (metrics.relativeStrength > 0) momentumScore += 15;
            
            // Value Score (0-100) - à compléter avec vos métriques existantes
            if (metrics.dynamicPEG < 0.8) valueScore += 40;
            else if (metrics.dynamicPEG < 1.2) valueScore += 25;
            
            if (metrics.normalizedFCF > 0) valueScore += 30;
            
            // Risk Adjusted Score
            const riskAdjustedScore = Math.max(0, 
                (qualityScore * 0.4 + momentumScore * 0.3 + valueScore * 0.3) - 
                (metrics.volatility * 10)
            );
            
            return {
                qualityScore: Math.min(100, qualityScore),
                momentumScore: Math.min(100, momentumScore),
                valueScore: Math.min(100, valueScore),
                riskAdjustedScore: Math.min(100, riskAdjustedScore)
            };
        } catch (error) {
            console.error('Error calculating composite scores:', error);
            return null;
        }
    }
}
