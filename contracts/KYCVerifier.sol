// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
// import "hardhat/console.sol";

contract KYCVerifier is EIP712 {
    address public issuer; 
    mapping(address => bool) public isKYCed;
    bytes32 public constant KYC_TYPEHASH = keccak256("KYC(address user,uint256 issuedAt)");

    constructor(address _issuer) EIP712("Gbese KYC", "1") {
        issuer = _issuer;
    }

    function verifyKYC(address user, uint256 issuedAt, bytes calldata sig) external {
        // Recreate the digest the issuer signed:
        bytes32 structHash = keccak256(abi.encode(
            KYC_TYPEHASH,
            user,
            issuedAt
        ));
        bytes32 digest = _hashTypedDataV4(structHash);
        // Recover signer and check it’s the trusted KYC issuer:
        address signer = ECDSA.recover(digest, sig);
        require(signer == issuer, "Invalid or unauthorized KYC signature");
        // (Optional: add expiry check for issuedAt here)
        isKYCed[user] = true;
    }
}

