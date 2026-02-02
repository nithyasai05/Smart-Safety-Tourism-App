// scripts/deploy-tourist-id.js
import { ethers } from "hardhat";

async function main() {
  console.log("Deploying TouristID contract...");

  // Get the ContractFactory and Signers here
  const TouristID = await ethers.getContractFactory("TouristID");
  const touristID = await TouristID.deploy();

  await touristID.waitForDeployment();

  const contractAddress = await touristID.getAddress();
  console.log("TouristID deployed to:", contractAddress);

  // Save the contract address to .env file
  const fs = await import("fs");
  const path = await import("path");
  const envPath = path.join(process.cwd(), ".env");

  let envContent = fs.readFileSync(envPath, "utf8");
  if (envContent.includes("BLOCKCHAIN_CONTRACT_ADDRESS=")) {
    envContent = envContent.replace(
      /BLOCKCHAIN_CONTRACT_ADDRESS=.*/,
      `BLOCKCHAIN_CONTRACT_ADDRESS=${contractAddress}`,
    );
  } else {
    envContent += `\nBLOCKCHAIN_CONTRACT_ADDRESS=${contractAddress}`;
  }
  fs.writeFileSync(envPath, envContent);

  console.log("Contract address saved to .env file");

  // Verify contract on Etherscan (for mainnet/testnet)
  if (network.name !== "hardhat") {
    console.log("Waiting for block confirmations...");
    await touristID.deploymentTransaction().wait(6);

    console.log("Verifying contract...");
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [],
      });
    } catch (error) {
      console.log("Verification failed:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
