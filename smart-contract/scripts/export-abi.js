// Menyalin ABI hasil compile ke frontend/lib/abi (hanya ABI, tanpa bytecode & metadata).
// Dijalankan otomatis oleh `npm run compile`, sehingga frontend selalu memakai ABI terbaru.
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
