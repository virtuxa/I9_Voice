const db = require('../database/db'); // Утилита работы с БД

module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log(`notification.socket: Пользователь подключён: ${socket.user.userId}`);

        // Отправка уведомлений
        socket.on('notification:send', async (data) => {
            const { userId, type, message } = data;

            // Сохраняем уведомление в базе
        const result = await db.query(`
            INSERT INTO notifications (user_id, type, message) 
            VALUES ($1, $2, $3) RETURNING *`,
                [userId, type, message]
            );

            const notification = result.rows[0];

            // Отправляем уведомление пользователю
            io.to(`user:${userId}`).emit('notification:new', notification);
        console.log(`Уведомление отправлено пользователю ${userId}:`, notification);
        });

        // Обработка отметки уведомления как прочитанного
        socket.on('notification:read', async (notificationId) => {
        await db.query(`
            UPDATE notifications SET is_read = TRUE WHERE id = $1`,
                [notificationId]
            );
            console.log(`Уведомление ${notificationId} отмечено как прочитанное`);
        });
    });
};
