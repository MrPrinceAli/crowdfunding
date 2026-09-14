// Mengisi blockchain lokal dengan data demo: 3 kampanye + beberapa donasi.
// Jalankan setelah deploy:  npm run seed:local
// Alamat contract bisa diganti lewat env CROWDFUNDING_ADDRESS (default: hasil deploy pertama di Hardhat node).
const hre = require("hardhat");

const CROWDFUNDING_ADDRESS = process.env.CROWDFUNDING_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const DAY = 24 * 60 * 60;

async function main() {
  const { ethers } = hre;
  const [account0, account1, account2, account3] = await ethers.getSigners();
  const crowdfunding = await ethers.getContractAt("Crowdfunding", CROWDFUNDING_ADDRESS);
  const eth = (value) => ethers.utils.parseEther(value);

  // Deadline = akhir hari (23:59:59), sama seperti form di frontend
  const now = (await ethers.provider.getBlock("latest")).timestamp;
  const endOfDay = (days) => {
    const date = new Date((now + days * DAY) * 1000);
    date.setHours(23, 59, 59, 0);
    return Math.floor(date.getTime() / 1000);
  };

  const campaigns = [
    {
      creator: account0,
      min: "0.1",
      days: 30,
      target: "10",
      title: "Beasiswa untuk 50 anak di pelosok",
      desc: "Bantu biaya sekolah anak-anak di desa terpencil selama satu tahun penuh, termasuk buku dan seragam.",
    },
    {
      creator: account1,
      min: "0.05",
      days: 14,
      target: "5",
      title: "Renovasi perpustakaan desa",
      desc: "Perpustakaan desa kami atapnya bocor. Dana akan dipakai untuk memperbaiki atap dan menambah rak buku.",
    },
    {
      creator: account2,
      min: "0.2",
      days: 45,
      target: "3",
      title: "Air bersih untuk Nusa Tenggara",
      desc: "Membangun sumur bor dan tandon air untuk 200 keluarga yang kesulitan akses air bersih.",
    },
  ];

  for (const campaign of campaigns) {
    await (
      await crowdfunding
        .connect(campaign.creator)
        .createProject(eth(campaign.min), endOfDay(campaign.days), eth(campaign.target), campaign.title, campaign.desc)
    ).wait();
  }

  const projects = await crowdfunding.getAllProjects();
  const [beasiswa, renovasi, airBersih] = projects.slice(-3);

  const donations = [
    { donor: account1, project: beasiswa, amount: "4.5" },
    { donor: account2, project: beasiswa, amount: "2" },
    { donor: account0, project: renovasi, amount: "1.2" },
    { donor: account3, project: airBersih, amount: "3" },
  ];

  for (const donation of donations) {
    await (
      await crowdfunding.connect(donation.donor).contribute(donation.project, { value: eth(donation.amount) })
    ).wait();
  }

  console.log("Data demo berhasil dibuat:");
  console.log(`- Beasiswa   ${beasiswa}  (pembuat Account #0, donatur #1 & #2)`);
  console.log(`- Renovasi   ${renovasi}  (pembuat Account #1, donatur #0)`);
  console.log(`- Air bersih ${airBersih}  (pembuat Account #2, donatur #3, target tercapai)`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
