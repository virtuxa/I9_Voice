const db = require('../database/db');

const checkChatAccess = async (req, res, next) => {
    try {
        const { chatId } = req.params;
        const userId = req.user.userId;

        const member = await db.query(
            'SELECT * FROM chat_members WHERE chat_id = $1 AND user_id = $2',
            [chatId, userId]
        );

        if (member.rows.length === 0) {
            return res.status(403).json({
                status: 1,
                error: 'Нет доступа к чату'
            });
        }

        // Добавляем информацию о роли пользователя в чате
        req.chatMember = member.rows[0];
        next();
    } catch (error) {
        res.status(500).json({
            status: 1,
            error: 'Ошибка сервера'
        });
    }
};

module.exports = { checkChatAccess };