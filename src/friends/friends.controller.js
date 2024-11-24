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
            return res.status(400).json({ error: 'Требуется ID друга' });
        }

        // Проверка: пользователь не может добавить сам себя
        if (userId === friendId) {
            return res.status(400).json({ error: 'Пользователь не может добавить в друзья сам себя' });
        }

        // Проверяем, существует ли пользователь
        const userCheck = await db.query(`SELECT id FROM users WHERE id = $1`, [friendId]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        // Проверяем, не существует ли уже такой запрос
        const existingRequest = await db.query(`
            SELECT * FROM friends 
            WHERE (user_id = $1 AND friend_id = $2) 
               OR (user_id = $2 AND friend_id = $1)
        `, [userId, friendId]);

        if (existingRequest.rows.length > 0) {
            return res.status(400).json({ error: 'Запрос существует или пользователи уже являются друзьями' });
        }

        // Создаём запрос на дружбу
        await db.query(`
            INSERT INTO friends (user_id, friend_id, status) 
            VALUES ($1, $2, 'pending')
        `, [userId, friendId]);

        // Уведомляем через WebSocket
        if (req.io) {
            const friendRoom = `user:${friendId}`;
            req.io.to(friendRoom).emit('friend:update', {
                type: 'friend_request',
                userId: userId,
                message: `User ${userId} отправил вам запрос в друзья.`,
            });
        }

        res.status(201).json({ message: 'Friend request sent successfully' });
    } catch (error) {
        console.error('Ошибка отправки запроса дружбы:', error.message);
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

        // Уведомление через Socket.IO
        if (req.io && action === 'accept') {
            const senderId = request.rows[0].user_id;
            const recipientRoom = `user:${senderId}`;

            req.io.to(recipientRoom).emit('friend:update', {
                type: 'friend_request_response',
                message: `User ${userId} accepted your friend request.`,
            });

            req.io.to(`user:${userId}`).emit('friend:update', {
                type: 'friend_request_response',
                message: `Friend request from user ${senderId} has been accepted.`,
            });
        }

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

        // Уведомляем через WebSocket
        if (req.io) {
            const friendRoom = `user:${friendId}`;
            req.io.to(friendRoom).emit('friend:update', {
                type: 'friend_remove',
                message: `User ${userId} removed you as a friend.`,
            });

            req.io.to(`user:${userId}`).emit('friend:update', {
                type: 'friend_remove',
                message: `You removed user ${friendId} as a friend.`,
            });
        }

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