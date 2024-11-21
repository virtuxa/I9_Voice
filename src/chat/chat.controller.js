const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../utils/db.init.js');


// Создание чата
const createChat = async (req, res) => {
    try {
        const { type, name, members } = req.body;
        const userId = req.user.id;

        if (!type || (type !== 'private' && type !== 'group')) {
            return res.status(400).json({ message: 'Некорректный тип чата.' });
        }

        // Для личных чатов проверяем, что есть только 1 участник
        if (type === 'private' && (!members || members.length !== 1)) {
            return res.status(400).json({ message: 'Личный чат должен иметь ровно одного участника.' });
        }

        // Создаем чат
        const chatResult = await pool.query(
            'INSERT INTO chats (name, type) VALUES ($1, $2) RETURNING id',
            [type === 'group' ? name || 'Новый чат' : null, type]
        );
        const chatId = chatResult.rows[0].id;

        // Добавляем создателя в чат
        await pool.query(
            'INSERT INTO chat_members (chat_id, user_id, role) VALUES ($1, $2, $3)',
            [chatId, userId, 'admin']
        );

        // Добавляем участников
        if (members && members.length > 0) {
            const values = members.map(
                (memberId) => `(${chatId}, ${memberId}, 'member')`
            ).join(',');
            await pool.query(
                `INSERT INTO chat_members (chat_id, user_id, role) VALUES ${values}`
            );
        }

        res.status(201).json({ message: 'Чат создан', chatId });
    } catch (error) {
        console.error('Ошибка при создании чата:', error.message);
        res.status(500).json({ message: 'Ошибка сервера.' });
    }
};

// Добавление участника
const addMember = async (req, res) => {
    try {
        const { chatId, userId } = req.body;

        // Проверяем, является ли чат групповым
        const chat = await pool.query(
            'SELECT * FROM chats WHERE id = $1 AND type = $2',
            [chatId, 'group']
        );
        if (chat.rows.length === 0) {
            return res.status(400).json({ message: 'Только групповые чаты поддерживают добавление участников.' });
        }

        // Проверяем, не является ли пользователь уже участником
        const memberExists = await pool.query(
            'SELECT * FROM chat_members WHERE chat_id = $1 AND user_id = $2',
            [chatId, userId]
        );
        if (memberExists.rows.length > 0) {
            return res.status(400).json({ message: 'Пользователь уже является участником чата.' });
        }

        // Добавляем пользователя
        await pool.query(
            'INSERT INTO chat_members (chat_id, user_id, role) VALUES ($1, $2, $3)',
            [chatId, userId, 'member']
        );

        res.status(200).json({ message: 'Пользователь добавлен в чат.' });
    } catch (error) {
        console.error('Ошибка при добавлении участника:', error.message);
        res.status(500).json({ message: 'Ошибка сервера.' });
    }
};

// Отправка сообщений
const sendMessage = async (req, res) => {
    try {
        const { chatId, content } = req.body;
        const senderId = req.user.id;

        if (!content) {
            return res.status(400).json({ message: 'Сообщение не может быть пустым.' });
        }

        // Проверяем, является ли пользователь участником чата
        const isMember = await pool.query(
            'SELECT * FROM chat_members WHERE chat_id = $1 AND user_id = $2',
            [chatId, senderId]
        );
        if (isMember.rows.length === 0) {
            return res.status(403).json({ message: 'Вы не являетесь участником этого чата.' });
        }

        // Сохраняем сообщение
        const messageResult = await pool.query(
            'INSERT INTO messages (chat_id, sender_id, content) VALUES ($1, $2, $3) RETURNING *',
            [chatId, senderId, content]
        );

        res.status(201).json({ message: 'Сообщение отправлено.', data: messageResult.rows[0] });
    } catch (error) {
        console.error('Ошибка при отправке сообщения:', error.message);
        res.status(500).json({ message: 'Ошибка сервера.' });
    }
};

