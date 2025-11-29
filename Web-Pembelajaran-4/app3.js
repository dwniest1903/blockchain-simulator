// --- Date & Time updater ---
function updateDateTime() {
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
  );
  const dayName = days[now.getDay()];
  const date = now.getDate();
  const month = months[now.getMonth()];
  const year = now.getFullYear();
  const hh = now.getHours().toString().padStart(2, "0");
  const mm = now.getMinutes().toString().padStart(2, "0");
  const ss = now.getSeconds().toString().padStart(2, "0");

  document.getElementById(
    "datetime"
  ).textContent = `${dayName}, ${date} ${month} ${year} (${hh}:${mm}:${ss} WIB)`;
}
setInterval(updateDateTime, 1000);
updateDateTime();

// --- SHA-256 helper ---
async function sha256(msg) {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(msg));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// --- Navigation ---
function showPage(pageId) {
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  document
    .querySelectorAll(".navbar button")
    .forEach((b) => b.classList.remove("active"));
  document.getElementById(pageId).classList.add("active");
  document
    .getElementById("tab-" + pageId.split("-")[1])
    .classList.add("active");
}
document.getElementById("tab-home").onclick = () => showPage("page-home");
document.getElementById("tab-hash").onclick = () => showPage("page-hash");
document.getElementById("tab-block").onclick = () => showPage("page-block");
document.getElementById("tab-chain").onclick = () => showPage("page-chain");
document.getElementById("tab-ecc").onclick = () => showPage("page-ecc");
// --- Hash Page ---
document.getElementById("hash-input").addEventListener("input", async (e) => {
  document.getElementById("hash-output").textContent = await sha256(
    e.target.value
  );
});

// --- Single Block Page ---
const blockNumber = document.getElementById("block-number");
const blockData = document.getElementById("block-data");
const blockNonce = document.getElementById("block-nonce");
const blockTimestamp = document.getElementById("block-timestamp");
const blockHash = document.getElementById("block-hash");
const speedControl = document.getElementById("speed-control");
const miningStatus = document.getElementById("mining-status");

let mining = false;

// Batasi input nonce: hanya angka
blockNonce.addEventListener("input", (e) => {
  e.target.value = e.target.value.replace(/[^0-9]/g, "");
  updateBlockHash();
});

async function updateBlockHash() {
  const number = blockNumber.value || "0";
  const data = blockData.value;
  const nonce = blockNonce.value || "0";
  const timestamp = blockTimestamp.value || "";
  const input = number + data + timestamp + nonce;
  blockHash.textContent = await sha256(input);
}
blockData.addEventListener("input", updateBlockHash);
blockNumber.addEventListener("input", updateBlockHash);

// Tombol Mine
document.getElementById("btn-mine").addEventListener("click", async () => {
  if (mining) return;
  const number = blockNumber.value.trim() || "0";
  const data = blockData.value.trim();
  if (!data) {
    alert("Isi data terlebih dahulu sebelum mining!");
    return;
  }

  // Set timestamp dan reset nilai
  const timestamp = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Jakarta",
  });
  blockTimestamp.value = timestamp;
  blockHash.textContent = "";
  blockNonce.value = "0";
  let nonce = 0;
  mining = true;

  const difficulty = "0000";
  const baseBatch = 1000;
  const speedMultiplier = parseInt(speedControl.value);
  const batchSize = baseBatch * speedMultiplier;

  miningStatus.textContent = "Mining dimulai...";
  const startTime = performance.now();

  async function mineBatch() {
    for (let i = 0; i < batchSize; i++) {
      const input = number + data + timestamp + nonce;
      const h = await sha256(input);
      if (h.startsWith(difficulty)) {
        blockNonce.value = nonce;
        blockHash.textContent = h;
        mining = false;
        const durasi = ((performance.now() - startTime) / 1000).toFixed(2);
        miningStatus.textContent = `Selesai! Nonce: ${nonce}, waktu: ${durasi} detik.`;
        return true;
      }
      nonce++;
    }
    blockNonce.value = nonce;
    miningStatus.textContent = `Mining... Nonce: ${nonce.toLocaleString()}`;
    return false;
  }

  async function mine() {
    const done = await mineBatch();
    if (!done && mining) requestAnimationFrame(mine);
  }
  mine();
});

// --- Blockchain Page ---
const ZERO_HASH = "0".repeat(64);
let blocks = [];
const chainDiv = document.getElementById("blockchain");

