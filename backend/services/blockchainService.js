// blockchain/blockchainService.js
import { ethers } from "ethers";

// Minimal Tourist ID Smart Contract ABI (for minting and verifying)
const TOURIST_ID_ABI = [
  "function mintTouristID(address to, string memory name, string memory digitalId) public returns (uint256)",
  "function verifyTouristID(uint256 tokenId) public view returns (address, string memory, string memory, bool)",
  "function getTouristID(uint256 tokenId) public view returns (address owner, string memory name, string memory digitalId, bool isValid)",
];

// Contract address (deploy on testnet first)
const CONTRACT_ADDRESS =
  process.env.BLOCKCHAIN_CONTRACT_ADDRESS || "0xYourContractAddress";
const RPC_URL =
  process.env.BLOCKCHAIN_RPC_URL ||
  "https://sepolia.infura.io/v3/YOUR_INFURA_KEY";
const PRIVATE_KEY = process.env.BLOCKCHAIN_PRIVATE_KEY;

class BlockchainService {
  constructor() {
    try {
      if (!PRIVATE_KEY || PRIVATE_KEY === "7db075147da9443c8416f5c7793b67e2") {
        // Silently disable blockchain features when private key is not configured
        this.isEnabled = false;
        return;
      }

      this.provider = new ethers.JsonRpcProvider(RPC_URL);
      this.wallet = new ethers.Wallet(PRIVATE_KEY, this.provider);
      this.contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        TOURIST_ID_ABI,
        this.wallet,
      );
      this.isEnabled = true;
    } catch (error) {
      // Silently disable blockchain features on initialization failure
      this.isEnabled = false;
    }
  }

  // Mint a new Tourist ID NFT
  async mintTouristID(userAddress, name, digitalId) {
    if (!this.isEnabled) {
      console.warn("Blockchain service disabled: Cannot mint Tourist ID");
      return { success: false, error: "Blockchain service not configured" };
    }

    try {
      const tx = await this.contract.mintTouristID(
        userAddress,
        name,
        digitalId,
      );
      const receipt = await tx.wait();
      const tokenId = receipt.logs[0].topics[3]; // Extract tokenId from event
      return {
        success: true,
        tokenId: parseInt(tokenId, 16),
        txHash: receipt.hash,
      };
    } catch (error) {
      console.error("Blockchain mint error:", error);
      return { success: false, error: error.message };
    }
  }

  // Verify Tourist ID
  async verifyTouristID(tokenId) {
    if (!this.isEnabled) {
      console.warn("Blockchain service disabled: Cannot verify Tourist ID");
      return { success: false, error: "Blockchain service not configured" };
    }

    try {
      const result = await this.contract.verifyTouristID(tokenId);
      return {
        success: true,
        owner: result[0],
        name: result[1],
        digitalId: result[2],
        isValid: result[3],
      };
    } catch (error) {
      console.error("Blockchain verify error:", error);
      return { success: false, error: error.message };
    }
  }
}

export default new BlockchainService();
