const { makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys');
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true, // يعرض QR في الطرفية
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      console.log('Scan this QR Code:');
      qrcode.generate(qr, { small: true });
    }
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        console.log('Reconnecting...');
        connectToWhatsApp();
      } else {
        console.log('Logged out. Delete auth_info_baileys folder and restart.');
      }
    } else if (connection === 'open') {
      console.log('Connected to WhatsApp!');
    }
  });

  sock.ev.on('creds.update', saveCreds);
  return sock;
}

module.exports = { connectToWhatsApp };
