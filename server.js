// Подключаем зависимости
require('dotenv').config();
const express = require('express');

// Подключаем сторонние файлы
const { initDatabase } = require('./src/db.init');

// Подключаем src'шные файлы
const authRoutes = require('./src/auth/auth.routes');

const app = express();

app.use( express.json() ) // Обработка json

// Инициализируем переменные
const SV_HOST = process.env.SV_HOST
const SV_PORT = process.env.SV_PORT

// Маршруты
app.use('/auth', authRoutes);

// Запускаем сервер
const startServer = async () => {
    try {
        await initDatabase(); // Инициализируем БД

        app.listen( SV_PORT, () => { // Запускаем сервер
            console.log( `Сервер запущен на порту http://${SV_HOST}:${SV_PORT}` );
        });
    } catch ( error ) { // Завершение при ошибке
        console.error( 'Ошибка при запуске сервера:', error.message );
        process.exit( 1 );
    }
}

// Запуск сервера
startServer();