require('dotenv').config();
const { connectToWhatsApp } = require('./src/connection');
const { handleMessages } = require('./src/handler');

async function startBot() {
  console.log('Starting AyaTech Bot...');
  const sock = await connectToWhatsApp();
  handleMessages(sock);
}

startBot();
