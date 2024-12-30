// Подключение библиотек
require('dotenv').config(); // Подгрузка .env
const express = require('express');
const http = require('http'); // Оборачиваем сервер в http
const { configureSocketIO } = require('./src/sockets/socket.config'); // Подключаем конфиг socket io
const cors = require('cors');

// Подключение модулей
const { initDatabase } = require('./src/database/db'); // Подключаем базу данных
const scheduleSessionCleanup = require('./src/utils/cleanup');
// Подключение маршрутов
const authRoutes = require('./src/auth/auth.routes');
const usersRoutes = require('./src/users/users.routes');
const friendsRoutes = require('./src/friends/friends.routes');
const chatsRoutes = require('./src/chats/chats.routes');

// Инициализируем переменные
const app = express();
const server = http.createServer(app); // Создаём HTTP сервер поверх Express
const io = configureSocketIO(server); // Подключаем Socket.IO

const SV_HOST = process.env.SV_HOST;
const SV_PORT = process.env.SV_PORT;

// Настройка CORS
const corsOptions = {
    origin: '*', // Разрешает запросы с любого источника
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], // Добавьте все используемые методы
    allowedHeaders: ['Content-Type', 'Authorization'], // Разрешённые заголовки
};
app.use(cors(corsOptions));

// Middleware для передачи io в запрос
app.use((req, res, next) => {
    req.io = io; // Добавляем io в объект запроса
    next();
});

// Глобальные middlewares
app.use( express.json() );

// Маршруты
app.use('/auth', authRoutes);
app.use('/users', usersRoutes);
app.use('/friends', friendsRoutes);
app.use('/chats', chatsRoutes);

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Настройка автоматической очистки сессий
scheduleSessionCleanup();

// Запускаем сервер
const startServer = async () => {
    try {
        // Инициализируем БД
        await initDatabase();

        // Запускаем сервер
        server.listen(SV_PORT, () => {
            console.log( `Server started on http://${SV_HOST}:${SV_PORT}` );
        });
    } catch ( error ) { // Завершение при ошибке
        console.error( 'Error starting server:', error.message );
        process.exit( 1 );
    }
};
startServer();
