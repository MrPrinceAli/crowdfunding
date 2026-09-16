// Menyalin ABI hasil compile ke frontend/lib/abi (hanya ABI, tanpa bytecode & metadata) dan
// meng-export konstanta aturan (`uint256 public constant`) dari Solidity ke rules.json, sehingga
// frontend tidak perlu menulis ulang angka aturan. Dijalankan otomatis oleh `npm run compile`.
const fs = require("fs");
const path = require("path");

const CONTRACTS = ["Crowdfunding", "Project"];
const ARTIFACTS = path.join(__dirname, "..", "artifacts", "contracts");
const TARGET = path.join(__dirname, "..", "..", "frontend", "lib", "abi");

fs.mkdirSync(TARGET, { recursive: true });

for (const name of CONTRACTS) {
  const artifact = JSON.parse(fs.readFileSync(path.join(ARTIFACTS, `${name}.sol`, `${name}.json`), "utf8"));
  fs.writeFileSync(path.join(TARGET, `${name}.json`), `${JSON.stringify(artifact.abi, null, 2)}\n`);
  console.log(`ABI ${name} -> frontend/lib/abi/${name}.json`);
}

/** Baca `uint256 public constant NAMA = 3 days;` dari file Solidity menjadi { NAMA: detik/angka } */
const readConstants = (file) => {
  const source = fs.readFileSync(file, "utf8");
  const rules = {};
  for (const [, name, value, unit] of source.matchAll(
    /uint256 public constant (\w+) = (\d+)(?:\s+(days|hours|minutes))?;/g,
  )) {
    const multiplier = { days: 86400, hours: 3600, minutes: 60 }[unit] || 1;
    rules[name] = Number(value) * multiplier;
  }
  return rules;
};

const rules = CONTRACTS.reduce(
  (all, name) => ({ ...all, ...readConstants(path.join(__dirname, "..", "contracts", `${name}.sol`)) }),
  {},
);
fs.writeFileSync(path.join(TARGET, "rules.json"), `${JSON.stringify(rules, null, 2)}\n`);
console.log("Konstanta aturan -> frontend/lib/abi/rules.json");
