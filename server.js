// Подключаем зависимости
require('dotenv').config();
const express = require('express');

// Подключаем сторонние файлы
const { initDatabase, removeExpiredTokens } = require('./src/db.init.js');

// Подключаем src'шные файлы
const authRoutes = require('./src/auth/auth.routes');
const userRoutes = require('./src/user/user.routes');

const app = express();

app.use( express.json() ) // Обработка json

// Инициализируем переменные
const SV_HOST = process.env.SV_HOST
const SV_PORT = process.env.SV_PORT

// Маршруты
app.use('/auth', authRoutes);
app.use('/user', userRoutes);

// Запускаем сервер
const startServer = async () => {
    try {
        // Инициализируем БД
        await initDatabase();

        // Запускаем очистку каждые 24 часа
        setInterval( removeExpiredTokens, 24 * 60 * 60 * 1000 );

        // Запускаем сервер
        app.listen( SV_PORT, () => {
            console.log( `Сервер запущен на порту http://${SV_HOST}:${SV_PORT}` );
        });
    } catch ( error ) { // Завершение при ошибке
        console.error( 'Ошибка при запуске сервера:', error.message );
        process.exit( 1 );
    }
}

// Запуск сервера
startServer();