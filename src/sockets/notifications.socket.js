const db = require('../database/db'); // Утилита работы с БД

module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log(`Уведомления: Пользователь подключен: ${socket.user.userId}`);

        // Отправка уведомлений в реальном времени
        socket.on('notification:send', async (data) => {
            const { userId, type, message } = data;

            // Сохраняем уведомление в базе
            await db.query(
                `INSERT INTO notifications (user_id, type, message) VALUES ($1, $2, $3)`,
                [userId, type, message]
            );

            // Отправляем уведомление пользователю
            io.to(`user:${userId}`).emit('notification:new', {
                type,
                message,
                created_at: new Date().toISOString(),
            });
        });

        // Обработка дополнительных событий уведомлений (если нужно)
        socket.on('notification:read', async (notificationId) => {
            await db.query(
                `UPDATE notifications SET is_read = TRUE WHERE id = $1`,
                [notificationId]
            );
            console.log(`Уведомление ${notificationId} отмечено как прочитанное`);
        });
    });
};
