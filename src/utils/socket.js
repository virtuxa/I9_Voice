const { pool } = require('../utils/db.init'); // Подключаем базу данных

const setupWebSocket = (server) => {
    const { Server } = require('socket.io');
    const io = new Server(server, { cors: { origin: '*' } });

    io.on('connection', (socket) => {
        console.log('Пользователь подключился:', socket.id);

        // Пользователь присоединяется к чату
        socket.on('join', ({ chatId, userId }) => {
            socket.join(chatId);
            console.log(`Пользователь ${userId} присоединился к чату ${chatId}`);
            io.to(chatId).emit('userJoined', { userId, chatId });
        });

        // Отправка сообщения
        socket.on('sendMessage', async ({ chatId, senderId, content }) => {
            try {
                const result = await pool.query(
                    `INSERT INTO messages (chat_id, sender_id, content) 
                     VALUES ($1, $2, $3) RETURNING *`,
                    [chatId, senderId, content]
                );

                const newMessage = result.rows[0];
                io.to(chatId).emit('newMessage', newMessage);
            } catch (error) {
                console.error('Ошибка при отправке сообщения:', error.message);
                socket.emit('error', { message: 'Ошибка при отправке сообщения.' });
            }
        });

        // Редактирование сообщения
        socket.on('editMessage', async ({ messageId, content, userId }) => {
            try {
                const message = await pool.query('SELECT * FROM messages WHERE id = $1', [messageId]);

                if (message.rows.length === 0 || message.rows[0].sender_id !== userId) {
                    return socket.emit('error', { message: 'Нет прав на редактирование.' });
                }

                const updatedMessage = await pool.query(
                    'UPDATE messages SET content = $1 WHERE id = $2 RETURNING *',
                    [content, messageId]
                );

                io.to(message.rows[0].chat_id).emit('messageUpdated', updatedMessage.rows[0]);
            } catch (error) {
                console.error('Ошибка при редактировании сообщения:', error.message);
                socket.emit('error', { message: 'Ошибка при редактировании сообщения.' });
            }
        });

        // Удаление сообщения
        socket.on('deleteMessage', async ({ messageId, userId }) => {
            try {
                const message = await pool.query('SELECT * FROM messages WHERE id = $1', [messageId]);

                if (message.rows.length === 0) {
                    return socket.emit('error', { message: 'Сообщение не найдено.' });
                }

                const chatId = message.rows[0].chat_id;
                await pool.query('DELETE FROM messages WHERE id = $1', [messageId]);

                io.to(chatId).emit('messageDeleted', { messageId });
            } catch (error) {
                console.error('Ошибка при удалении сообщения:', error.message);
                socket.emit('error', { message: 'Ошибка при удалении сообщения.' });
            }
        });

        // Отключение
        socket.on('disconnect', () => {
            console.log('Пользователь отключился:', socket.id);
        });
    });

    return io;
};

module.exports = { setupWebSocket };