function renderChain() {
  chainDiv.innerHTML = "";
  blocks.forEach((blk, i) => {
    const div = document.createElement("div");
    div.className = "blockchain-block";
    div.innerHTML = `
      <h3>Block #${blk.index}</h3>
      <label>Previous Hash:</label>
      <div class="output" id="prev-${i}">${blk.previousHash}</div>

      <label>Data:</label>
      <textarea rows="3" id="data-${i}">${blk.data}</textarea>

      <label>Timestamp:</label>
      <div class="output" id="timestamp-${i}">${blk.timestamp}</div>

      <label>Nonce:</label>
      <div class="output" id="nonce-${i}">${blk.nonce}</div>

      <label>Hash:</label>
      <div class="output" id="hash-${i}">${blk.hash}</div>

      <button id="mine-${i}" class="mine">Mine Block</button>
      <div id="status-${i}" class="status"></div>
    `;
    chainDiv.appendChild(div);

    document.getElementById(`data-${i}`).addEventListener("input", (e) => {
      blocks[i].data = e.target.value;
      blocks[i].hash = "";
      blocks[i].timestamp = "";
      blocks[i].nonce = 0;
      document.getElementById(`hash-${i}`).textContent = "";
    });

    document.getElementById(`mine-${i}`).addEventListener("click", () => {
      mineChainBlock(i);
    });
  });
  // Setelah semua block dirender, kunci blok yang sudah ditambang
  blocks.forEach((blk, i) => {
    if (blk.hash && blk.hash.startsWith("0000")) {
      const dataField = document.getElementById(`data-${i}`);
      if (dataField) dataField.readOnly = true;
    }
  });
}

function addChainBlock() {
  const idx = blocks.length;
  const prev = idx ? blocks[idx - 1].hash || ZERO_HASH : ZERO_HASH;
  const blk = {
    index: idx,
    data: "",
    previousHash: prev,
    timestamp: "",
    nonce: 0,
    hash: "",
  };
  blocks.push(blk);
  renderChain();
  chainDiv.scrollLeft = chainDiv.scrollWidth;
}

async function mineChainBlock(i) {
  const blk = blocks[i];
  const prev = blk.previousHash;
  const data = blk.data;

  const timeDiv = document.getElementById(`timestamp-${i}`);
  const nonceDiv = document.getElementById(`nonce-${i}`);
  const hashDiv = document.getElementById(`hash-${i}`);
  const statusDiv = document.getElementById(`status-${i}`);

  blk.nonce = 0;
  blk.timestamp = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Jakarta",
  });
  timeDiv.textContent = blk.timestamp;
  hashDiv.textContent = "";
  statusDiv.textContent = "Mining dimulai...";
  const difficulty = "0000";

  const baseBatch = 1000;
  const batchSize = baseBatch * 10;
  const startTime = performance.now();

  async function mineBatch() {
    for (let j = 0; j < batchSize; j++) {
      const input = blk.index + prev + data + blk.timestamp + blk.nonce;
      const h = await sha256(input);
      if (h.startsWith(difficulty)) {
        blk.hash = h;
        hashDiv.textContent = h;

        //KUNCI FIELD DATA SETELAH MINING SELESAI
        document.getElementById(`data-${i}`).readOnly = true;

        const durasi = ((performance.now() - startTime) / 1000).toFixed(2);
        statusDiv.textContent = `Selesai! Nonce: ${blk.nonce}, waktu: ${durasi} detik.`;

        if (blocks[i + 1]) {
          blocks[i + 1].previousHash = blk.hash;
          renderChain();
        }
        return true;
      }
      blk.nonce++;
    }
    nonceDiv.textContent = blk.nonce;
    statusDiv.textContent = `Mining... Nonce: ${blk.nonce.toLocaleString()}`;
    return false;
  }

  async function mine() {
    const done = await mineBatch();
    if (!done) requestAnimationFrame(mine);
  }
  mine();
}

// === ECC Digital Signature Section ===
const ec = new elliptic.ec("secp256k1");

const eccPublic = document.getElementById("ecc-public");
const eccPrivate = document.getElementById("ecc-private");
const eccMessage = document.getElementById("ecc-message");
const eccSignature = document.getElementById("ecc-signature");
const eccVerifyResult = document.getElementById("ecc-verify-result");

