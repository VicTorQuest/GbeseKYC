# GbeseKYC

On-chain kyc verification smart contract for the gbese web app

**Contract Address:** `0x16B3574b38AE3653e6768b75344AE2E49D64ED0b`  
**Source Verified:** [Sourcify Full Match (Base Sepolia)](https://repo.sourcify.dev/contracts/full_match/84532/0x16B3574b38AE3653e6768b75344AE2E49D64ED0b/)
**Basescan Link:** [View on Base Sepolia](https://sepolia.basescan.org/address/0x16b3574b38ae3653e6768b75344ae2e49d64ed0b#code)

---

## Overview

The **Gbese KYCVerifier** smart contract provides a lightweight, on‑chain Self‑Sovereign Identity (SSI) check for Ethereum wallets. It allows a trusted off‑chain issuer (Gbese KYC backend) to sign EIP‑712 “KYC” credentials, and then on‑chain verification of those credentials to enable or restrict user actions (e.g. token minting, NFT rewards).

Key features:

- **EIP‑712 / ECDSA**‑based attestations  
- On‑chain boolean flag `isVerified[address]`  
- Separate, modular contract (decoupled from ERC‑20 and ERC‑721 logic)  
- Minimal storage footprint for low gas costs  

---

## Contract Details

- **Solidity Version:** `^0.8.28`  
- **Imports:**  
  - `@openzeppelin/contracts/utils/cryptography/EIP712.sol`  
  - `@openzeppelin/contracts/utils/cryptography/ECDSA.sol`  
- **Constructor:**  
  ```solidity
  constructor(address _issuer) EIP712("Gbese KYC", "1") {
    issuer = _issuer;
  }
  ```
  - Sets the trusted issuer address and domain parameters.
- **Public State:**
  ```solidity
  mapping(address => bool) public isVerified;
  ```
  - Maps each wallet address to a true/false KYC status.
- **Core Function:**
  ```solidity
  function verifyKYC(
    address user,
    uint256 issuedAt,
    bytes calldata sig
    ) external {
        // Recreate the digest the issuer signed:
        bytes32 structHash = keccak256(abi.encode(
            KYC_TYPEHASH,
            user,
            issuedAt
        ));
        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, sig);
        require(signer == issuer, "Invalid or unauthorized KYC signature");
        isVerified[user] = true;
    }
    ```
    - Recreates the EIP‑712 digest for (user, issuedAt), recovers the signer via ECDSA.recover, ensures it equals issuer, then sets isVerified[user] = true.

---

## Usage & Testing

### `scripts/run.js`

This script simulates the full KYC flow:
1. Deploys (or attaches to) `KYCVerifier`.
2. Builds EIP‑712 domain/types/message.
3. Uses `eth_signTypedData_v4` to have the issuer sign the payload.
4. The user calls `verifyKYC(...)` on‑chain.
5. Logs `isVerified[user]`.

```bash
npx hardhat run scripts/run.js --network baseSepolia
```
- **Automated Tests**
Located under `test/kycVerifierTest.js` 
Covers:
   - Valid signature → isVerified[user] becomes true.
   - Invalid signature → transaction reverts.
Run with
```bash
npx hardhat test
```

---

## Security & Next Steps
 - **Access Control**: Only the issuer address can produce valid KYC signatures.
 - **Replay Protection**: Adding an expiry window on issuedAt.
 - **Integration**: In our ERC‑20 or ERC‑721 contracts, we gate sensitive functions:
```solidity
require(kycVerifier.isVerified(msg.sender), "KYC required");
```
 - **Verification on Basescan**
 Contract verified via Sourcify. View here:
 [https://sepolia.basescan.org/address/0x16b3574b38ae3653e6768b75344ae2e49d64ed0b](https://sepolia.basescan.org/address/0x16b3574b38ae3653e6768b75344ae2e49d64ed0b)

