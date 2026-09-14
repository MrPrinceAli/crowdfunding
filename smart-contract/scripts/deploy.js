const hre = require("hardhat");

async function main() {
  // We get the contract to deploy
  const Crowdfunding = await hre.ethers.getContractFactory("Crowdfunding");
  const crowdfunding = await Crowdfunding.deploy();

  await crowdfunding.deployed();

  console.log("Crowdfunding deployed to:", crowdfunding.address);
  console.log("");
  console.log("Pastikan alamat ini sama dengan NEXT_PUBLIC_CROWDFUNDING_ADDRESS di frontend/.env.local");
  console.log("Isi data demo (opsional): npm run seed:local");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