// Helper: random private key (32 bytes hex)
function randomPrivateHex() {
  // gunakan crypto.getRandomValues untuk keamanan
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Helper: hex <-> Uint8Array
function hexToUint8(hex) {
  if (hex.startsWith("0x")) hex = hex.slice(2);
  const res = new Uint8Array(hex.length / 2);
  for (let i = 0; i < res.length; i++) {
    res[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return res;
}
function uint8ToHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Helper: normalize hex (lowercase, no 0x)
function normHex(h) {
  if (!h) return "";
  return h.toLowerCase().replace(/^0x/, "");
}

// Generate key pair (Bitcoin-like)
document.getElementById("btn-generate-key").onclick = async () => {
  eccVerifyResult.textContent = "";
  const privHex = randomPrivateHex();
  // Get key pair
  const key = ec.keyFromPrivate(privHex, "hex");
  const pubPoint = key.getPublic();

  // uncompressed: 04 + X + Y
  const x = pubPoint.getX().toString("hex").padStart(64, "0");
  const y = pubPoint.getY().toString("hex").padStart(64, "0");
  const pubUncompressed = "04" + x + y;

  eccPrivate.value = normHex(privHex);
  eccPublic.value = pubUncompressed;
  eccSignature.value = "";
};

// Sign message (use private key from textarea)
document.getElementById("btn-sign").onclick = async () => {
  try {
    const msg = eccMessage.value;
    if (!msg) {
      alert("Isi pesan yang akan ditandatangani!");
      return;
    }
    const privHex = normHex(eccPrivate.value.trim());
    if (!privHex || privHex.length !== 64) {
      alert("Private key tidak valid. Harus 32 byte hex (64 hex chars).");
      return;
    }

    // Hash pesan (sha256) -> hasil fungsi sha256() mengembalikan hex
    const msgHashHex = await sha256(msg); // hex string length 64
    const msgHashBytes = hexToUint8(msgHashHex);

    // sign (elliptic) — hasil default adalah object {r, s}
    const key = ec.keyFromPrivate(privHex, "hex");
    // use canonical (low S) by default elliptic produces canonical? we'll normalize s to lowS
    const signature = key.sign(msgHashHex, { canonical: true, hex: true }); // we can pass hex directly
    // DER-encoded signature (hex)
    const derHex = signature.toDER("hex");

    eccSignature.value = derHex; // tampilkan DER hex (mirip format Bitcoin tx sig)
    eccVerifyResult.textContent = "";
  } catch (err) {
    console.error(err);
    alert("Gagal menandatangani pesan: " + err.message);
  }
};

// Verify signature using public key input (accepts uncompressed or compressed hex)
document.getElementById("btn-verify").onclick = async () => {
  try {
    const msg = eccMessage.value;
    const sigHex = normHex(eccSignature.value.trim());
    let pubInput = eccPublic.value.trim();
    if (!msg || !sigHex || !pubInput) {
      alert("Pastikan pesan, signature, dan public key terisi!");
      return;
    }

    // pubInput might contain "compressed" note; pick first hex-looking line
    pubInput = pubInput.split(/\s+/).find((t) => /^([0-9a-fA-F]+)$/.test(t));
    if (!pubInput) {
      alert(
        "Public key tidak terdeteksi (pastikan hex public key ada di textarea)."
      );
      return;
    }
    pubInput = normHex(pubInput);

    // derive public key object
    let pubKey;
    try {
      // accept 04... (uncompressed) or 02/03... (compressed)
      pubKey = ec.keyFromPublic(pubInput, "hex");
    } catch (e) {
      alert("Public key tidak valid (format hex uncompressed/compressed).");
      return;
    }

    // prepare hash
    const msgHashHex = await sha256(msg);

    // verify DER signature
    const valid = pubKey.verify(msgHashHex, sigHex);

    eccVerifyResult.textContent = valid
      ? "Signature VALID! (public & private key cocok)"
      : "Signature TIDAK valid! (keys tidak cocok)";

    if (!valid) {
      // tambahan: coba beri tahu apakah public key berasal dari private yang berbeda
      // (tidak melakukan brute-force; cukup informatif)
      console.warn(
        "Verifikasi gagal. Pastikan public key cocok dengan private key yang dipakai untuk sign."
      );
    }
  } catch (err) {
    console.error(err);
    eccVerifyResult.textContent = "Terjadi kesalahan saat verifikasi.";
  }
};

// --- Init ---
document.getElementById("btn-add-block").onclick = addChainBlock;
addChainBlock();

