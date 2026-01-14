const makeWASocket = require('@whiskeysockets/baileys').default;
const { 
    useMultiFileAuthState, 
    DisconnectReason, 
    makeInMemoryStore,
    fetchLatestBaileysVersion 
} = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const pino = require('pino');
const { logger } = require('../utils/logger');
const { config } = require('./config');
const { messageHandler } = require('./handler');
const { security } = require('../utils/security');

class AyaTechBot {
    constructor() {
        this.store = makeInMemoryStore({ logger: pino({ level: 'silent' }) });
        this.sock = null;
        this.qrShown = false;
    }

    async connect() {
        try {
            const { state, saveCreds } = await useMultiFileAuthState(`./sessions/${config.bot.session}`);
            const { version } = await fetchLatestBaileysVersion();

            this.sock = makeWASocket({
                version,
                logger: pino({ level: 'silent' }),
                printQRInTerminal: !this.qrShown,
                auth: state,
                browser: ['AyaTech', 'Chrome', '1.0.0'],
                generateHighQualityLinkPreview: true,
                syncFullHistory: false,
                markOnlineOnConnect: true,
                keepAliveIntervalMs: 30000,
                connectTimeoutMs: 60000,
                defaultQueryTimeoutMs: 60000,
                retryRequestDelayMs: 250,
                maxMsgRetryCount: 5,
                msgRetryCounterMap: {},
                shouldSyncHistoryMessage: () => false,
                shouldIgnoreJid: (jid) => {
                    return jid === 'status@broadcast';
                }
            });

            this.store.bind(this.sock.ev);

            this.setupEventHandlers(saveCreds);
            
            return this.sock;
        } catch (error) {
            logger.error('Connection error:', error);
            throw error;
        }
    }

    setupEventHandlers(saveCreds) {
        // حفظ بيانات الاعتماد
        this.sock.ev.on('creds.update', saveCreds);

        // عند الاتصال الناجح
        this.sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr && !this.qrShown) {
                this.qrShown = true;
                logger.info('QR Code generated - Scan with WhatsApp');
            }

            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
                logger.info('Connection closed due to:', lastDisconnect?.error, ', reconnecting:', shouldReconnect);

                if (shouldReconnect) {
                    setTimeout(() => {
                        this.connect();
                    }, 5000);
                }
            } else if (connection === 'open') {
                logger.info('✅ AyaTech Bot Connected Successfully!');
                
                // إرسال رسالة للمالك عند الاتصال
                const ownerJid = `${config.owner.number}@s.whatsapp.net`;
                await this.sock.sendMessage(ownerJid, {
                    text: `🤖 *AyaTech Bot Online!*\n\n✅ تم الاتصال بنجاح\n📅 الوقت: ${new Date().toLocaleString('ar-MA')}\n🔐 الحالة: آمن`
                });
            }
        });

        // معالجة الرسائل الجديدة
        this.sock.ev.on('messages.upsert', async (messageUpdate) => {
            const { messages } = messageUpdate;
            
            for (const message of messages) {
                if (!message.message || message.key.fromMe) continue;
                
                try {
                    await messageHandler(this.sock, message);
                } catch (error) {
                    logger.error('Message handler error:', error);
                }
            }
        });

        // معالجة المشاركين في المجموعات
        this.sock.ev.on('group-participants.update', async (update) => {
            const { id, participants, action } = update;
            
            // رد تلقائي عند دخول الأعضاء
            if (action === 'add') {
                for (const participant of participants) {
                    const welcomeMsg = `👋 *أهلًا وسهلًا!*\n\nمرحبًا بك في المجموعة، أنا بوت *AyaTech*، أرسل *.menu* لرؤية الأوامر المتاحة.`;
                    
                    await this.sock.sendMessage(id, {
                        text: welcomeMsg,
                        mentions: [participant]
                    });
                }
            }
        });
    }

    async disconnect() {
        if (this.sock) {
            await this.sock.logout();
            logger.info('Bot disconnected');
        }
    }
}

async function startBot() {
    const bot = new AyaTechBot();
    
    // معالجة الإغلاق الآمن
    process.on('SIGINT', async () => {
        logger.info('Received SIGINT, shutting down gracefully...');
        await bot.disconnect();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        logger.info('Received SIGTERM, shutting down gracefully...');
        await bot.disconnect();
        process.exit(0);
    });

    // بدء الاتصال
    await bot.connect();
}

module.exports = { startBot, AyaTechBot };
