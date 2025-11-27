// Generate ABI from backend deployments for multiple networks
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONTRACT_NAME = "MultiAssetAnalyzer";
// Resolve backend path relative to this script file
const backendDir = path.resolve(__dirname, "../../backend");
const outdir = path.resolve(__dirname, "../abi");

if (!fs.existsSync(outdir)) {
  fs.mkdirSync(outdir, { recursive: true });
}

// Network configurations: chainId -> { networkName, deploymentDir }
const networks = {
  31337: {
    networkName: "localhost",
    deploymentDir: path.join(backendDir, "deployments", "localhost"),
  },
  11155111: {
    networkName: "sepolia",
    deploymentDir: path.join(backendDir, "deployments", "sepolia"),
  },
};

const deploymentsDir = path.join(backendDir, "deployments");
console.log(`Looking for deployments in: ${deploymentsDir}`);

if (!fs.existsSync(deploymentsDir)) {
  console.warn(`Deployments directory not found. Please deploy contracts first.`);
  process.exit(0);
}

let addresses = {};
let abi = null;

// Iterate through all networks and collect deployments
for (const [chainId, networkConfig] of Object.entries(networks)) {
  const deploymentFile = path.join(networkConfig.deploymentDir, `${CONTRACT_NAME}.json`);
  
  if (!fs.existsSync(deploymentFile)) {
    console.log(`⚠️  Skipping ${networkConfig.networkName} (chainId: ${chainId}) - deployment not found`);
    continue;
  }

  try {
    const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf-8"));
    
    // Use the first deployment's ABI (should be the same across networks)
    if (abi === null) {
      abi = deployment.abi;
    }
    
    addresses[chainId] = {
      address: deployment.address,
      chainId: parseInt(chainId),
      chainName: networkConfig.networkName,
    };
    
    console.log(`✅ Found deployment on ${networkConfig.networkName} (chainId: ${chainId})`);
    console.log(`   Contract address: ${deployment.address}`);
  } catch (error) {
    console.warn(`⚠️  Error reading deployment file for ${networkConfig.networkName}: ${error.message}`);
    continue;
  }
}

// Check if we found any deployments
if (Object.keys(addresses).length === 0) {
  console.warn("❌ No deployments found. Please deploy the contract first.");
  console.warn("   For localhost: npx hardhat deploy --network localhost");
  console.warn("   For sepolia: npx hardhat deploy --network sepolia");
  process.exit(0);
}

// Check if we have ABI
if (abi === null) {
  console.warn("❌ No ABI found in deployments.");
  process.exit(1);
}

// Write ABI
const abiFile = path.join(outdir, `${CONTRACT_NAME}ABI.ts`);
fs.writeFileSync(
  abiFile,
  `export const ${CONTRACT_NAME}ABI = {\n  abi: ${JSON.stringify(abi, null, 2)} as const,\n};\n`
);

// Write addresses
const addressesFile = path.join(outdir, `${CONTRACT_NAME}Addresses.ts`);
fs.writeFileSync(
  addressesFile,
  `export const ${CONTRACT_NAME}Addresses: Record<string, {\n  address: \`0x\${string}\`;\n  chainId: number;\n  chainName: string;\n}> = ${JSON.stringify(addresses, null, 2)};\n`
);

console.log(`\n✅ Generated ABI and addresses for ${CONTRACT_NAME}`);
console.log(`   Networks: ${Object.keys(addresses).join(", ")}`);

