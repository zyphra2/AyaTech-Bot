require('dotenv').config();
const { logger } = require('./src/utils/logger');
const { startBot } = require('./src/core/bot');

console.clear();
console.log(`
╔══════════════════════════════════════╗
║          🤖 AyaTech Bot MD           ║
║    Professional WhatsApp Multi-Device║
║         By: Aya Es-samlaly           ║
║    Email: ayaes-samlalytech@proton.me║
╚══════════════════════════════════════╝
`);

// بدء البوت
startBot().catch(err => {
    logger.error('Failed to start bot:', err);
    process.exit(1);
});