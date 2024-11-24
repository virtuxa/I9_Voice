// friends.socket.js
const db = require('../database/db');

module.exports = (io) => {
    io.on('connection', (socket) => {
        const userId = socket.user.userId;

        console.log(`friends.socket: Пользователь ${userId} подключился`);

        // Отправить список друзей
        socket.on('friend:getList', async () => {
            try {
                const friends = await db.query(`
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
                    WHERE (f.user_id = $1 OR f.friend_id = $1)
                `, [userId]);

                socket.emit('friend:list', friends.rows);
            } catch (error) {
                console.error('Ошибка получения списка друзей:', error.message);
                socket.emit('error', { message: 'Ошибка получения списка друзей.' });
            }
        });

        // Событие добавления в друзья
        socket.on('friend:add', async (data) => {
            try {
                const { friendId } = data;
        
                // Вставляем запись в базу данных и получаем ID запроса
                const insertResult = await db.query(`
                    INSERT INTO friends (user_id, friend_id, status)
                    VALUES ($1, $2, 'pending') RETURNING id
                `, [userId, friendId]);
        
                const requestId = insertResult.rows[0]?.id; // Получаем ID запроса
                if (!requestId) {
                    console.error('Failed to insert friend request into database');
                    return;
                }
        
                // Отправляем событие с requestId
                const friendRoom = `user:${friendId}`;
                io.to(friendRoom).emit('friend:update', {
                    type: 'friend_request',
                    requestId, // Добавляем requestId
                    userId,
                    message: `User ${userId} отправил вам запрос в друзья.`,
                });
        
                console.log(`Friend request sent: Request ID = ${requestId}, From = ${userId}, To = ${friendId}`);
            } catch (error) {
                console.error('Error in friend:add:', error.message);
                socket.emit('error', { message: 'Failed to add friend request' });
            }
        });        

        // Уведомить друзей при обновлении
        socket.on('friend:update', async (data) => {
            try {
                const { friendId, action } = data;
                const friendRoom = `user:${friendId}`;

                if (action === 'add') {
                    io.to(friendRoom).emit('friend:update', {
                        type: 'friend_add',
                        userId: userId, // Передаём userId
                            message: `User ${userId} добавил вас в друзья.`,
                    });
                } else if (action === 'remove') {
                    io.to(friendRoom).emit('friend:update', {
                        type: 'friend_remove',
                        userId: userId, // Передаём userId
                        message: `User ${userId} removed you as a friend.`,
                    });

                    socket.emit('friend:update', {
                        type: 'friend_remove',
                        userId: friendId, // Передаём friendId
                        message: `You removed user ${friendId} as a friend.`,
                        });
                    } else {
                        throw new Error('Неизвестное действие');
                    }

                    console.log(`Уведомление отправлено в комнату ${friendRoom}: ${action}`);
            } catch (error) {
                console.error('Ошибка в friend:update:', error.message);
                socket.emit('error', { message: 'Ошибка обработки обновления друзей.' });
            }
        });
    });
};
