// Подключаем зависимости
require('dotenv').config();
const http = require('http');
const express = require('express');
const morgan = require('morgan');

// Подключаем сторонние файлы
const { initDatabase, removeExpiredTokens } = require('./src/utils/db.init');
const authRoutes = require('./src/auth/auth.routes');
const userRoutes = require('./src/user/user.routes');
const chatRoutes = require('./src/chat/chat.routes');
const { setupWebSocket } = require('./src/utils/socket'); // WebSocket

// Создаем приложение Express
const app = express();
const server = http.createServer(app); // HTTP-сервер для WebSocket

// Middleware
app.use(morgan('dev'));
app.use(express.json());

// Инициализируем переменные
const SV_HOST = process.env.SV_HOST;
const SV_PORT = process.env.SV_PORT;

// Маршруты
app.use('/auth', authRoutes);
app.use('/user', userRoutes);
app.use('/chat', chatRoutes);

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Инициализируем WebSocket
setupWebSocket(server);

// Запускаем сервер
const startServer = async () => {
    try {
        // Инициализируем БД
        await initDatabase();

        // Запускаем очистку каждые 24 часа
        setInterval( removeExpiredTokens, 24 * 60 * 60 * 1000 );

        // Запускаем сервер
        server.listen(SV_PORT, () => {
            console.log(`Сервер запущен на http://${SV_HOST}:${SV_PORT}`);
        });
    } catch ( error ) { // Завершение при ошибке
        console.error( 'Ошибка при запуске сервера:', error.message );
        process.exit( 1 );
    }
};

// Запуск сервера
startServer();
