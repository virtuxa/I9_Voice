const { Pool } = require('pg');

// Подключение к базе данных
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
});

// Инициализация базы данных
const initDatabase = async () => {
    try {
        // Таблица ( users ) пользователей
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            status VARCHAR(50) DEFAULT 'offline',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Таблица ( refresh_tokens ) обновления токенов
        await pool.query(`
            CREATE TABLE IF NOT EXISTS refresh_tokens (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                token TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Таблица ( friends ) друзей
        await pool.query(`
            CREATE TABLE IF NOT EXISTS friends (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                friend_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, rejected
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Таблица ( chats ) чаты
        await pool.query(`
            CREATE TABLE IF NOT EXISTS chats (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255), -- Название чата (только для групповых)
                type VARCHAR(50) NOT NULL, -- 'private' или 'group'
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Таблица ( chat_members ) участники чатов
        await pool.query(`
            CREATE TABLE IF NOT EXISTS chat_members (
                id SERIAL PRIMARY KEY,
                chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                role VARCHAR(50) DEFAULT 'member', -- 'admin', 'member'
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(chat_id, user_id) -- Запрет дублирования участников
            );
        `);

        // Таблица ( messages ) сообщений
        await pool.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE,
                sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('Инициализация базы данных завершена.');
    } catch( error ) {
        console.error( 'Ошибка подключения к базе данных', error.message );
        process.exit( 1 );
    }
};

const removeExpiredTokens = async () => {
    try {
        const result = await pool.query(`
            DELETE FROM refresh_tokens 
            WHERE created_at + interval '7 days' < CURRENT_TIMESTAMP
        `);
        console.log(`Удалено ${result.rowCount} просроченных токенов.`);
    } catch (error) {
        console.error('Ошибка при удалении просроченных токенов:', error.message);
    }
};

module.exports = { pool, initDatabase, removeExpiredTokens };