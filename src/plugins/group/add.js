const { config } = require('../../core/config');
const { security } = require('../../utils/security');

module.exports = {
    config: {
        name: 'add',
        command: 'add',
        aliases: ['اضف', 'انضمام'],
        category: 'group',
        description: 'إضافة عضو إلى المجموعة',
        usage: '.add <رقم الهاتف>',
        cooldown: 10,
        ownerOnly: false,
        groupOnly: true,
        privateOnly: false,
        adminOnly: true
    },

    async execute(sock, messageInfo, args) {
        const { from, sender, isGroup, isAdmin, isOwner } = messageInfo;
        
        try {
            if (!isGroup) {
                return await sock.sendMessage(from, {
                    text: '❌ هذا الأمر يعمل فقط في المجموعات!'
                });
            }

            if (!isAdmin && !isOwner) {
                return await sock.sendMessage(from, {
                    text: '❌ هذا الأمر يتطلب صلاحيات مشرف!'
                });
            }

            if (!args[0]) {
                return await sock.sendMessage(from, {
                    text: '❌ يرجى إدخال رقم الهاتف!\n\n📌 مثال: .add 2126XXXXXXXX'
                });
            }

            // تنظيف رقم الهاتف
            let number = args[0].replace(/[^0-9]/g, '');
            
            // إضافة بادئة المغرب إذا لم تكن موجودة
            if (!number.startsWith('212')) {
                if (number.startsWith('0')) {
                    number = '212' + number.slice(1);
                } else {
                    number = '212' + number;
                }
            }

            const userId = `${number}@s.whatsapp.net`;
            
            // محاولة إضافة العضو
            try {
                const response = await sock.groupParticipantsUpdate(
                    from,
                    [userId],
                    'add'
                );

                const result = response[0];
                
                if (result.status === '200') {
                    await sock.sendMessage(from, {
                        text: `✅ تمت إضافة العضو بنجاح!\n\n📱 الرقم: +${number}`,
                        mentions: [userId]
                    });
                } else {
                    let errorMsg = '❌ فشلت عملية الإضافة';
                    
                    switch (result.status) {
                        case '403':
                            errorMsg = '❌ لا يمكن إضافة هذا الرقم (قد يكون محظورًا)';
                            break;
                        case '408':
                            errorMsg = '❌ انتهت مهلة الطلب';
                            break;
                        case '409':
                            errorMsg = '❌ العضو بالفعل في المجموعة';
                            break;
                        case '500':
                            errorMsg = '❌ خطأ في الخادم';
                            break;
                        case '503':
                            errorMsg = '❌ الخدمة غير متاحة حاليًا';
                            break;
                    }
                    
                    await sock.sendMessage(from, { text: errorMsg });
                }
                
            } catch (error) {
                console.error('Add participant error:', error);
                await sock.sendMessage(from, {
                    text: '❌ حدث خطأ أثناء إضافة العضو\n🔍 تأكد من صحة الرقم وإعدادات الخصوصية'
                });
            }

        } catch (error) {
            console.error('Add command error:', error);
            await sock.sendMessage(from, {
                text: '❌ حدث خطأ غير متوقع'
            });
        }
    }
};
