const fs = require("fs");
const path = require("path");

const outDir = path.join(__dirname, "..", "src", "lib", "abi");
fs.mkdirSync(outDir, { recursive: true });

const arts = [
  ["KingNFTFactory", "artifacts/contracts/KingNFTFactory.sol/KingNFTFactory.json"],
  ["KingNFTCollection", "artifacts/contracts/KingNFTCollection.sol/KingNFTCollection.json"],
];

for (const [name, rel] of arts) {
  const full = path.join(__dirname, "..", rel);
  const j = JSON.parse(fs.readFileSync(full, "utf8"));
  const out = { contractName: name, abi: j.abi, bytecode: j.bytecode };
  fs.writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify(out, null, 2));
  console.log("exported", name);
}
