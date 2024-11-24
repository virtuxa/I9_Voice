const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const notificationsSocket = require('./notifications.socket'); // Подключение модуля уведомлений

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

    // Подключаем обработчики
    notificationsSocket(io);

    return io;
};

module.exports = { configureSocketIO };
