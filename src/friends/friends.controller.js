const db = require('../database/db');

// Функция получения списка друзей пользователя
const myFriendList = async (req, res) => {
    try {
        const userId = req.user.userId;

        const result = await db.query(`
            SELECT 
                CASE 
                    WHEN f.user_id = $1 THEN f.friend_id 
                    ELSE f.user_id 
                END AS id, 
                u.username, 
                u.display_name, 
                f.status 
            FROM friends f
            JOIN users u 
                ON u.id = CASE 
                            WHEN f.user_id = $1 THEN f.friend_id 
                            ELSE f.user_id 
                          END
            WHERE f.user_id = $1 OR f.friend_id = $1
        `, [userId]);

        res.json({
            message: 'Friend list retrieved successfully',
            friends: result.rows,
        });
    } catch (error) {
        console.error('Error fetching friend list:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Функция добавления в друзья
const addFriend = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { friendId } = req.body;

        if (!friendId) {
            return res.status(400).json({ error: 'Friend ID is required' });
        }

        // Проверка: пользователь не может добавить сам себя
        if (userId === friendId) {
            return res.status(400).json({ error: 'Пользователь не может добавить в друзья сам себя' });
        }

        // Проверяем, существует ли пользователь
        const userCheck = await db.query(`SELECT id FROM users WHERE id = $1`, [friendId]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Проверяем, не существует ли уже такой запрос
        const existingRequest = await db.query(`
            SELECT * FROM friends 
            WHERE (user_id = $1 AND friend_id = $2) 
               OR (user_id = $2 AND friend_id = $1)
        `, [userId, friendId]);

        if (existingRequest.rows.length > 0) {
            return res.status(400).json({ error: 'Friend request already exists or user is already a friend' });
        }

        // Создаём запрос на дружбу
        await db.query(`
            INSERT INTO friends (user_id, friend_id, status) 
            VALUES ($1, $2, 'pending')
        `, [userId, friendId]);

        // Отправка уведомления (если WebSocket доступен)
        const notification = {
            userId: friendId, // Кому отправляется уведомление
            type: 'friend_request', // Тип уведомления
            message: `User ${userId} has sent you a friend request.`,
        };

        if (req.io) {
            req.io.to(`user:${friendId}`).emit('notification:new', notification);
        }

        // Записываем уведомление в базу данных
        await db.query(`
            INSERT INTO notifications (user_id, type, message) 
            VALUES ($1, $2, $3)
        `, [friendId, notification.type, notification.message]);

        res.status(201).json({ message: 'Friend request sent successfully' });
    } catch (error) {
        console.error('Error sending friend request:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Функция ответа на запрос
const ansRequest = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { requestId } = req.params;
        const { action } = req.body; // action: "accept" or "decline"

        if (!action || !['accept', 'decline'].includes(action)) {
            return res.status(400).json({ error: 'Invalid action. Use "accept" or "decline"' });
        }

        // Проверяем, существует ли запрос
        const request = await db.query(`
            SELECT * FROM friends 
            WHERE id = $1 AND friend_id = $2 AND status = 'pending'
        `, [requestId, userId]);

        if (request.rows.length === 0) {
            return res.status(404).json({ error: 'Friend request not found' });
        }

        // Обновляем статус запроса
        const newStatus = action === 'accept' ? 'accepted' : 'declined';
        await db.query(`
            UPDATE friends 
            SET status = $1 
            WHERE id = $2
        `, [newStatus, requestId]);

        res.json({ message: `Friend request ${newStatus}` });
    } catch (error) {
        console.error('Error responding to friend request:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Функция удаления друга
const deleteFriend = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { userId: friendId } = req.params;

        // Удаляем связь между пользователями
        await db.query(`
            DELETE FROM friends 
            WHERE (user_id = $1 AND friend_id = $2) 
               OR (user_id = $2 AND friend_id = $1)
        `, [userId, friendId]);

        res.json({ message: 'Friend removed successfully' });
    } catch (error) {
        console.error('Error removing friend:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Функция получения списка друзей другого пользователя
const userFriendList = async (req, res) => {
    try {
        const { userId } = req.params;

        const result = await db.query(`
            SELECT 
                CASE 
                    WHEN f.user_id = $1 THEN f.friend_id 
                    ELSE f.user_id 
                END AS id, 
                u.username, 
                u.display_name 
            FROM friends f
            JOIN users u 
                ON u.id = CASE 
                            WHEN f.user_id = $1 THEN f.friend_id 
                            ELSE f.user_id 
                          END
            WHERE (f.user_id = $1 OR f.friend_id = $1) AND f.status = 'accepted'
        `, [userId]);

        res.json({
            message: 'Friend list retrieved successfully',
            friends: result.rows,
        });
    } catch (error) {
        console.error('Error fetching user friend list:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { 
    myFriendList
    , addFriend
    , ansRequest
    , deleteFriend
    , userFriendList
}