const db = require('../database/db');

class ChatService {
    async getMyChats(userId) {
        const chats = await db.query(`
            SELECT c.* 
            FROM chats c
            JOIN chat_members cm ON c.chat_id = cm.chat_id 
            WHERE cm.user_id = $1
        `, [userId]);
        return chats.rows;
    }

    async createChat(userId, { name, type, targetUserId }) {
        if (type === 'personal') {
            return await this.createPersonalChat(userId, targetUserId, name);
        }
        return await this.createGroupChat(userId, name);
    }

    async createPersonalChat(userId, targetUserId, name) {
        // Преобразуем оба значения в числа
        const parsedUserId = Number(userId);
        const parsedTargetUserId = Number(targetUserId);

        // Проверяем существование целевого пользователя
        const targetUser = await db.query('SELECT * FROM users WHERE user_id = $1', [parsedTargetUserId]);
        if (targetUser.rows.length === 0) {
            throw new Error('Указанный пользователь не существует');
        }

        if (parsedUserId === parsedTargetUserId) {
            throw new Error('Нельзя создать личный чат с самим собой');
        }

        // Проверяем существование чата
        const existingChat = await db.query(`
            SELECT DISTINCT c.* FROM chats c
            JOIN chat_members cm1 ON c.chat_id = cm1.chat_id
            JOIN chat_members cm2 ON c.chat_id = cm2.chat_id
            WHERE c.chat_type = 'personal'
            AND ((cm1.user_id = $1 AND cm2.user_id = $2)
            OR (cm1.user_id = $2 AND cm2.user_id = $1))
        `, [parsedUserId, parsedTargetUserId]);

        if (existingChat.rows.length > 0) {
            throw new Error('Личный чат с этим пользователем уже существует');
        }

        const chat = await db.query(
            'INSERT INTO chats (name, chat_type) VALUES ($1, $2) RETURNING *',
            [name || 'Личный чат', 'personal']
        );

        await db.query(
            'INSERT INTO chat_members (chat_id, user_id, role) VALUES ($1, $2, $3), ($1, $4, $3)',
            [chat.rows[0].chat_id, parsedUserId, 'member', parsedTargetUserId]
        );

        return chat.rows[0];
    }

    async createGroupChat(userId, name) {
        if (!name) {
            throw new Error('Необходимо указать название группового чата');
        }

        const chat = await db.query(
            'INSERT INTO chats (name, chat_type) VALUES ($1, $2) RETURNING *',
            [name, 'group']
        );

        await db.query(
            'INSERT INTO chat_members (chat_id, user_id, role) VALUES ($1, $2, $3)',
            [chat.rows[0].chat_id, userId, 'admin']
        );

        return chat.rows[0];
    }

    async getChatById(chatId) {
        const chat = await db.query('SELECT * FROM chats WHERE chat_id = $1', [chatId]);
        
        if (chat.rows.length === 0) {
            throw new Error('Chat not found');
        }

        return chat.rows[0];
    }

    async updateChat(chatId, { name }) {
        const chat = await db.query(
            'UPDATE chats SET name = $1 WHERE chat_id = $2 RETURNING *',
            [name, chatId]
        );
        
        if (chat.rows.length === 0) {
            throw new Error('Chat not found');
        }

        return chat.rows[0];
    }

    async deleteChat(chatId) {
        const result = await db.query('DELETE FROM chats WHERE chat_id = $1', [chatId]);
        
        if (result.rowCount === 0) {
            throw new Error('Chat not found');
        }

        return true;
    }

    async getChatMembers(chatId) {
        const members = await db.query('SELECT * FROM chat_members WHERE chat_id = $1', [chatId]);
        return members.rows;
    }

    async addChatMember(chatId, userId) {
        const member = await db.query(
            'INSERT INTO chat_members (chat_id, user_id) VALUES ($1, $2) RETURNING *',
            [chatId, userId]
        );
        return member.rows[0];
    }

    async removeChatMember(chatId, userId) {
        const result = await db.query(
            'DELETE FROM chat_members WHERE chat_id = $1 AND user_id = $2',
            [chatId, userId]
        );
        
        if (result.rowCount === 0) {
            throw new Error('Member not found');
        }

        return true;
    }

    async getChatMessages(chatId) {
        const messages = await db.query('SELECT * FROM chat_messages WHERE chat_id = $1', [chatId]);
        return messages.rows;
    }

    async sendMessage(chatId, userId, { content }) {
        const message = await db.query(
            'INSERT INTO chat_messages (chat_id, sender_id, content) VALUES ($1, $2, $3) RETURNING *',
            [chatId, userId, content]
        );
        return message.rows[0];
    }

    async editMessage(chatId, messageId, { content }) {
        const message = await db.query(
            'UPDATE chat_messages SET content = $1 WHERE chat_id = $2 AND message_id = $3 RETURNING *',
            [content, chatId, messageId]
        );
        
        if (message.rows.length === 0) {
            throw new Error('Message not found');
        }

        return message.rows[0];
    }

    async deleteMessage(chatId, messageId) {
        const result = await db.query(
            'DELETE FROM chat_messages WHERE chat_id = $1 AND message_id = $2',
            [chatId, messageId]
        );
        
        if (result.rowCount === 0) {
            throw new Error('Message not found');
        }

        return true;
    }
}

module.exports = new ChatService();
