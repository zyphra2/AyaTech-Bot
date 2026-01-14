const { config } = require('../../core/config');

module.exports = {
    config: {
        name: 'ping',
        command: 'ping',
        aliases: ['بنج', 'سرعة'],
        category: 'general',
        description: 'اختبار سرعة استجابة البوت',
        usage: '.ping',
        cooldown: 3,
        ownerOnly: false,
        groupOnly: false,
        privateOnly: false,
        adminOnly: false
    },

    async execute(sock, messageInfo, args) {
        const { from, sender } = messageInfo;
        
        try {
            const start = Date.now();
            
            // رسالة مؤقتة
            const tempMsg = await sock.sendMessage(from, {
                text: '🏓 *Pong!* - جاري القياس...'
            });
            
            const end = Date.now();
            const ping = end - start;
            
            // تحديد حالة السرعة
            let status = '🔴 بطيء';
            if (ping < 300) status = '🟢 سريع جدًا';
            else if (ping < 500) status = '🟡 جيد';
            else if (ping < 800) status = '🟠 مقبول';
            
            const response = `
╭───「 *سرعة الاستجابة* 」───
│ 🏓 *البنج:* ${ping}ms
│ 📊 *الحالة:* ${status}
│ ⏱️ *الوقت:* ${new Date().toLocaleTimeString('ar-MA')}
╰─────────────────────

🤖 *${config.bot.name}* - جاهز للخدمة!
`;
            
            // تعديل الرسالة
            await sock.sendMessage(from, {
                text: response,
                edit: tempMsg.key
            });
            
        } catch (error) {
            console.error('Ping command error:', error);
            await sock.sendMessage(from, {
                text: '❌ حدث خطأ أثناء قياس السرعة'
            });
        }
    }
};
