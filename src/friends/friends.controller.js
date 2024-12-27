const db = require('../database/db');

// Функция получения списка друзей пользователя
const myFriendList = async (req, res) => {
    try {
        const userId = req.user.userId;

        const result = await db.query(`
            SELECT 
                CASE 
                    WHEN f.user_first = $1 THEN f.user_second 
                    ELSE f.user_first 
                END AS friend_id, 
                u.user_name, 
                u.display_name, 
                f.status 
            FROM friends f
            JOIN users u 
                ON u.user_id = CASE 
                                WHEN f.user_first = $1 THEN f.user_second 
                                ELSE f.user_first 
                          END
            WHERE f.user_first = $1 OR f.user_second = $1
        `, [userId]);

        res.json({
            status: 0,
            message: 'Friend list retrieved successfully',
            friends: result.rows,
        });
    } catch (error) {
        console.error('Error fetching friend list:', error.message);
        res.status(500).json({
            status: 1,
            error: 'Server error' });
    }
};

// Функция добавления в друзья
const addFriend = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { friendId } = req.body;
        const io = req.io; // Получаем экземпляр io из запроса

        if (!friendId) {
            return res.status(400).json({ 
            status: 1,
            error: 'Friend ID is required' });
        }

        // Проверка: пользователь не может добавить сам себя
        if (userId == friendId) {
            return res.status(400).json({ 
            status: 1,
            error: 'User cannot add himself to friends' });
        }

        // Проверяем, существует ли указанный пользователь
        const userCheck = await db.query(`SELECT user_id FROM users WHERE user_id = $1`, [friendId]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ 
            status: 1,
            error: 'User not found' });
        }

        // Проверяем, не существует ли уже такой запрос
        const existingRequest = await db.query(`
            SELECT * FROM friends 
            WHERE (user_first = $1 AND user_second = $2) 
               OR (user_first = $2 AND user_second = $1)
        `, [userId, friendId]);

        if (existingRequest.rows.length > 0) {
            return res.status(400).json({ 
                status: 1,
                error: 'Request already exists or users are already friends'
            });
        }

        // Создаём запрос на дружбу
        await db.query(`
            INSERT INTO friends (user_first, user_second, status) 
            VALUES ($1, $2, 'pending')
        `, [userId, friendId]);

        // Уведомление пользователя о новом запросе
        io.to(`user:${friendId}`).emit('friends:newRequest', {
            from: userId,
            message: 'New friend request',
        });

        res.status(201).json({ 
            status: 0,
            message: 'Friend request sent successfully'
        });
    } catch (error) {
        console.error('Error sending friend request:', error.message);
        res.status(500).json({ 
            status: 1,
            error: 'Server error'
        });
    }
};

// Функция ответа на запрос
const ansRequest = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { friendshipId } = req.params;
        const { action } = req.body;
        const io = req.io; // Получаем экземпляр io из запроса

        if (!action || !['accept', 'decline'].includes(action)) {
            return res.status(400).json({ 
                status: 1,
                error: 'Invalid action. Use "accept" or "decline"'
            });
        }

        // Проверяем, существует ли запрос
        const request = await db.query(`
            SELECT * FROM friends 
            WHERE friendship_id = $1 AND user_second = $2 AND status = 'pending'
        `, [friendshipId, userId]);

        if (request.rows.length === 0) {
            return res.status(404).json({ 
                status: 1,
                error: 'Friend request not found'
            });
        }

        // Обновляем статус запроса
        const newStatus = action === 'accept' ? 'accepted' : 'declined';
        await db.query(`
            UPDATE friends 
            SET status = $1 
            WHERE friendship_id = $2
        `, [newStatus, friendshipId]);

        const { user_first } = request.rows[0];

        // Получаем информацию о пользователе
        const userInfo = await db.query(`
            SELECT user_name, display_name 
            FROM users 
            WHERE user_id = $1
        `, [userId]);

        if (userInfo.rows.length === 0) {
            return res.status(404).json({ 
                status: 1,
                error: 'User not found'
            });
        }

        const { user_name, display_name } = userInfo.rows[0];

        // Уведомление об ответе
        io.to(`user:${user_first}`).emit('friends:requestResponded', {
            friendshipId,
            status: newStatus,
            message: 'Friend request responded',
            user: { user_id: userId, user_name, display_name }, // Добавляем информацию о пользователе
            });

        res.json({ 
            status: 0,
            message: `Friend request ${newStatus}`
        });
    } catch (error) {
        console.error('Error responding to friend request:', error.message);
        res.status(500).json({ 
            status: 1,
            error: 'Server error'
        });
    }
};

// Функция удаления друга
const deleteFriend = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { friendId } = req.params;
        const io = req.io; // Получаем экземпляр io из запроса

        // Удаляем запись о дружбе
        await db.query(`
            DELETE FROM friends 
            WHERE (user_first = $1 AND user_second = $2) 
               OR (user_first = $2 AND user_second = $1)
        `, [userId, friendId]);

        // Уведомление об удалении
        io.to(`user:${friendId}`).emit('friends:removed', {
            by: userId,
            message: 'You have been removed from friends',
        });

        res.json({ 
            status: 0,
            message: 'Friend removed successfully' 
        });
    } catch (error) {
        console.error('Error removing friend:', error.message);
        res.status(500).json({ 
            status: 1,
            error: 'Server error'
        });
    }
};

// Функция получения списка друзей другого пользователя
const userFriendList = async (req, res) => {
    try {
        const { userId } = req.params;

        const result = await db.query(`
            SELECT 
                CASE 
                    WHEN f.user_first = $1 THEN f.user_second 
                    ELSE f.user_first 
                END AS friend_id, 
                u.user_name, 
                u.display_name 
            FROM friends f
            JOIN users u 
                ON u.user_id = CASE 
                                WHEN f.user_first = $1 THEN f.user_second 
                                ELSE f.user_first 
                          END
            WHERE (f.user_first = $1 OR f.user_second = $1) AND f.status = 'accepted'
        `, [userId]);

        res.json({
            status: 0,
            message: 'Friend list retrieved successfully',
            friends: result.rows,
        });
    } catch (error) {
        console.error('Error fetching user friend list:', error.message);
        res.status(500).json({ 
            status: 1,
            error: 'Server error'
        });
    }
};

module.exports = { 
    myFriendList
    , addFriend
    , ansRequest
    , deleteFriend
    , userFriendList
}