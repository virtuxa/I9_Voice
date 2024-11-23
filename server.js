// Подключение библиотек
require('dotenv').config();
const express = require('express');

// Подключение модулей
const authRoutes = require('./src/auth/auth.routes');
const serversRoutes = require('./src/server/server.routes');

// Инициализируем переменные
const app = express();
const SV_HOST = process.env.SV_HOST;
const SV_PORT = process.env.SV_PORT;

// Глобальные middlewares
app.use( express.json() );

// Маршруты
app.use('/auth', authRoutes);
app.use('/servers', serversRoutes);

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Запускаем сервер
const startServer = async () => {
    try {
        // Инициализируем БД
        await initDatabase();

        // Запускаем сервер
        server.listen(SV_PORT, () => {
            console.log( `Сервер запущен на http://${SV_HOST}:${SV_PORT}` );
        });
    } catch ( error ) { // Завершение при ошибке
        console.error( 'Ошибка при запуске сервера:', error.message );
        process.exit( 1 );
    }
};
startServer();
