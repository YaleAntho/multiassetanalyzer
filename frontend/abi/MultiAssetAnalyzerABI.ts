export const MultiAssetAnalyzerABI = {
  abi: [
  {
    "inputs": [],
    "name": "ZamaProtocolUnsupported",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "PortfolioUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "enum MultiAssetAnalyzer.StressScenario",
        "name": "scenario",
        "type": "uint8"
      }
    ],
    "name": "StressTestCompleted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "alertType",
        "type": "string"
      }
    ],
    "name": "ThresholdAlert",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "MAX_ASSETS",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "alerts",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "externalEuint32[]",
        "name": "encryptedVolatilities",
        "type": "bytes32[]"
      },
      {
        "internalType": "bytes[]",
        "name": "proofs",
        "type": "bytes[]"
      }
    ],
    "name": "calculateRiskExposure",
    "outputs": [
      {
        "internalType": "euint32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "calculateTotalValue",
    "outputs": [
      {
        "internalType": "euint32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "externalEuint32",
        "name": "encryptedTotalValue",
        "type": "bytes32"
      },
      {
        "internalType": "externalEuint32",
        "name": "encryptedRiskExposure",
        "type": "bytes32"
      },
      {
        "internalType": "bytes[2]",
        "name": "proofs",
        "type": "bytes[2]"
      }
    ],
    "name": "checkThresholds",
    "outputs": [
      {
        "internalType": "bool",
        "name": "alertTriggered",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "confidentialProtocolId",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "getAlertStatus",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "getAssetCount",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "portfolios",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "assetCount",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "lastUpdate",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "enum MultiAssetAnalyzer.StressScenario",
        "name": "scenario",
        "type": "uint8"
      },
      {
        "internalType": "externalEuint32[]",
        "name": "encryptedShockPrices",
        "type": "bytes32[]"
      },
      {
        "internalType": "bytes[]",
        "name": "proofs",
        "type": "bytes[]"
      }
    ],
    "name": "runStressTest",
    "outputs": [
      {
        "internalType": "euint32",
        "name": "encryptedStressValue",
        "type": "bytes32"
      },
      {
        "internalType": "euint32",
        "name": "encryptedVaR",
        "type": "bytes32"
      },
      {
        "internalType": "euint32",
        "name": "encryptedCVaR",
        "type": "bytes32"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "externalEuint32",
        "name": "encryptedValueThreshold",
        "type": "bytes32"
      },
      {
        "internalType": "externalEuint32",
        "name": "encryptedRiskThreshold",
        "type": "bytes32"
      },
      {
        "internalType": "bytes[2]",
        "name": "proofs",
        "type": "bytes[2]"
      }
    ],
    "name": "setThresholds",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "externalEuint32[]",
        "name": "encryptedBalances",
        "type": "bytes32[]"
      },
      {
        "internalType": "externalEuint32[]",
        "name": "encryptedPrices",
        "type": "bytes32[]"
      },
      {
        "internalType": "bytes[]",
        "name": "proofs",
        "type": "bytes[]"
      },
      {
        "internalType": "uint8",
        "name": "assetCount",
        "type": "uint8"
      }
    ],
    "name": "submitPortfolio",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "thresholds",
    "outputs": [
      {
        "internalType": "euint32",
        "name": "valueThreshold",
        "type": "bytes32"
      },
      {
        "internalType": "euint32",
        "name": "riskThreshold",
        "type": "bytes32"
      },
      {
        "internalType": "bool",
        "name": "isSet",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const,
};
