const fs = require('fs');
const path = require('path');
const { isOwner } = require('../lib/utils');

const plugins = {};
const pluginsDir = path.join(__dirname, '../plugins');

// تحميل الـ Plugins تلقائيًا
fs.readdirSync(pluginsDir).forEach(file => {
  if (file.endsWith('.js')) {
    const plugin = require(path.join(pluginsDir, file));
    if (plugin.command) {
      plugins[plugin.command] = plugin;
    }
  }
});

function handleMessages(sock) {
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message) return;

    const from = msg.key.remoteJid;
    const sender = msg.key.participant || from;
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
    const isGroup = from.endsWith('@g.us');
    const isOwnerCheck = isOwner(sender);

    // رد تلقائي (مثال بسيط)
    if (text.toLowerCase().includes('hello')) {
      await sock.sendMessage(from, { text: 'Hello! I am AyaTech Bot.' });
    }

    // معالجة الأوامر (تبدأ بـ .)
    if (text.startsWith('.')) {
      const command = text.split(' ')[0].slice(1).toLowerCase();
      if (plugins[command]) {
        const plugin = plugins[command];
        if (plugin.ownerOnly && !isOwnerCheck) {
          return sock.sendMessage(from, { text: 'This command is for owner only!' });
        }
        await plugin.handler(sock, msg, text, isGroup, isOwnerCheck);
      }
    }
  });
}

module.exports = { handleMessages };
