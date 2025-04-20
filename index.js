const express = require("express");
const {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  useInititalConnectOptions
} = require("@whiskeysockets/baileys");

const cors = require("cors");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/pair", async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).send({ error: "Phone number required" });

  const { state, saveCreds } = await useMultiFileAuthState(`./auth/${phone}`);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    syncFullHistory: false
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, pairingCode } = update;

    if (pairingCode) {
      return res.send({ type: "pair", pairingCode });
    }

    if (connection === "open") {
      console.log("✅ Connected");
    }

    if (update.qr) {
      // fallback for QR
      return res.send({ type: "qr", qrImage: await require("qrcode").toDataURL(update.qr) });
    }
  });

  sock.ev.on("creds.update", saveCreds);

  // >> THIS IS KEY <<
  await sock.requestPairingCode(phone + "@s.whatsapp.net").then(code => {
    res.send({ type: "pair", pairingCode: code });
  }).catch(err => {
    console.error("Error creating pairing code:", err);
    res.status(500).send({ error: "Failed to generate pair code" });
  });
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
