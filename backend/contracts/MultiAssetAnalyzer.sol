// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ebool} from "encrypted-types/EncryptedTypes.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHE Multi-Asset Analyzer
/// @notice A privacy-preserving multi-asset portfolio analyzer using FHEVM
/// @dev All asset data, calculations, and results are encrypted using FHE
contract MultiAssetAnalyzer is SepoliaConfig {
    // Maximum number of supported assets
    uint8 public constant MAX_ASSETS = 10;
    
    // User portfolio data structure
    struct UserPortfolio {
        // Encrypted balances for each asset (up to MAX_ASSETS)
        euint32[MAX_ASSETS] balances;
        // Encrypted prices for each asset
        euint32[MAX_ASSETS] prices;
        // Number of assets in portfolio
        uint8 assetCount;
        // Timestamp of last update
        uint256 lastUpdate;
    }
    
    // User threshold settings
    struct UserThresholds {
        euint32 valueThreshold;      // Encrypted total value threshold
        euint32 riskThreshold;       // Encrypted risk exposure threshold
        bool isSet;                  // Whether thresholds are set
    }
    
    // Pressure test scenario types
    enum StressScenario {
        MARKET_CRASH_30,    // Market drops 30%
        MARKET_CRASH_50,    // Market drops 50%
        SINGLE_ASSET_CRASH  // Single asset drops 50%
    }
    
    // Mapping from user address to portfolio
    mapping(address => UserPortfolio) public portfolios;
    
    // Mapping from user address to thresholds
    mapping(address => UserThresholds) public thresholds;
    
    // Mapping from user address to alert flags
    mapping(address => bool) public alerts;
    
    // Events
    event PortfolioUpdated(address indexed user, uint256 timestamp);
    event ThresholdAlert(address indexed user, string alertType);
    event StressTestCompleted(address indexed user, StressScenario scenario);
    
    /// @notice Submit encrypted asset balances and prices
    /// @param encryptedBalances Array of encrypted balances
    /// @param encryptedPrices Array of encrypted prices
    /// @param proofs Array of input proofs
    /// @param assetCount Number of assets (must match array lengths)
    function submitPortfolio(
        externalEuint32[] calldata encryptedBalances,
        externalEuint32[] calldata encryptedPrices,
        bytes[] calldata proofs,
        uint8 assetCount
    ) external {
        require(assetCount > 0 && assetCount <= MAX_ASSETS, "Invalid asset count");
        require(encryptedBalances.length == assetCount, "Balance array length mismatch");
        require(encryptedPrices.length == assetCount, "Price array length mismatch");
        require(proofs.length == assetCount * 2, "Proof array length mismatch");
        
        UserPortfolio storage portfolio = portfolios[msg.sender];
        portfolio.assetCount = assetCount;
        portfolio.lastUpdate = block.timestamp;
        
        // Convert external encrypted values to internal euint32
        for (uint8 i = 0; i < assetCount; i++) {
            euint32 balance = FHE.fromExternal(encryptedBalances[i], proofs[i * 2]);
            euint32 price = FHE.fromExternal(encryptedPrices[i], proofs[i * 2 + 1]);
            
            portfolio.balances[i] = balance;
            portfolio.prices[i] = price;
            
            // Allow user to decrypt these values later
            FHE.allowThis(balance);
            FHE.allow(balance, msg.sender);
            FHE.allowThis(price);
            FHE.allow(price, msg.sender);
        }
        
        emit PortfolioUpdated(msg.sender, block.timestamp);
    }
    
    /// @notice Calculate encrypted total portfolio value
    /// @return Encrypted total value
    function calculateTotalValue() external returns (euint32) {
        UserPortfolio storage portfolio = portfolios[msg.sender];
        require(portfolio.assetCount > 0, "Portfolio not initialized");
        
        euint32 totalValue = FHE.asEuint32(0);
        
        // Sum up: balance[i] * price[i] for each asset
        for (uint8 i = 0; i < portfolio.assetCount; i++) {
            euint32 assetValue = FHE.mul(portfolio.balances[i], portfolio.prices[i]);
            totalValue = FHE.add(totalValue, assetValue);
        }
        
        // Allow user to decrypt the result
        FHE.allowThis(totalValue);
        FHE.allow(totalValue, msg.sender);
        
        return totalValue;
    }
    
    /// @notice Calculate encrypted risk exposure
    /// @param encryptedVolatilities Array of encrypted volatility values
    /// @param proofs Array of input proofs
    /// @return Encrypted risk exposure value
    /// @dev Risk exposure = weighted sum of (balance * price * volatility)
    function calculateRiskExposure(
        externalEuint32[] calldata encryptedVolatilities,
        bytes[] calldata proofs
    ) external returns (euint32) {
        UserPortfolio storage portfolio = portfolios[msg.sender];
        require(portfolio.assetCount > 0, "Portfolio not initialized");
        require(encryptedVolatilities.length == portfolio.assetCount, "Volatility array length mismatch");
        require(proofs.length == portfolio.assetCount, "Proof array length mismatch");
        
        euint32 riskExposure = FHE.asEuint32(0);
        
        for (uint8 i = 0; i < portfolio.assetCount; i++) {
            euint32 volatility = FHE.fromExternal(encryptedVolatilities[i], proofs[i]);
            
            // Calculate: balance * price * volatility
            euint32 assetValue = FHE.mul(portfolio.balances[i], portfolio.prices[i]);
            euint32 assetRisk = FHE.mul(assetValue, volatility);
            
            riskExposure = FHE.add(riskExposure, assetRisk);
            
            // Allow user to decrypt volatility
            FHE.allowThis(volatility);
            FHE.allow(volatility, msg.sender);
        }
        
        // Allow user to decrypt the result
        FHE.allowThis(riskExposure);
        FHE.allow(riskExposure, msg.sender);
        
        return riskExposure;
    }
    
    /// @notice Set encrypted threshold values for alerts
    /// @param encryptedValueThreshold Encrypted value threshold
    /// @param encryptedRiskThreshold Encrypted risk threshold
    /// @param proofs Array of input proofs [valueProof, riskProof]
    function setThresholds(
        externalEuint32 encryptedValueThreshold,
        externalEuint32 encryptedRiskThreshold,
        bytes[2] calldata proofs
    ) external {
        euint32 valueThreshold = FHE.fromExternal(encryptedValueThreshold, proofs[0]);
        euint32 riskThreshold = FHE.fromExternal(encryptedRiskThreshold, proofs[1]);
        
        thresholds[msg.sender] = UserThresholds({
            valueThreshold: valueThreshold,
            riskThreshold: riskThreshold,
            isSet: true
        });
        
        // Allow user to decrypt thresholds
        FHE.allowThis(valueThreshold);
        FHE.allow(valueThreshold, msg.sender);
        FHE.allowThis(riskThreshold);
        FHE.allow(riskThreshold, msg.sender);
    }
    
    /// @notice Check thresholds and trigger alerts if exceeded
    /// @param encryptedTotalValue Encrypted total value to compare
    /// @param encryptedRiskExposure Encrypted risk exposure to compare
    /// @param proofs Array of input proofs [valueProof, riskProof]
    /// @return alertTriggered Whether any alert was triggered
    /// @dev This function performs encrypted comparisons
    function checkThresholds(
        externalEuint32 encryptedTotalValue,
        externalEuint32 encryptedRiskExposure,
        bytes[2] calldata proofs
    ) external returns (bool alertTriggered) {
        UserThresholds storage userThresholds = thresholds[msg.sender];
        require(userThresholds.isSet, "Thresholds not set");
        
        euint32 totalValue = FHE.fromExternal(encryptedTotalValue, proofs[0]);
        euint32 riskExposure = FHE.fromExternal(encryptedRiskExposure, proofs[1]);
        
        // Encrypted comparison: check if totalValue > valueThreshold
        ebool valueExceeded = FHE.gt(totalValue, userThresholds.valueThreshold);
        
        // Encrypted comparison: check if riskExposure > riskThreshold
        ebool riskExceeded = FHE.gt(riskExposure, userThresholds.riskThreshold);
        
        // Combine the two comparisons using OR
        ebool combinedAlert = FHE.or(valueExceeded, riskExceeded);
        
        // Allow user to decrypt the comparison results
        FHE.allowThis(valueExceeded);
        FHE.allow(valueExceeded, msg.sender);
        FHE.allowThis(riskExceeded);
        FHE.allow(riskExceeded, msg.sender);
        FHE.allowThis(combinedAlert);
        FHE.allow(combinedAlert, msg.sender);
        
        // Allow user to decrypt the inputs
        FHE.allowThis(totalValue);
        FHE.allow(totalValue, msg.sender);
        FHE.allowThis(riskExposure);
        FHE.allow(riskExposure, msg.sender);
        
        // Note: The actual boolean value needs to be decrypted off-chain
        // For now, we'll emit events for both potential alerts and let the client decrypt
        // to determine which one actually triggered
        emit ThresholdAlert(msg.sender, "CHECK_REQUIRED");
        
        // Return false as we can't decrypt on-chain without Oracle support
        // The client should decrypt the ebool values to determine the actual state
        alertTriggered = false;
    }
    
    /// @notice Run stress test scenario
    /// @param scenario Stress scenario type
    /// @param encryptedShockPrices Array of encrypted shock prices (if SINGLE_ASSET_CRASH, only first price is used)
    /// @param proofs Array of input proofs
    /// @return encryptedStressValue Encrypted stress test result value
    /// @return encryptedVaR Encrypted Value at Risk
    /// @return encryptedCVaR Encrypted Conditional Value at Risk
    function runStressTest(
        StressScenario scenario,
        externalEuint32[] calldata encryptedShockPrices,
        bytes[] calldata proofs
    ) external returns (euint32 encryptedStressValue, euint32 encryptedVaR, euint32 encryptedCVaR) {
        UserPortfolio storage portfolio = portfolios[msg.sender];
        require(portfolio.assetCount > 0, "Portfolio not initialized");
        
        euint32 stressValue = FHE.asEuint32(0);
        
        if (scenario == StressScenario.MARKET_CRASH_30) {
            // All assets drop 30%: multiply prices by 0.7
            // Since we can't easily do 0.7 * price in FHE, we'll use shock prices directly
            require(encryptedShockPrices.length == portfolio.assetCount, "Shock price array length mismatch");
            require(proofs.length == portfolio.assetCount, "Proof array length mismatch");
            
            for (uint8 i = 0; i < portfolio.assetCount; i++) {
                euint32 shockPrice = FHE.fromExternal(encryptedShockPrices[i], proofs[i]);
                euint32 assetValue = FHE.mul(portfolio.balances[i], shockPrice);
                stressValue = FHE.add(stressValue, assetValue);
                
                FHE.allowThis(shockPrice);
                FHE.allow(shockPrice, msg.sender);
            }
        } else if (scenario == StressScenario.MARKET_CRASH_50) {
            // All assets drop 50%: multiply prices by 0.5
            require(encryptedShockPrices.length == portfolio.assetCount, "Shock price array length mismatch");
            require(proofs.length == portfolio.assetCount, "Proof array length mismatch");
            
            for (uint8 i = 0; i < portfolio.assetCount; i++) {
                euint32 shockPrice = FHE.fromExternal(encryptedShockPrices[i], proofs[i]);
                euint32 assetValue = FHE.mul(portfolio.balances[i], shockPrice);
                stressValue = FHE.add(stressValue, assetValue);
                
                FHE.allowThis(shockPrice);
                FHE.allow(shockPrice, msg.sender);
            }
        } else if (scenario == StressScenario.SINGLE_ASSET_CRASH) {
            // First asset drops 50%, others remain the same
            require(encryptedShockPrices.length >= 1, "Need at least one shock price");
            require(proofs.length >= 1, "Need at least one proof");
            
            euint32 shockPrice = FHE.fromExternal(encryptedShockPrices[0], proofs[0]);
            euint32 firstAssetValue = FHE.mul(portfolio.balances[0], shockPrice);
            stressValue = FHE.add(stressValue, firstAssetValue);
            
            FHE.allowThis(shockPrice);
            FHE.allow(shockPrice, msg.sender);
            
            // Add other assets at original prices
            for (uint8 i = 1; i < portfolio.assetCount; i++) {
                euint32 assetValue = FHE.mul(portfolio.balances[i], portfolio.prices[i]);
                stressValue = FHE.add(stressValue, assetValue);
            }
        }
        
        // Calculate original total portfolio value for VaR/CVaR calculation
        euint32 currentTotalValue = FHE.asEuint32(0);
        for (uint8 i = 0; i < portfolio.assetCount; i++) {
            euint32 assetValue = FHE.mul(portfolio.balances[i], portfolio.prices[i]);
            currentTotalValue = FHE.add(currentTotalValue, assetValue);
        }
        
        // Calculate VaR (Value at Risk) at 90% confidence level
        // VaR represents the potential loss that won't be exceeded 90% of the time
        // Since FHE doesn't support division easily, we use scaled multiplication:
        // VaR = currentTotalValue * loss_percentage * 90% / 100
        // For display, the result needs to be divided by 100
        euint32 varValue;
        if (scenario == StressScenario.MARKET_CRASH_30) {
            // 30% market crash: loss = 30% of currentTotalValue
            // VaR (90% confidence) = 30% * 90% = 27% of currentTotalValue
            // VaR = currentTotalValue * 27 (scaled, divide by 100 for actual value)
            varValue = FHE.mul(currentTotalValue, FHE.asEuint32(27));
        } else if (scenario == StressScenario.MARKET_CRASH_50) {
            // 50% market crash: loss = 50% of currentTotalValue
            // VaR (90% confidence) = 50% * 90% = 45% of currentTotalValue
            varValue = FHE.mul(currentTotalValue, FHE.asEuint32(45));
        } else {
            // SINGLE_ASSET_CRASH: First asset drops 50%, assuming it's ~50% of portfolio
            // Total loss ≈ 25% of portfolio, VaR (90%) = 25% * 90% ≈ 23% of currentTotalValue
            varValue = FHE.mul(currentTotalValue, FHE.asEuint32(23));
        }
        encryptedVaR = varValue;
        
        // Calculate CVaR (Conditional Value at Risk) - Expected loss beyond VaR
        // CVaR represents the average loss when losses exceed VaR (tail risk)
        // CVaR = VaR * 1.2 (20% more than VaR, representing tail risk)
        // Using scaled multiplication: CVaR = VaR * 12 (divide by 10 for actual value)
        encryptedCVaR = FHE.mul(encryptedVaR, FHE.asEuint32(12));
        
        // Allow user to decrypt results
        FHE.allowThis(stressValue);
        FHE.allow(stressValue, msg.sender);
        FHE.allowThis(encryptedVaR);
        FHE.allow(encryptedVaR, msg.sender);
        FHE.allowThis(encryptedCVaR);
        FHE.allow(encryptedCVaR, msg.sender);
        
        emit StressTestCompleted(msg.sender, scenario);
        
        return (stressValue, encryptedVaR, encryptedCVaR);
    }
    
    /// @notice Get user portfolio asset count
    /// @return Number of assets in portfolio
    function getAssetCount(address user) external view returns (uint8) {
        return portfolios[user].assetCount;
    }
    
    /// @notice Get alert status for user
    /// @return Whether alerts are active
    function getAlertStatus(address user) external view returns (bool) {
        return alerts[user];
    }
}

