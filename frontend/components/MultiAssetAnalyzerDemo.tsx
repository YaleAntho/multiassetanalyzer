"use client";

import { useState } from "react";
import { useFhevm } from "../fhevm/useFhevm";
import { useInMemoryStorage } from "../hooks/useInMemoryStorage";
import { useMetaMaskEthersSigner } from "../hooks/metamask/useMetaMaskEthersSigner";
import { MultiAssetAnalyzerAddresses } from "@/abi/MultiAssetAnalyzerAddresses";
import { MultiAssetAnalyzerABI } from "@/abi/MultiAssetAnalyzerABI";
import { ethers } from "ethers";
import { FhevmDecryptionSignature } from "@/fhevm/FhevmDecryptionSignature";

type ActiveView = 'portfolio' | 'analytics' | 'stress-test';

export const MultiAssetAnalyzerDemo = () => {
  const { storage: fhevmDecryptionSignatureStorage } = useInMemoryStorage();
  const {
    provider,
    chainId,
    accounts,
    isConnected,
    connect,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
    initialMockChains,
  } = useMetaMaskEthersSigner();

  const {
    instance: fhevmInstance,
    status: fhevmStatus,
    error: fhevmError,
  } = useFhevm({
    provider,
    chainId,
    initialMockChains,
    enabled: true,
  });

  const [activeView, setActiveView] = useState<ActiveView>('portfolio');
  const [assetCount, setAssetCount] = useState(2);
  const [balances, setBalances] = useState<string[]>(["100", "50"]);
  const [prices, setPrices] = useState<string[]>(["50000", "3000"]);
  const [volatilities, setVolatilities] = useState<string[]>(["0.1", "0.15"]);
  const [valueThreshold, setValueThreshold] = useState("1000000");
  const [riskThreshold, setRiskThreshold] = useState("100000");
  const [message, setMessage] = useState("");
  const [totalValueHandle, setTotalValueHandle] = useState<string | undefined>();
  const [decryptedTotalValue, setDecryptedTotalValue] = useState<string | undefined>();
  const [riskExposureHandle, setRiskExposureHandle] = useState<string | undefined>();
  const [decryptedRiskExposure, setDecryptedRiskExposure] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [thresholdsSet, setThresholdsSet] = useState(false);
  const [stressTestScenario, setStressTestScenario] = useState<0 | 1 | 2>(0);
  const [stressTestResults, setStressTestResults] = useState<{
    stressValue?: string;
    var?: string;
    cvar?: string;
  }>({});

  const contractAddress = chainId ? MultiAssetAnalyzerAddresses[chainId.toString()]?.address : undefined;
  const isDeployed = contractAddress && contractAddress !== ethers.ZeroAddress;

  const handleSubmitPortfolio = async () => {
    if (!fhevmInstance || !ethersSigner || !contractAddress) {
      setMessage("⚠️ Please connect your wallet and ensure the contract is deployed");
      return;
    }

    setIsLoading(true);
    setMessage("🔐 Encrypting your portfolio data securely...");

    try {
      const encryptedBalances: any[] = [];
      const encryptedPrices: any[] = [];
      const proofs: any[] = [];

      for (let i = 0; i < assetCount; i++) {
        const balance = parseInt(balances[i] || "0");
        const price = parseInt(prices[i] || "0");
        
        const balanceInput = fhevmInstance.createEncryptedInput(contractAddress, ethersSigner.address);
        balanceInput.add32(balance);
        const encBalance = await balanceInput.encrypt();
        
        const priceInput = fhevmInstance.createEncryptedInput(contractAddress, ethersSigner.address);
        priceInput.add32(price);
        const encPrice = await priceInput.encrypt();

        encryptedBalances.push(encBalance.handles[0]);
        encryptedPrices.push(encPrice.handles[0]);
        proofs.push(encBalance.inputProof);
        proofs.push(encPrice.inputProof);
      }

      const contract = new ethers.Contract(contractAddress, MultiAssetAnalyzerABI.abi, ethersSigner);
      const tx = await contract.submitPortfolio(encryptedBalances, encryptedPrices, proofs, assetCount);
      await tx.wait();

      setMessage("✅ Portfolio submitted successfully! Your data is encrypted and secure.");
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCalculateTotalValue = async () => {
    if (!ethersSigner || !contractAddress || !ethersReadonlyProvider) {
      setMessage("⚠️ Please connect your wallet and ensure the contract is deployed");
      return;
    }

    setIsLoading(true);
    setMessage("🔢 Calculating total portfolio value...");

    try {
      const contract = new ethers.Contract(contractAddress, MultiAssetAnalyzerABI.abi, ethersSigner);
      const tx = await contract.calculateTotalValue();
      await tx.wait();
      
      const readonlyContract = new ethers.Contract(contractAddress, MultiAssetAnalyzerABI.abi, ethersReadonlyProvider);
      const handle = await readonlyContract.calculateTotalValue.staticCall();
      const handleString = typeof handle === 'string' ? handle : ethers.hexlify(handle);
      setTotalValueHandle(handleString);
      setMessage("✅ Total value calculated! Click 'Decrypt Result' to view.");
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecryptTotalValue = async () => {
    if (!fhevmInstance || !ethersSigner || !contractAddress || !totalValueHandle) {
      return;
    }

    setIsLoading(true);
    setMessage("🔓 Decrypting total value...");

    try {
      const sig = await FhevmDecryptionSignature.loadOrSign(
        fhevmInstance,
        [contractAddress],
        ethersSigner,
        fhevmDecryptionSignatureStorage
      );

      if (!sig) {
        setMessage("❌ Failed to create decryption signature");
        return;
      }

      const result = await fhevmInstance.userDecrypt(
        [{ handle: totalValueHandle, contractAddress }],
        sig.privateKey,
        sig.publicKey,
        sig.signature,
        sig.contractAddresses,
        sig.userAddress,
        sig.startTimestamp,
        sig.durationDays
      );

      const totalValueNum = parseFloat(result[totalValueHandle].toString());
      setDecryptedTotalValue(totalValueNum.toLocaleString());
      
      if (thresholdsSet) {
        const valueThresholdNum = parseFloat(valueThreshold);
        if (totalValueNum > valueThresholdNum) {
          setMessage(`⚠️ Alert: Total value $${totalValueNum.toLocaleString()} exceeds threshold $${valueThresholdNum.toLocaleString()}!`);
        } else {
          setMessage(`✅ Total value decrypted! Current: $${totalValueNum.toLocaleString()}, Threshold: $${valueThresholdNum.toLocaleString()}`);
        }
      } else {
        setMessage("✅ Total value decrypted successfully!");
      }
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCalculateRiskExposure = async () => {
    if (!fhevmInstance || !ethersSigner || !contractAddress) {
      setMessage("⚠️ Please connect your wallet and ensure the contract is deployed");
      return;
    }

    setIsLoading(true);
    setMessage("📊 Calculating risk exposure...");

    try {
      const encryptedVolatilities: any[] = [];
      const proofs: any[] = [];

      for (let i = 0; i < assetCount; i++) {
        const vol = parseFloat(volatilities[i] || "0") * 1000;
        const volInput = fhevmInstance.createEncryptedInput(contractAddress, ethersSigner.address);
        volInput.add32(Math.floor(vol));
        const encVol = await volInput.encrypt();
        encryptedVolatilities.push(encVol.handles[0]);
        proofs.push(encVol.inputProof);
      }

      const contract = new ethers.Contract(contractAddress, MultiAssetAnalyzerABI.abi, ethersSigner);
      const tx = await contract.calculateRiskExposure(encryptedVolatilities, proofs);
      await tx.wait();
      
      const readonlyContract = new ethers.Contract(contractAddress, MultiAssetAnalyzerABI.abi, ethersReadonlyProvider!);
      const handle = await readonlyContract.calculateRiskExposure.staticCall(encryptedVolatilities, proofs);
      const handleString = typeof handle === 'string' ? handle : ethers.hexlify(handle);
      setRiskExposureHandle(handleString);
      setMessage("✅ Risk exposure calculated! Click 'Decrypt Result' to view.");
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecryptRiskExposure = async () => {
    if (!fhevmInstance || !ethersSigner || !contractAddress || !riskExposureHandle) {
      return;
    }

    setIsLoading(true);
    setMessage("🔓 Decrypting risk exposure...");

    try {
      const sig = await FhevmDecryptionSignature.loadOrSign(
        fhevmInstance,
        [contractAddress],
        ethersSigner,
        fhevmDecryptionSignatureStorage
      );

      if (!sig) {
        setMessage("❌ Failed to create decryption signature");
        return;
      }

      const result = await fhevmInstance.userDecrypt(
        [{ handle: riskExposureHandle, contractAddress }],
        sig.privateKey,
        sig.publicKey,
        sig.signature,
        sig.contractAddresses,
        sig.userAddress,
        sig.startTimestamp,
        sig.durationDays
      );

      const rawValue = BigInt(result[riskExposureHandle].toString());
      const actualValue = Number(rawValue) / 1000;
      setDecryptedRiskExposure(actualValue.toFixed(2));
      
      if (thresholdsSet) {
        const riskThresholdNum = parseFloat(riskThreshold);
        if (actualValue > riskThresholdNum) {
          setMessage(`⚠️ Alert: Risk exposure $${actualValue.toFixed(2)} exceeds threshold $${riskThresholdNum}!`);
        } else {
          setMessage(`✅ Risk exposure decrypted! Current: $${actualValue.toFixed(2)}, Threshold: $${riskThresholdNum}`);
        }
      } else {
        setMessage("✅ Risk exposure decrypted successfully!");
      }
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetThresholds = async () => {
    if (!fhevmInstance || !ethersSigner || !contractAddress) {
      setMessage("⚠️ Please connect your wallet and ensure the contract is deployed");
      return;
    }

    setIsLoading(true);
    setMessage("🔐 Encrypting and setting thresholds...");

    try {
      const valueThresholdNum = parseInt(valueThreshold);
      const riskThresholdNum = parseInt(riskThreshold);

      const valueInput = fhevmInstance.createEncryptedInput(contractAddress, ethersSigner.address);
      valueInput.add32(valueThresholdNum);
      const encValueThreshold = await valueInput.encrypt();

      const riskInput = fhevmInstance.createEncryptedInput(contractAddress, ethersSigner.address);
      riskInput.add32(riskThresholdNum * 1000);
      const encRiskThreshold = await riskInput.encrypt();

      const contract = new ethers.Contract(contractAddress, MultiAssetAnalyzerABI.abi, ethersSigner);
      const tx = await contract.setThresholds(
        encValueThreshold.handles[0],
        encRiskThreshold.handles[0],
        [encValueThreshold.inputProof, encRiskThreshold.inputProof]
      );
      await tx.wait();

      setThresholdsSet(true);
      setMessage("✅ Thresholds configured successfully!");
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunStressTest = async () => {
    if (!fhevmInstance || !ethersSigner || !contractAddress) {
      setMessage("⚠️ Please connect your wallet and ensure the contract is deployed");
      return;
    }

    setIsLoading(true);
    setMessage("🧪 Running stress test simulation...");

    try {
      const encryptedShockPrices: any[] = [];
      const proofs: any[] = [];

      if (stressTestScenario === 2) {
        const originalPrice = parseInt(prices[0] || "0");
        const shockPrice = Math.floor(originalPrice * 0.5);
        const priceInput = fhevmInstance.createEncryptedInput(contractAddress, ethersSigner.address);
        priceInput.add32(shockPrice);
        const encShockPrice = await priceInput.encrypt();
        encryptedShockPrices.push(encShockPrice.handles[0]);
        proofs.push(encShockPrice.inputProof);
      } else {
        const dropRatio = stressTestScenario === 0 ? 0.7 : 0.5;
        for (let i = 0; i < assetCount; i++) {
          const originalPrice = parseInt(prices[i] || "0");
          const shockPrice = Math.floor(originalPrice * dropRatio);
          const priceInput = fhevmInstance.createEncryptedInput(contractAddress, ethersSigner.address);
          priceInput.add32(shockPrice);
          const encShockPrice = await priceInput.encrypt();
          encryptedShockPrices.push(encShockPrice.handles[0]);
          proofs.push(encShockPrice.inputProof);
        }
      }

      const contract = new ethers.Contract(contractAddress, MultiAssetAnalyzerABI.abi, ethersSigner);
      const tx = await contract.runStressTest(stressTestScenario, encryptedShockPrices, proofs);
      await tx.wait();

      const readonlyContract = new ethers.Contract(contractAddress, MultiAssetAnalyzerABI.abi, ethersReadonlyProvider!);
      const [stressValueHandle, varHandle, cvarHandle] = await readonlyContract.runStressTest.staticCall(
        stressTestScenario,
        encryptedShockPrices,
        proofs
      );

      const sig = await FhevmDecryptionSignature.loadOrSign(
        fhevmInstance,
        [contractAddress],
        ethersSigner,
        fhevmDecryptionSignatureStorage
      );

      if (!sig) {
        setMessage("❌ Failed to create decryption signature");
        return;
      }

      const stressValueHandleStr = typeof stressValueHandle === 'string' ? stressValueHandle : ethers.hexlify(stressValueHandle);
      const varHandleStr = typeof varHandle === 'string' ? varHandle : ethers.hexlify(varHandle);
      const cvarHandleStr = typeof cvarHandle === 'string' ? cvarHandle : ethers.hexlify(cvarHandle);

      const result = await fhevmInstance.userDecrypt(
        [
          { handle: stressValueHandleStr, contractAddress },
          { handle: varHandleStr, contractAddress },
          { handle: cvarHandleStr, contractAddress },
        ],
        sig.privateKey,
        sig.publicKey,
        sig.signature,
        sig.contractAddresses,
        sig.userAddress,
        sig.startTimestamp,
        sig.durationDays
      );

      const varRaw = BigInt(result[varHandleStr].toString());
      const varActual = Number(varRaw) / 100;
      
      const cvarRaw = BigInt(result[cvarHandleStr].toString());
      const cvarActual = Number(cvarRaw) / 10;

      setStressTestResults({
        stressValue: result[stressValueHandleStr].toString(),
        var: varActual.toLocaleString(undefined, { maximumFractionDigits: 2 }),
        cvar: cvarActual.toLocaleString(undefined, { maximumFractionDigits: 2 }),
      });

      setMessage("✅ Stress test completed! View results below.");
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const menuItems = [
    {
      id: 'portfolio' as ActiveView,
      label: 'Portfolio & Alerts',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      id: 'analytics' as ActiveView,
      label: 'Analytics',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      id: 'stress-test' as ActiveView,
      label: 'Stress Test',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
  ];

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center bg-white card-shadow-lg rounded-2xl p-12 max-w-md">
          <div className="w-20 h-20 bg-blue-400 rounded-full mx-auto mb-6 flex items-center justify-center">
            <svg className="w-10 h-10 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Connect Your Wallet</h2>
          <p className="text-gray-600 mb-8">Connect your MetaMask wallet to start analyzing your portfolio securely.</p>
          <button 
            onClick={connect}
            className="w-full bg-blue-400 text-white font-bold py-4 px-6 rounded-xl hover:bg-blue-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            Connect MetaMask
          </button>
        </div>
      </div>
    );
  }

  if (!isDeployed) {
    return (
      <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-8 card-shadow">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-semibold text-red-900">Contract Not Deployed</h3>
            <p className="mt-2 text-red-800">The smart contract has not been deployed yet. Please deploy the contract first before using this application.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0">
        <div className="bg-white rounded-2xl card-shadow-lg p-4 sticky top-8">
          {/* Status Card */}
          <div className="bg-green-500 rounded-xl p-4 mb-4">
            <h3 className="text-xs font-semibold text-gray-900 mb-2">Connection Status</h3>
            <div className="flex items-center space-x-2 bg-white bg-opacity-90 px-3 py-2 rounded-lg">
              <div className={`w-2 h-2 rounded-full ${fhevmStatus === 'ready' ? 'bg-green-600 animate-pulse' : 'bg-yellow-600'}`}></div>
              <span className="text-xs font-bold text-gray-900">FHEVM: {fhevmStatus}</span>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  activeView === item.id
                    ? 'bg-blue-400 text-white font-semibold shadow-md'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className={activeView === item.id ? 'text-white' : 'text-gray-600'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Contract Info */}
          <div className="mt-6 p-3 bg-gray-50 rounded-xl">
            <p className="text-xs font-semibold text-gray-600 mb-1">Contract Address</p>
            <p className="text-xs text-gray-800 font-mono break-all">{contractAddress}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-6">
        {/* Portfolio & Alerts View */}
        {activeView === 'portfolio' && (
          <>
            {/* Portfolio Input Section */}
            <div className="bg-white rounded-2xl p-6 card-shadow-lg border-2 border-gray-100">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-blue-400 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Portfolio Input</h2>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Number of Assets</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={assetCount}
                  onChange={(e) => {
                    const count = parseInt(e.target.value);
                    setAssetCount(count);
                    const newBalances = [...balances];
                    const newPrices = [...prices];
                    const newVols = [...volatilities];
                    while (newBalances.length < count) newBalances.push("0");
                    while (newPrices.length < count) newPrices.push("0");
                    while (newVols.length < count) newVols.push("0.1");
                    setBalances(newBalances.slice(0, count));
                    setPrices(newPrices.slice(0, count));
                    setVolatilities(newVols.slice(0, count));
                  }}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all text-gray-900"
                />
              </div>

              <div className="space-y-4 mb-6">
                {Array.from({ length: assetCount }).map((_, i) => (
                  <div key={i} className="bg-blue-50 rounded-xl p-5 border-2 border-blue-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                      <span className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center mr-2 text-sm">{i + 1}</span>
                      Asset {i + 1}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Balance (units)</label>
                        <input
                          type="number"
                          value={balances[i] || ""}
                          onChange={(e) => {
                            const newBalances = [...balances];
                            newBalances[i] = e.target.value;
                            setBalances(newBalances);
                          }}
                          className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-green-400 focus:outline-none text-gray-900"
                          placeholder="e.g., 100"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Price per Unit ($)</label>
                        <input
                          type="number"
                          value={prices[i] || ""}
                          onChange={(e) => {
                            const newPrices = [...prices];
                            newPrices[i] = e.target.value;
                            setPrices(newPrices);
                          }}
                          className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-green-400 focus:outline-none text-gray-900"
                          placeholder="e.g., 50000"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Volatility</label>
                        <input
                          type="number"
                          step="0.01"
                          value={volatilities[i] || ""}
                          onChange={(e) => {
                            const newVols = [...volatilities];
                            newVols[i] = e.target.value;
                            setVolatilities(newVols);
                          }}
                          className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-green-400 focus:outline-none text-gray-900"
                          placeholder="e.g., 0.15"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleSubmitPortfolio}
                disabled={isLoading}
                className="w-full bg-green-500 text-white font-bold py-4 px-6 rounded-xl hover:bg-green-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? "Processing..." : "🔐 Submit Encrypted Portfolio"}
              </button>
            </div>

            {/* Threshold Configuration */}
            <div className="bg-white rounded-2xl p-6 card-shadow-lg border-2 border-gray-100">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Alert Thresholds</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Value Threshold ($)</label>
                  <input
                    type="number"
                    value={valueThreshold}
                    onChange={(e) => setValueThreshold(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all text-gray-900"
                    placeholder="e.g., 1000000"
                  />
                  <p className="text-xs text-gray-600 mt-2">Receive alerts when total value exceeds this amount</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Risk Threshold ($)</label>
                  <input
                    type="number"
                    value={riskThreshold}
                    onChange={(e) => setRiskThreshold(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-200 transition-all text-gray-900"
                    placeholder="e.g., 100000"
                  />
                  <p className="text-xs text-gray-600 mt-2">Receive alerts when risk exposure exceeds this amount</p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <button
                  onClick={handleSetThresholds}
                  disabled={isLoading}
                  className="flex-1 bg-blue-400 text-white font-bold py-4 px-6 rounded-xl hover:bg-blue-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {thresholdsSet ? "Update Thresholds" : "Set Alert Thresholds"}
                </button>
                {thresholdsSet && (
                  <div className="flex items-center space-x-2 bg-green-100 px-4 py-3 rounded-xl">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm font-semibold text-green-800">Active</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Analytics View */}
        {activeView === 'analytics' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Total Value Card */}
            <div className="bg-white rounded-2xl p-6 card-shadow-lg border-2 border-gray-100">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900">Total Portfolio Value</h2>
              </div>
              
              <div className="space-y-3">
                <button 
                  onClick={handleCalculateTotalValue} 
                  disabled={isLoading}
                  className="w-full bg-green-500 text-white font-semibold py-3 px-4 rounded-lg hover:bg-green-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Calculate Total Value
                </button>
                
                {totalValueHandle && (
                  <button 
                    onClick={handleDecryptTotalValue} 
                    disabled={isLoading}
                    className="w-full bg-blue-400 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    🔓 Decrypt Result
                  </button>
                )}
                
                {decryptedTotalValue && (
                  <div className="mt-4 p-4 bg-green-100 rounded-xl border-2 border-green-300">
                    <p className="text-sm font-semibold text-gray-700 mb-1">Portfolio Value</p>
                    <p className="text-3xl font-bold text-gray-900">${decryptedTotalValue}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Risk Exposure Card */}
            <div className="bg-white rounded-2xl p-6 card-shadow-lg border-2 border-gray-100">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-blue-400 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900">Risk Exposure</h2>
              </div>
              
              <div className="space-y-3">
                <button 
                  onClick={handleCalculateRiskExposure} 
                  disabled={isLoading}
                  className="w-full bg-blue-400 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Calculate Risk Exposure
                </button>
                
                {riskExposureHandle && (
                  <button 
                    onClick={handleDecryptRiskExposure} 
                    disabled={isLoading}
                    className="w-full bg-green-500 text-white font-semibold py-3 px-4 rounded-lg hover:bg-green-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    🔓 Decrypt Result
                  </button>
                )}
                
                {decryptedRiskExposure && (
                  <div className="mt-4 p-4 bg-blue-100 rounded-xl border-2 border-blue-300">
                    <p className="text-sm font-semibold text-gray-700 mb-1">Risk Value</p>
                    <p className="text-3xl font-bold text-gray-900">${decryptedRiskExposure}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stress Test View */}
        {activeView === 'stress-test' && (
          <div className="bg-white rounded-2xl p-6 card-shadow-lg border-2 border-gray-100">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Stress Test Simulation</h2>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">Select Scenario</label>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { value: 0, label: "Market Crash 30%", desc: "All asset prices drop by 30%" },
                  { value: 1, label: "Market Crash 50%", desc: "All asset prices drop by 50%" },
                  { value: 2, label: "Single Asset Crash", desc: "First asset price drops by 50%" },
                ].map((scenario) => (
                  <label
                    key={scenario.value}
                    className={`flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      stressTestScenario === scenario.value
                        ? "border-blue-400 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      value={scenario.value}
                      checked={stressTestScenario === scenario.value}
                      onChange={(e) => setStressTestScenario(parseInt(e.target.value) as 0 | 1 | 2)}
                      className="mt-1 mr-3"
                    />
                    <div>
                      <p className="font-semibold text-gray-900">{scenario.label}</p>
                      <p className="text-sm text-gray-600 mt-1">{scenario.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={handleRunStressTest}
              disabled={isLoading}
              className="w-full bg-red-500 text-white font-bold py-4 px-6 rounded-xl hover:bg-red-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none mb-6"
            >
              {isLoading ? "Running Simulation..." : "🧪 Run Stress Test"}
            </button>

            {stressTestResults.stressValue && (
              <div className="bg-red-50 rounded-xl p-6 border-2 border-red-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <svg className="w-6 h-6 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Test Results
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-lg">
                    <p className="text-sm font-semibold text-gray-600 mb-1">Stressed Value</p>
                    <p className="text-2xl font-bold text-gray-900">${stressTestResults.stressValue}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg">
                    <p className="text-sm font-semibold text-gray-600 mb-1">VaR (90% confidence)</p>
                    <p className="text-2xl font-bold text-gray-900">${stressTestResults.var || "0"}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg">
                    <p className="text-sm font-semibold text-gray-600 mb-1">CVaR (Expected Loss)</p>
                    <p className="text-2xl font-bold text-gray-900">${stressTestResults.cvar || "0"}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Message Display */}
        {message && (
          <div className={`rounded-2xl p-6 card-shadow-lg border-2 ${
            message.includes("❌") || message.includes("⚠️")
              ? "bg-red-50 border-red-300"
              : message.includes("✅")
              ? "bg-green-50 border-green-300"
              : "bg-blue-50 border-blue-300"
          }`}>
            <div className="flex items-start">
              <div className="flex-shrink-0 mr-3 mt-0.5">
                {message.includes("❌") || message.includes("⚠️") ? (
                  <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : message.includes("✅") ? (
                  <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <p className={`text-sm font-medium ${
                message.includes("❌") || message.includes("⚠️")
                  ? "text-red-800"
                  : message.includes("✅")
                  ? "text-green-800"
                  : "text-blue-800"
              }`}>
                {message}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
