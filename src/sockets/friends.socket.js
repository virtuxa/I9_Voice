const db = require('../database/db');

const configureFriendsSocket = (io) => {
    io.on('connection', (socket) => {
        const userId = socket.user.userId;

        console.log(`socket.friend connected: ${userId}`);

        // Запрос списка друзей
        socket.on('friends:getList', async (_, callback) => {
            try {
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

                callback({ success: true, friends: result.rows });
            } catch (error) {
                console.error('Error fetching friend list:', error.message);
                callback({ success: false, error: 'Error fetching friend list' });
            }
        });

        // Отправка запроса на добавление друга
        socket.on('friends:add', async ({ friendId }, callback) => {
            try {
                if (!friendId) return callback({ success: false, error: 'Friend ID is required' });

                if (userId === friendId) {
                    return callback({ success: false, error: 'Cannot add yourself as a friend' });
                }

                const userCheck = await db.query(`SELECT user_id FROM users WHERE user_id = $1`, [friendId]);
                if (userCheck.rows.length === 0) {
                    return callback({ success: false, error: 'User not found' });
                }

                const existingRequest = await db.query(`
                    SELECT * FROM friends 
                    WHERE (user_first = $1 AND user_second = $2) 
                       OR (user_first = $2 AND user_second = $1)
                `, [userId, friendId]);

                if (existingRequest.rows.length > 0) {
                    return callback({ success: false, error: 'Friend request already exists or users are already friends' });
                }

                await db.query(`
                    INSERT INTO friends (user_first, user_second, status) 
                    VALUES ($1, $2, 'pending')
                `, [userId, friendId]);

                // Уведомляем пользователя о новом запросе
                io.to(`user:${friendId}`).emit('friends:newRequest', { 
                    from: userId,
                    message: 'New friend request'
                });

                callback({ success: true, message: 'Friend request sent successfully' });
            } catch (error) {
                console.error('Error adding friend:', error.message);
                callback({ success: false, error: 'Error adding friend' });
            }
        });

        // Ответ на запрос дружбы
        socket.on('friends:respondRequest', async ({ friendshipId, action }, callback) => {
            try {
                if (!action || !['accept', 'decline'].includes(action)) {
                    return callback({ success: false, error: 'Invalid action. Use "accept" or "decline"' });
                }

                const request = await db.query(`
                    SELECT * FROM friends 
                    WHERE friendship_id = $1 AND user_second = $2 AND status = 'pending'
                `, [friendshipId, userId]);

                if (request.rows.length === 0) {
                    return callback({ success: false, error: 'Friend request not found' });
                }

                const newStatus = action === 'accept' ? 'accepted' : 'declined';
                await db.query(`
                    UPDATE friends 
                    SET status = $1 
                    WHERE friendship_id = $2
                `, [newStatus, friendshipId]);

                const { user_first } = request.rows[0];

                // Уведомляем инициатора запроса
                io.to(`user:${user_first}`).emit('friends:requestResponded', {
                    friendshipId,
                    status: newStatus,
                    message: 'Friend request responded'
                });

                // Уведомляем принимающего
                io.to(`user:${userId}`).emit('friends:statusUpdated', {
                    friendshipId,
                    status: newStatus,
                    message: 'Friend request responded'
                });

                callback({ success: true, message: `Friend request ${newStatus}` });
            } catch (error) {
                console.error('Error responding to friend request:', error.message);
                callback({ success: false, error: 'Error responding to friend request' });
            }
        });

        // Удаление друга
        socket.on('friends:remove', async ({ friendId }, callback) => {
            try {
                await db.query(`
                    DELETE FROM friends 
                    WHERE (user_first = $1 AND user_second = $2) 
                       OR (user_first = $2 AND user_second = $1)
                `, [userId, friendId]);

                io.to(`user:${friendId}`).emit('friends:removed', { 
                    by: userId,
                    message: 'You have been removed from friends'
                });

                callback({ success: true, message: 'Friend removed successfully' });
            } catch (error) {
                console.error('Error removing friend:', error.message);
                callback({ success: false, error: 'Error removing friend' });
            }
        });

        // Получение списка друзей другого пользователя
        socket.on('friends:getUserList', async ({ targetUserId }, callback) => {
            try {
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
                `, [targetUserId]);

                callback({ success: true, friends: result.rows });
            } catch (error) {
                console.error('Error fetching user friend list:', error.message);
                callback({ success: false, error: 'Error fetching user friend list' });
            }
        });
    });
};

module.exports = configureFriendsSocket;
