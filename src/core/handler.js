const { config } = require('./config');
const { security } = require('../utils/security');
const { logger } = require('../utils/logger');
const { formatMessage } = require('../utils/formatter');
const fs = require('fs').promises;
const path = require('path');

class MessageHandler {
    constructor() {
        this.plugins = new Map();
        this.commands = new Map();
        this.aliases = new Map();
        this.cooldowns = new Map();
        this.loadPlugins();
    }

    async loadPlugins() {
        const pluginsDir = path.join(__dirname, '../plugins');
        
        try {
            const categories = await fs.readdir(pluginsDir);
            
            for (const category of categories) {
                const categoryPath = path.join(pluginsDir, category);
                const stat = await fs.stat(categoryPath);
                
                if (stat.isDirectory()) {
                    const files = await fs.readdir(categoryPath);
                    
                    for (const file of files) {
                        if (file.endsWith('.js')) {
                            const filePath = path.join(categoryPath, file);
                            delete require.cache[require.resolve(filePath)];
                            
                            try {
                                const plugin = require(filePath);
                                
                                if (plugin.config && plugin.config.command) {
                                    const commandName = plugin.config.command.toLowerCase();
                                    this.plugins.set(commandName, plugin);
                                    this.commands.set(commandName, plugin);
                                    
                                    // تحميل الأسماء المستعارة
                                    if (plugin.config.aliases) {
                                        for (const alias of plugin.config.aliases) {
                                            this.aliases.set(alias.toLowerCase(), commandName);
                                        }
                                    }
                                    
                                    logger.info(`Loaded plugin: ${commandName} (${category})`);
                                }
                            } catch (error) {
                                logger.error(`Error loading plugin ${file}:`, error);
                            }
                        }
                    }
                }
            }
            
            logger.info(`✅ Loaded ${this.plugins.size} plugins successfully`);
        } catch (error) {
            logger.error('Error loading plugins:', error);
        }
    }

    async handle(sock, message) {
        try {
            const messageInfo = await formatMessage(sock, message);
            if (!messageInfo) return;

            const { text, from, sender, isGroup, isOwner, isAdmin } = messageInfo;

            // التحقق من الأوامر
            if (!text.startsWith(config.bot.prefix)) return;

            const args = text.slice(config.bot.prefix.length).trim().split(' ');
            const commandName = args.shift().toLowerCase();

            // البحث عن الأمر
            let plugin = this.commands.get(commandName) || 
                        this.commands.get(this.aliases.get(commandName));

            if (!plugin) return;

            // التحقق من الأمان
            if (plugin.config.ownerOnly && !isOwner) {
                return await this.sendReply(sock, from, '❌ هذا الأمر مخصص للمالك فقط!', message);
            }

            if (plugin.config.groupOnly && !isGroup) {
                return await this.sendReply(sock, from, '❌ هذا الأمر يعمل فقط في المجموعات!', message);
            }

            if (plugin.config.privateOnly && isGroup) {
                return await this.sendReply(sock, from, '❌ هذا الأمر يعمل فقط في الخاص!', message);
            }

            if (plugin.config.adminOnly && !isAdmin && !isOwner) {
                return await this.sendReply(sock, from, '❌ هذا الأمر يتطلب صلاحيات مشرف!', message);
            }

            // التحقق من التباطؤ (Cooldown)
            if (this.cooldowns.has(commandName)) {
                const cooldownData = this.cooldowns.get(commandName);
                if (Date.now() - cooldownData.lastUsed < cooldownData.duration) {
                    const remaining = Math.ceil((cooldownData.duration - (Date.now() - cooldownData.lastUsed)) / 1000);
                    return await this.sendReply(sock, from, `⏳ يرجى الانتظار ${remaining} ثانية قبل استخدام الأمر مرة أخرى.`, message);
                }
            }

            // مكافحة البريد العشوائي
            if (config.settings.antispam && !isOwner) {
                const userSpam = security.checkSpam(sender);
                if (userSpam.isSpam) {
                    return await this.sendReply(sock, from, `⚠️ تم اكتشاف بريد عشوائي! يرجى الانتظار ${Math.ceil(userSpam.remainingTime / 1000)} ثانية.`, message);
                }
            }

            // تنفيذ الأمر
            try {
                await plugin.execute(sock, messageInfo, args);
                
                // تعيين التباطؤ
                if (plugin.config.cooldown) {
                    this.cooldowns.set(commandName, {
                        lastUsed: Date.now(),
                        duration: plugin.config.cooldown * 1000
                    });
                }

                // تسجيل الاستخدام
                logger.info(`Command executed: ${commandName} by ${sender} in ${isGroup ? 'group' : 'private'}`);
                
            } catch (error) {
                logger.error(`Error executing command ${commandName}:`, error);
                await this.sendReply(sock, from, '❌ حدث خطأ أثناء تنفيذ الأمر. يرجى المحاولة مرة أخرى.', message);
            }

        } catch (error) {
            logger.error('Message handler error:', error);
        }
    }

    async sendReply(sock, to, text, quotedMessage) {
        try {
            await sock.sendMessage(to, {
                text: text,
                contextInfo: {
                    externalAdReply: {
                        title: config.bot.name,
                        body: 'AyaTech Bot',
                        thumbnailUrl: 'https://i.ibb.co/5sZ2z2z/ayatech-logo.png',
                        sourceUrl: 'https://github.com/ayatech',
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, {
                quoted: quotedMessage
            });
        } catch (error) {
            logger.error('Error sending reply:', error);
        }
    }
}

const messageHandler = new MessageHandler();

module.exports = { 
    messageHandler: messageHandler.handle.bind(messageHandler),
    MessageHandler 
};
