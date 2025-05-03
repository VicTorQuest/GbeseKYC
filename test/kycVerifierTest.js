const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("KYCVerifier", function () {
  let kyc, issuer, user, rawChainId;

  beforeEach(async () => {
    [issuer, user] = await ethers.getSigners();
    const KYC = await ethers.getContractFactory("KYCVerifier");
    kyc = await KYC.deploy(issuer.address);
    await kyc.waitForDeployment();

    // rawChainId might be a BigInt in ethers v6
    ({ chainId: rawChainId } = await ethers.provider.getNetwork());
  });

  it("verifies KYC with a valid EIP-712 signature", async () => {
    // convert BigInt → number
    const chainId = Number(rawChainId);

    const domain = {
      name: "Gbese KYC",
      version: "1",
      chainId,                    // now a JS number
      verifyingContract: kyc.target,
    };
    const types = {
      KYC: [
        { name: "user",    type: "address" },
        { name: "issuedAt", type: "uint256" },
      ],
    };
    const message = {
      user: user.address,
      issuedAt: Math.floor(Date.now() / 1000),
    };

    const payload = JSON.stringify({
      domain,
      types: {
        EIP712Domain: [
          { name: "name",             type: "string"  },
          { name: "version",          type: "string"  },
          { name: "chainId",          type: "uint256" },
          { name: "verifyingContract",type: "address" },
        ],
        KYC: types.KYC,
      },
      primaryType: "KYC",
      message,
    });

    const signature = await ethers.provider.send(
      "eth_signTypedData_v4",
      [issuer.address, payload]
    );

    await kyc.connect(user).verifyKYC(
      user.address,
      message.issuedAt,
      signature
    );

    expect(await kyc.isVerified(user.address)).to.be.true;
  });

  it("rejects with an invalid signature", async () => {
    const chainId = Number(rawChainId);

    const domain = {
      name: "Gbese KYC",
      version: "1",
      chainId,
      verifyingContract: kyc.target,
    };
    const types = {
      KYC: [
        { name: "user",    type: "address" },
        { name: "issuedAt", type: "uint256" },
      ],
    };
    const message = {
      user: user.address,
      issuedAt: Math.floor(Date.now() / 1000),
    };

    const payload = JSON.stringify({
      domain,
      types: {
        EIP712Domain: [
          { name: "name",             type: "string"  },
          { name: "version",          type: "string"  },
          { name: "chainId",          type: "uint256" },
          { name: "verifyingContract",type: "address" },
        ],
        KYC: types.KYC,
      },
      primaryType: "KYC",
      message,
    });

    // signed by the wrong account
    const fakeSig = await ethers.provider.send(
      "eth_signTypedData_v4",
      [user.address, payload]
    );

    await expect(
      kyc.connect(user).verifyKYC(
        user.address,
        message.issuedAt,
        fakeSig
      )
    ).to.be.revertedWith("Invalid or unauthorized KYC signature");
  });
});
