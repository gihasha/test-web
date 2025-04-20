const express = require("express");
const { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");
const QRCode = require("qrcode");
const cors = require("cors");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

let sock;

app.post("/pair", async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).send({ error: "Phone number required" });

  const { state, saveCreds } = await useMultiFileAuthState(`./auth/${phone}`);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    syncFullHistory: false
  });

  sock.ev.on("connection.update", async ({ connection, qr, pairingCode }) => {
    if (qr) {
      const qrImage = await QRCode.toDataURL(qr);
      res.send({ type: "qr", qrImage });
    }

    if (pairingCode) {
      res.send({ type: "pair", pairingCode });
    }

    if (connection === "open") {
      console.log("✅ Connected to WhatsApp");
    }
  });

  sock.ev.on("creds.update", saveCreds);
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
