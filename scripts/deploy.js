const hre = require("hardhat");

async function main() {
  const [issuer] = await hre.ethers.getSigners();
  console.log("Deploying KYCVerifier with issuer:", issuer.address);

  const KYC = await hre.ethers.getContractFactory("KYCVerifier");
  const kyc = await KYC.deploy(issuer.address);


  if (kyc.waitForDeployment) {
    await kyc.waitForDeployment();
  } else {
    await kyc.deployed();
  }

  console.log("KYCVerifier deployed to:", kyc.target || kyc.address);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
