const { config } = require('../core/config');
const { logger } = require('./logger');

class SecurityManager {
    constructor() {
        this.spamTracker = new Map();
        this.blockedUsers = new Set();
        this.warnings = new Map();
    }

    // التحقق من البريد العشوائي
    checkSpam(userId) {
        const now = Date.now();
        const userData = this.spamTracker.get(userId) || {
            count: 0,
            lastMessage: 0,
            firstMessage: now,
            blocked: false
        };

        // إعادة تعيين العداد كل دقيقة
        if (now - userData.firstMessage > 60000) {
            userData.count = 0;
            userData.firstMessage = now;
        }

        userData.count++;
        userData.lastMessage = now;

        // الكشف عن البريد العشوائي
        const isSpam = userData.count > 10 || 
                      (userData.count > 5 && now - userData.lastMessage < 3000);

        if (isSpam) {
            userData.blocked = true;
            const remainingTime = config.settings.antispamDuration - (now - userData.lastMessage);
            
            this.spamTracker.set(userId, userData);
            
            return {
                isSpam: true,
                remainingTime: Math.max(0, remainingTime)
            };
        }

        this.spamTracker.set(userId, userData);
        
        return {
            isSpam: false,
            remainingTime: 0
        };
    }

    // التحقق من صلاحية المالك
    isOwner(userId) {
        const ownerNumber = config.owner.number.replace('+', '');
        return userId.includes(ownerNumber);
    }

    // حظر المستخدم
    blockUser(userId) {
        this.blockedUsers.add(userId);
        logger.warn(`User blocked: ${userId}`);
    }

    // إلغاء حظر المستخدم
    unblockUser(userId) {
        this.blockedUsers.delete(userId);
        logger.info(`User unblocked: ${userId}`);
    }

    // التحقق من الحظر
    isBlocked(userId) {
        return this.blockedUsers.has(userId);
    }

    // التحقق من صلاحيات المشرف
    async isGroupAdmin(sock, groupId, userId) {
        try {
            const groupMetadata = await sock.groupMetadata(groupId);
            const participant = groupMetadata.participants.find(p => p.id === userId);
            return participant && (participant.admin === 'admin' || participant.admin === 'superadmin');
        } catch (error) {
            logger.error('Error checking admin status:', error);
            return false;
        }
    }

    // تنظيف البيانات القديمة
    cleanup() {
        const now = Date.now();
        const cleanupInterval = 10 * 60 * 1000; // 10 دقائق

        for (const [userId, data] of this.spamTracker.entries()) {
            if (now - data.lastMessage > cleanupInterval) {
                this.spamTracker.delete(userId);
            }
        }
    }

    // تشفير البيانات الحساسة
    encrypt(text) {
        // يمكن إضافة خوارزمية تشفير حقيقية هنا
        return Buffer.from(text).toString('base64');
    }

    // فك التشفير
    decrypt(encryptedText) {
        // يمكن إضافة خوارزمية فك تشفير حقيقية هنا
        return Buffer.from(encryptedText, 'base64').toString();
    }
}

const security = new SecurityManager();

// تنظيف دوري
setInterval(() => {
    security.cleanup();
}, 5 * 60 * 1000); // كل 5 دقائق

module.exports = { security, SecurityManager };