// Получение сообщений
const getMessages = async (req, res) => {
    try {
        const { chatId } = req.params;
        const userId = req.user.id;

        // Проверяем, является ли пользователь участником чата
        const isMember = await pool.query(
            'SELECT * FROM chat_members WHERE chat_id = $1 AND user_id = $2',
            [chatId, userId]
        );
        if (isMember.rows.length === 0) {
            return res.status(403).json({ message: 'Вы не являетесь участником этого чата.' });
        }

        // Получаем сообщения
        const messages = await pool.query(
            'SELECT * FROM messages WHERE chat_id = $1 ORDER BY created_at ASC',
            [chatId]
        );

        res.status(200).json(messages.rows);
    } catch (error) {
        console.error('Ошибка при получении сообщений:', error.message);
        res.status(500).json({ message: 'Ошибка сервера.' });
    }
};

// Удаление чатов
const deleteChat = async (req, res) => {
    try {
        const { chatId } = req.params;
        const userId = req.user.id;

        // Проверяем, существует ли чат
        const chat = await pool.query('SELECT * FROM chats WHERE id = $1', [chatId]);
        if (chat.rows.length === 0) {
            return res.status(404).json({ message: 'Чат не найден.' });
        }

        // Проверяем, является ли пользователь администратором чата
        const isAdmin = await pool.query(
            'SELECT * FROM chat_members WHERE chat_id = $1 AND user_id = $2 AND role = $3',
            [chatId, userId, 'admin']
        );
        if (isAdmin.rows.length === 0) {
            return res.status(403).json({ message: 'Только администратор может удалить чат.' });
        }

        // Удаляем чат
        await pool.query('DELETE FROM chats WHERE id = $1', [chatId]);

        res.status(200).json({ message: 'Чат успешно удалён.' });
    } catch (error) {
        console.error('Ошибка при удалении чата:', error.message);
        res.status(500).json({ message: 'Ошибка сервера.' });
    }
};

// Редактирование сообщений
const editMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { content } = req.body;
        const userId = req.user.id;

        if (!content) {
            return res.status(400).json({ message: 'Сообщение не может быть пустым.' });
        }

        // Проверяем, существует ли сообщение
        const message = await pool.query('SELECT * FROM messages WHERE id = $1', [messageId]);
        if (message.rows.length === 0) {
            return res.status(404).json({ message: 'Сообщение не найдено.' });
        }

        // Проверяем, является ли пользователь отправителем сообщения
        if (message.rows[0].sender_id !== userId) {
            return res.status(403).json({ message: 'Вы можете редактировать только свои сообщения.' });
        }

        // Обновляем содержание сообщения
        const updatedMessage = await pool.query(
            'UPDATE messages SET content = $1 WHERE id = $2 RETURNING *',
            [content, messageId]
        );

        res.status(200).json({ message: 'Сообщение успешно отредактировано.', data: updatedMessage.rows[0] });
    } catch (error) {
        console.error('Ошибка при редактировании сообщения:', error.message);
        res.status(500).json({ message: 'Ошибка сервера.' });
    }
};

// Удаление сообщений
const deleteMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user.id;

        // Проверяем, существует ли сообщение
        const message = await pool.query('SELECT * FROM messages WHERE id = $1', [messageId]);
        if (message.rows.length === 0) {
            return res.status(404).json({ message: 'Сообщение не найдено.' });
        }

        // Проверяем, является ли пользователь отправителем или администратором
        const chatId = message.rows[0].chat_id;
        const isAdmin = await pool.query(
            'SELECT * FROM chat_members WHERE chat_id = $1 AND user_id = $2 AND role = $3',
            [chatId, userId, 'admin']
        );

        if (message.rows[0].sender_id !== userId && isAdmin.rows.length === 0) {
            return res.status(403).json({ message: 'Вы можете удалить только свои сообщения или если вы администратор.' });
        }

        // Удаляем сообщение
        await pool.query('DELETE FROM messages WHERE id = $1', [messageId]);

        res.status(200).json({ message: 'Сообщение успешно удалено.' });
    } catch (error) {
        console.error('Ошибка при удалении сообщения:', error.message);
        res.status(500).json({ message: 'Ошибка сервера.' });
    }
};


module.exports = { 
    createChat
    , addMember
    , sendMessage
    , getMessages
    , deleteChat
    , editMessage
    , deleteMessage
}