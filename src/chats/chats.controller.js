const db = require('../database/db');

// Получение списка чатов пользователя
const getMyChats = async (req, res) => {
    try {
        const userId = req.user.userId;

        const chats = await db.query(`
            SELECT c.* 
            FROM chats c
            JOIN chat_members cm ON c.chat_id = cm.chat_id 
            WHERE cm.user_id = $1
        `, [userId]);

        res.json({
            status: 0,
            data: chats.rows
        });
    } catch (error) {
        res.status(500).json({
            status: 1,
            error: 'Server error: ' + error.message
        });
    }
};

// Создание нового чата
const createChat = async (req, res) => {
    try {
        const { name, type, targetUserId } = req.body;
        const userId = req.user.userId;

        // Для личного чата
        if (type === 'personal') {
            if (!targetUserId) {
                return res.status(400).json({
                    status: 1,
                    error: 'Необходимо указать пользователя для личного чата'
                });
            }

            // Проверяем существование целевого пользователя
            const targetUser = await db.query('SELECT * FROM users WHERE user_id = $1', [targetUserId]);
            if (targetUser.rows.length === 0) {
                return res.status(400).json({
                    status: 1,
                    error: 'Указанный пользователь не существует'
                });
            }

            // Проверяем, существует ли уже личный чат между пользователями
            const existingChat = await db.query(`
                SELECT c.* FROM chats c
                JOIN chat_members cm1 ON c.chat_id = cm1.chat_id
                JOIN chat_members cm2 ON c.chat_id = cm2.chat_id
                WHERE c.chat_type = 'personal'
                AND cm1.user_id = $1 AND cm2.user_id = $2
            `, [userId, targetUserId]);

            if (targetUserId === userId) {
                return res.status(400).json({
                    status: 1,
                    error: 'Нельзя создать личный чат с самим собой'
                });
            }

            if (existingChat.rows.length > 0) {
                return res.status(400).json({
                    status: 1,
                    error: 'Личный чат с этим пользователем уже существует'
                });
            }

            // Создаем личный чат
            const chat = await db.query(
                'INSERT INTO chats (name, chat_type) VALUES ($1, $2) RETURNING *',
                [name || 'Личный чат', 'personal']
            );

            // Добавляем обоих пользователей
            await db.query(
                'INSERT INTO chat_members (chat_id, user_id, role) VALUES ($1, $2, $3), ($1, $4, $3)',
                [chat.rows[0].chat_id, userId, 'member', targetUserId]
            );

            return res.status(201).json({
                status: 0,
                data: chat.rows[0]
            });
        }

        // Для группового чата
        if (!name) {
            return res.status(400).json({
                status: 1,
                error: 'Необходимо указать название группового чата'
            });
        }

        // Создаем групповой чат
        const chat = await db.query(
            'INSERT INTO chats (name, chat_type) VALUES ($1, $2) RETURNING *',
            [name, 'group']
        );

        // Добавляем создателя как админа чата
        await db.query(
            'INSERT INTO chat_members (chat_id, user_id, role) VALUES ($1, $2, $3)',
            [chat.rows[0].chat_id, userId, 'admin']
        );

        res.status(201).json({
            status: 0,
            data: chat.rows[0]
        });
    } catch (error) {
        res.status(500).json({
            status: 1,
            error: 'Ошибка сервера: ' + error.message
        });
    }
};

// Получение информации о чате
const getChatById = async (req, res) => {
    try {
        const { chatId } = req.params;
        const chat = await db.query('SELECT * FROM chats WHERE chat_id = $1', [chatId]);
        
        if (chat.rows.length === 0) {
            return res.status(404).json({
                status: 1,
                error: 'Chat not found'
            });
        }

        res.json({
            status: 0,
            data: chat.rows[0]
        });
    } catch (error) {
        res.status(500).json({
            status: 1,
            error: 'Server error: ' + error.message
        });
    }
};

// Обновление информации о чате
const updateChat = async (req, res) => {
    try {
        const { chatId } = req.params;
        const { name } = req.body;
        const chat = await db.query('UPDATE chats SET name = $1 WHERE chat_id = $2 RETURNING *', [name, chatId]);
        
        if (chat.rows.length === 0) {
            return res.status(404).json({
                status: 1,
                error: 'Chat not found'
            });
        }

        res.json({
            status: 0,
            data: chat.rows[0]
        });
    } catch (error) {
        res.status(500).json({
            status: 1,
            error: 'Server error: ' + error.message
        });
    }
};

