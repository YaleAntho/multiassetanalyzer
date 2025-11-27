import { JsonRpcProvider } from "ethers";

async function checkHardhatNode() {
  try {
    const provider = new JsonRpcProvider("http://localhost:8545");
    const version = await provider.send("web3_clientVersion", []);
    if (typeof version === "string" && version.toLowerCase().includes("hardhat")) {
      console.log("✅ Hardhat node is running");
      process.exit(0);
    } else {
      console.log("❌ Hardhat node is not running");
      process.exit(1);
    }
  } catch (error) {
    console.log("❌ Hardhat node is not running:", error.message);
    process.exit(1);
  }
}

checkHardhatNode();

