// contracts/TouristID.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TouristID is ERC721, Ownable {
    struct TouristData {
        string name;
        string digitalId;
        bool isValid;
        uint256 mintedAt;
    }

    mapping(uint256 => TouristData) public touristData;
    uint256 private _nextTokenId;

    event TouristIDMinted(uint256 indexed tokenId, address indexed owner, string name, string digitalId);

    constructor() ERC721("TouristID", "TID") Ownable(msg.sender) {}

    // Mint a new Tourist ID NFT
    function mintTouristID(address to, string memory name, string memory digitalId) public onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _mint(to, tokenId);
        touristData[tokenId] = TouristData({
            name: name,
            digitalId: digitalId,
            isValid: true,
            mintedAt: block.timestamp
        });
        emit TouristIDMinted(tokenId, to, name, digitalId);
        return tokenId;
    }

    // Verify Tourist ID
    function verifyTouristID(uint256 tokenId) public view returns (address, string memory, string memory, bool) {
        require(_exists(tokenId), "Tourist ID does not exist");
        TouristData memory data = touristData[tokenId];
        return (ownerOf(tokenId), data.name, data.digitalId, data.isValid);
    }

    // Get Tourist ID data
    function getTouristID(uint256 tokenId) public view returns (address, string memory, string memory, bool) {
        return verifyTouristID(tokenId);
    }

    // Invalidate Tourist ID (for admin use)
    function invalidateTouristID(uint256 tokenId) public onlyOwner {
        require(_exists(tokenId), "Tourist ID does not exist");
        touristData[tokenId].isValid = false;
    }
}