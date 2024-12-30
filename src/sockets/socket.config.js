const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const configureSocketIO = (server) => {
    const io = new Server(server, {
        cors: {
            origin: process.env.CLIENT_URL || '*',
            methods: ['GET', 'POST']
        },
        pingTimeout: 60000,
        pingInterval: 25000
    });

    // Middleware для проверки токена
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Ошибка аутентификации: Токен не передан'));
        }

        try {
            const user = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = user;
            next();
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
        
        // Обработка ошибок
        socket.on('error', (error) => {
            console.error(`Ошибка сокета для пользователя ${userId}:`, error);
        });

        socket.on('connect_error', (error) => {
            console.error(`Ошибка подключения для пользователя ${userId}:`, error);
        });

        // Проверка активности соединения
        socket.on('ping', () => {
            socket.emit('pong');
        });

        socket.on('disconnect', (reason) => {
            console.log(`Пользователь отключён: ${userId}, причина: ${reason}`);
        });
    });

    return io;
};

module.exports = { configureSocketIO };
