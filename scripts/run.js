// scripts/run.js
const hre = require("hardhat");

const main = async () => {
  const [issuer, user] = await hre.ethers.getSigners();
  const issuerBalance = await hre.ethers.provider.getBalance(issuer.address);

  console.log("Using issuer account: ", issuer.address);
  console.log("Issuer Balance:   ", issuerBalance.toString());

  // 1. Deploy KYCVerifier
  const KYCFactory = await hre.ethers.getContractFactory("KYCVerifier");
  const kyc = await KYCFactory.deploy(issuer.address);
  await kyc.waitForDeployment();
  console.log("KYCVerifier deployed to:", kyc.target);

  // 2. Prepare EIP-712 domain & types
  const network = await hre.ethers.provider.getNetwork();
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

  // 3. Build the message
  const issuedAt = Math.floor(Date.now() / 1000);
  const message = {
    user: user.address,
    issuedAt,
  };

  // 4. Sign using eth_signTypedData_v4
  const payload = JSON.stringify({
    domain,
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ],
      KYC: types.KYC,
    },
    primaryType: "KYC",
    message,
  });
  const signature = await hre.ethers.provider.send("eth_signTypedData_v4", [
    issuer.address,
    payload,
  ]);
  console.log("Generated KYC signature:", signature);

  // 5. Call verifyKYC as the user
  const tx = await kyc.connect(user).verifyKYC(
    user.address,
    issuedAt,
    signature
  );
  console.log("verifyKYC tx hash:", tx.hash);
  await tx.wait();

  // 6. Confirm status
  const verified = await kyc.isVerified(user.address);
  console.log(`User ${user.address} verified?`, verified);
};

const runMain = async () => {
  try {
    await main();
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

runMain();
