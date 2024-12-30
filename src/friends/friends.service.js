const db = require('../database/db');

class FriendService {
    async getMyFriends(userId) {
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
        
        return result.rows;
    }

    async addFriend(userId, friendId) {
        if (!friendId) {
            throw new Error('Friend ID is required');
        }

        if (userId == friendId) {
            throw new Error('User cannot add himself to friends');
        }

        // Проверяем, существует ли указанный пользователь
        const userCheck = await db.query(`SELECT user_id FROM users WHERE user_id = $1`, [friendId]);
        if (userCheck.rows.length === 0) {
            throw new Error('User not found');
        }

        // Проверяем, не существует ли уже такой запрос
        const existingRequest = await db.query(`
            SELECT * FROM friends 
            WHERE (user_first = $1 AND user_second = $2) 
               OR (user_first = $2 AND user_second = $1)
        `, [userId, friendId]);

        if (existingRequest.rows.length > 0) {
            throw new Error('Request already exists or users are already friends');
        }

        // Создаём запрос на дружбу
        const result = await db.query(`
            INSERT INTO friends (user_first, user_second, status) 
            VALUES ($1, $2, 'pending')
            RETURNING *
        `, [userId, friendId]);

        return result.rows[0];
    }

    async answerRequest(friendshipId, userId, action) {
        if (!action || !['accept', 'decline'].includes(action)) {
            throw new Error('Invalid action. Use "accept" or "decline"');
        }

        // Проверяем, существует ли запрос
        const request = await db.query(`
            SELECT * FROM friends 
            WHERE friendship_id = $1 AND user_second = $2 AND status = 'pending'
        `, [friendshipId, userId]);

        if (request.rows.length === 0) {
            throw new Error('Friend request not found');
        }

        // Обновляем статус запроса
        const newStatus = action === 'accept' ? 'accepted' : 'declined';
        const result = await db.query(`
            UPDATE friends 
            SET status = $1 
            WHERE friendship_id = $2
            RETURNING *
        `, [newStatus, friendshipId]);

        return {
            updatedRequest: result.rows[0],
            originalRequest: request.rows[0]
        };
    }

    async deleteFriend(userId, friendId) {
        const result = await db.query(`
            DELETE FROM friends 
            WHERE (user_first = $1 AND user_second = $2) 
               OR (user_first = $2 AND user_second = $1)
            RETURNING *
        `, [userId, friendId]);

        if (result.rows.length === 0) {
            throw new Error('Friendship not found');
        }

        return result.rows[0];
    }

    async getUserFriends(userId) {
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

        return result.rows;
    }
}

module.exports = new FriendService();
