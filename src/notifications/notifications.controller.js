const db = require('../database/db');

// Создание уведомления
const createNotification = async (req, res) => {
    try {
        const { userId, type, message } = req.body;

        // Проверка обязательных полей
        if (!userId || !type || !message) {
            return res.status(400).json({ error: 'Не хватает полей: userId, тип, или сообщение' });
        }

        // Проверяем, существует ли пользователь
        const userCheck = await db.query(
            `SELECT id FROM users WHERE id = $1`,
            [userId]
        );

        if (userCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        // Добавляем уведомление
        const result = await db.query(
            `INSERT INTO notifications (user_id, type, message) 
             VALUES ($1, $2, $3) RETURNING *`,
            [userId, type, message]
        );

        const notification = result.rows[0];

        // Отправляем уведомление через Socket.IO
        if (req.io) {
            req.io.to(`user:${userId}`).emit('notification:new', notification);
        }

        res.status(201).json({
            message: 'Уведомление успешно создано',
            notification,
        });
    } catch (error) {
        console.error('Ошибка создания уведомления:', error.message);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// Получить все уведомления
const getAllNotifications = async (req, res) => {
    const userId = req.user.userId;
    const result = await db.query(
        `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC`,
        [userId]
    );
    res.json(result.rows);
};

// Отметить уведомление как прочитанное
const markAsRead = async (req, res) => {
    const notificationId = req.params.id;
    await db.query(
        `UPDATE notifications SET is_read = TRUE WHERE id = $1`,
        [notificationId]
    );
    res.json({ message: 'Уведомление отмечено как «прочитано»' });
};

// Удалить уведомление
const deleteNotification = async (req, res) => {
    const notificationId = req.params.id;
    await db.query(
        `DELETE FROM notifications WHERE id = $1`,
        [notificationId]
    );
    res.json({ message: 'Уведомление удалено' });
};

module.exports = {
    createNotification
    , getAllNotifications
    , markAsRead
    , deleteNotification
};