// Удаление чата
const deleteChat = async (req, res) => {
    try {
        const { chatId } = req.params;
        const result = await db.query('DELETE FROM chats WHERE chat_id = $1', [chatId]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({
                status: 1,
                error: 'Chat not found'
            });
        }

        res.json({
            status: 0,
            message: 'Chat deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            status: 1,
            error: 'Server error: ' + error.message
        });
    }
};

// Получение списка участников чата
const getChatMembers = async (req, res) => {
    try {
        const { chatId } = req.params;
        const members = await db.query('SELECT * FROM chat_members WHERE chat_id = $1', [chatId]);
        res.json({
            status: 0,
            data: members.rows
        });
    } catch (error) {
        res.status(500).json({
            status: 1,
            error: 'Server error: ' + error.message
        });
    }
};

// Добавление участника в чат   
const addChatMember = async (req, res) => {
    try {
        const { chatId } = req.params;
        const { userId } = req.body;
        const member = await db.query('INSERT INTO chat_members (chat_id, user_id) VALUES ($1, $2) RETURNING *', [chatId, userId]);
        res.status(201).json({
            status: 0,
            data: member.rows[0]
        });
    } catch (error) {
        res.status(500).json({
            status: 1,
            error: 'Server error: ' + error.message
        });
    }
};

// Удаление участника из чата
const removeChatMember = async (req, res) => {
    try {
        const { chatId, userId } = req.params;
        const result = await db.query('DELETE FROM chat_members WHERE chat_id = $1 AND user_id = $2', [chatId, userId]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({
                status: 1,
                error: 'Member not found'
            });
        }

        res.json({
            status: 0,
            message: 'Member removed successfully'
        });
    } catch (error) {
        res.status(500).json({
            status: 1,
            error: 'Server error: ' + error.message
        });
    }
};

// Получение сообщений чата
const getChatMessages = async (req, res) => {
    try {
        const { chatId } = req.params;
        const messages = await db.query('SELECT * FROM chat_messages WHERE chat_id = $1', [chatId]);
        res.json({
            status: 0,
            data: messages.rows
        });
    } catch (error) {
        res.status(500).json({
            status: 1,
            error: 'Server error: ' + error.message
        });
    }
};

// Отправка сообщения
const sendMessage = async (req, res) => {
    try {
        const { chatId } = req.params;
        const { content } = req.body;
        const userId = req.user.userId;
        const message = await db.query('INSERT INTO chat_messages (chat_id, sender_id, content) VALUES ($1, $2, $3) RETURNING *', [chatId, userId, content]);
        res.status(201).json({
            status: 0,
            data: message.rows[0]
        });
    } catch (error) {
        res.status(500).json({
            status: 1,
            error: 'Server error: ' + error.message
        });
    }
};

// Редактирование сообщения
const editMessage = async (req, res) => {
    try {
        const { chatId, messageId } = req.params;
        const { content } = req.body;
        const message = await db.query('UPDATE chat_messages SET content = $1 WHERE chat_id = $2 AND message_id = $3 RETURNING *', [content, chatId, messageId]);
        
        if (message.rows.length === 0) {
            return res.status(404).json({
                status: 1,
                error: 'Message not found'
            });
        }

        res.json({
            status: 0,
            data: message.rows[0]
        });
    } catch (error) {
        res.status(500).json({
            status: 1,
            error: 'Server error: ' + error.message
        });
    }
};

// Удаление сообщения
const deleteMessage = async (req, res) => {
    try {
        const { chatId, messageId } = req.params;
        const result = await db.query('DELETE FROM chat_messages WHERE chat_id = $1 AND message_id = $2', [chatId, messageId]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({
                status: 1,
                error: 'Message not found'
            });
        }

        res.json({
            status: 0,
            message: 'Message deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            status: 1,
            error: 'Server error: ' + error.message
        });
    }
};

module.exports = { 
    getMyChats
    , createChat
    , getChatById
    , updateChat
    , deleteChat
    , getChatMembers
    , addChatMember
    , removeChatMember
    , getChatMessages
    , sendMessage
    , editMessage
    , deleteMessage
}