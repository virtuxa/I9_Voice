const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const notificationsSocket = require('./notifications.socket');
const friendsSocket = require('./friends.socket');

const configureSocketIO = (server) => {
    const io = new Server(server, {
        cors: {
            origin: '*', // Настройка разрешённых источников
        },
    });

    // Middleware для проверки токена
    io.use((socket, next) => {
        const token = socket.handshake.auth.token; // Получаем токен из handshake.auth
        if (!token) {
            return next(new Error('Ошибка аутентификации: Токен не передан'));
        }

        try {
            // Проверяем JWT токен
            const user = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = user; // Сохраняем данные пользователя в объекте сокета
            next(); // Переходим к обработке событий
        } catch (err) {
            next(new Error('Ошибка аутентификации: Неверный токен'));
        }
    });

    // Обработчик подключения
    io.on('connection', (socket) => {
        const userId = socket.user.userId;

        console.log(`Пользователь подключён: ${userId}`);

        // Подписываем пользователя на его персональную комнату
        socket.join(`user:${userId}`);
        console.log(`Пользователь ${userId} подписан на комнату user:${userId}`);

        // Обработчик отключения
        socket.on('disconnect', () => {
            console.log(`Пользователь отключён: ${userId}`);
        });
    });

    notificationsSocket(io); // Подключаем уведомления
    friendsSocket(io);       // Подключаем обработчики для друзей

    return io;
};

module.exports = { configureSocketIO };
