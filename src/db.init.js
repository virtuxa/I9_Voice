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