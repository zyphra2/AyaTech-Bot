require('dotenv').config();

module.exports = {
    bot: {
        name: process.env.BOT_NAME || 'AyaTech',
        prefix: process.env.PREFIX || '.',
        session: process.env.SESSION_NAME || 'ayatech_session'
    },
    
    owner: {
        name: process.env.OWNER_NAME || 'Aya Es-samlaly',
        number: process.env.OWNER_NUMBER || '212728254498',
        email: process.env.OWNER_EMAIL || 'ayaes-samlalytech@proton.me',
        country: process.env.COUNTRY || 'Morocco'
    },
    
    api: {
        openai: process.env.OPENAI_API_KEY
    },
    
    settings: {
        autoRead: process.env.AUTO_READ === 'true',
        autoTyping: process.env.AUTO_TYPING === 'true',
        autoRecording: process.env.AUTO_RECORDING === 'true',
        antispam: process.env.ANTISPAM === 'true',
        antispamDuration: parseInt(process.env.ANTISPAM_DURATION) || 5000,
        maxWarnings: parseInt(process.env.MAX_WARNINGS) || 3,
        maxDownloadSize: process.env.MAX_DOWNLOAD_SIZE || '100MB',
        allowedFormats: process.env.ALLOWED_FORMATS?.split(',') || ['mp4', 'mp3', 'jpg', 'png', 'pdf']
    },
    
    security: {
        allowedGroups: process.env.ALLOWED_GROUPS || 'all',
        autoJoin: process.env.AUTO_JOIN === 'true'
    }
};
