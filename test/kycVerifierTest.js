const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("KYCVerifier", function () {
  let kyc, issuer, user, chainId;

  beforeEach(async () => {
    [issuer, user] = await ethers.getSigners();
    const KYC = await ethers.getContractFactory("KYCVerifier");
    kyc = await KYC.deploy(issuer.address);
    // ethers v6: contract address is .target
    await kyc.waitForDeployment();

    ({ chainId } = await ethers.provider.getNetwork());
  });

  it("verifies KYC with a valid EIP-712 signature", async () => {
    // 1) Build domain & types exactly as your contract expects
    const domain = {
      name: "Gbese KYC",
      version: "1",
      chainId: Number(network.chainId),
      verifyingContract: kyc.target,
    };
    const types = {
      KYC: [
        { name: "user", type: "address" },
        { name: "issuedAt", type: "uint256" },
      ],
    };
    const message = {
      user: user.address,
      issuedAt: Math.floor(Date.now() / 1000),
    };

    // 2) Ask Hardhat node to sign it (eth_signTypedData_v4)
    const signature = await ethers.provider.send(
      "eth_signTypedData_v4",
      [
        issuer.address,
        JSON.stringify({
          domain,
          types: { EIP712Domain: [
              { name: "name", type: "string" },
              { name: "version", type: "string" },
              { name: "chainId", type: "uint256" },
              { name: "verifyingContract", type: "address" },
            ],
            KYC: types.KYC
          },
          primaryType: "KYC",
          message
        })
      ]
    );

    // 3) User submits proof on-chain
    await kyc.connect(user).verifyKYC(user.address, message.issuedAt, signature);

    // 4) Assert the user is now flagged as KYC’d
    expect(await kyc.isKYCed(user.address)).to.be.true;
  });

  it("rejects with an invalid signature", async () => {
    const domain = {
      name: "Gbese KYC",
      version: "1",
      chainId: Number(network.chainId),
      verifyingContract: kyc.target,
    };
    const types = {
      KYC: [
        { name: "user", type: "address" },
        { name: "issuedAt", type: "uint256" },
      ],
    };
    const message = {
      user: user.address,
      issuedAt: Math.floor(Date.now() / 1000),
    };

    // 1) Signed by the wrong account (not `issuer`)
    const fakeSig = await ethers.provider.send(
      "eth_signTypedData_v4",
      [
        user.address,  // wrong signer
        JSON.stringify({
          domain,
          types: { EIP712Domain: [
              { name: "name", type: "string" },
              { name: "version", type: "string" },
              { name: "chainId", type: "uint256" },
              { name: "verifyingContract", type: "address" },
            ],
            KYC: types.KYC
          },
          primaryType: "KYC",
          message
        })
      ]
    );

    // 2) Attempt to verify with the bad signature → should revert
    await expect(
      kyc.connect(user).verifyKYC(user.address, message.issuedAt, fakeSig)
    ).to.be.revertedWith("Invalid or unauthorized KYC signature");
  });
});
