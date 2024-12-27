const { Pool } = require('pg');

// Подключение к базе данных
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'ivoice',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || 'password',
});

// Функция инициализации базы данных
const initDatabase = async () => {
    try {
        // ------------------------------------------------------------------- //
        
        // Создание таблицы users
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                user_id SERIAL PRIMARY KEY,         -- Уникальный идентификатор
                user_name VARCHAR(50) NOT NULL UNIQUE, -- Имя пользователя (уникальное)
                display_name VARCHAR(100) NOT NULL, -- Отображаемое имя
                password VARCHAR(255) NOT NULL,     -- Хэш пароля
                email VARCHAR(100) NOT NULL UNIQUE, -- Email (уникальный)
                phone_number VARCHAR(15),           -- Номер телефона
                birth_date DATE NOT NULL,           -- Дата рождения
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Дата создания записи
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- Дата последнего обновления
            );
        `);

        // Создание таблицы user_profiles
        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_profiles (
                user_id INT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
                avatar_url VARCHAR(255), -- URL аватара
                status VARCHAR(50), -- Статус пользователя
                description TEXT, -- Дополнительное описание или био
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- Дата последнего обновления
            );
        `);

        // Создание таблицы user_settings, если она не существует
        // 

        // Создание таблицы friends
        await pool.query(`
            CREATE TABLE IF NOT EXISTS friends (
                friendship_id SERIAL PRIMARY KEY,          -- Уникальный идентификатор дружбы
                user_first INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE, -- Первый пользователь (ссылка на users)
                user_second INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE, -- Второй пользователь (ссылка на users)
                status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')), -- Статус дружбы
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- Дата создания записи
            );
        `);

        // Создание таблицы chats, если она не существует
        // 

        // ------------------------------------------------------------------- //

        // Создание таблицы refresh_tokens
        await pool.query(`
            CREATE TABLE IF NOT EXISTS refresh_tokens (
                refresh_token TEXT PRIMARY KEY,
                user_id INT NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ------------------------------------------------------------------- //

        console.log('Database initialized.');
    } catch (error) {
        console.error('Error initializing database:', error.message);
    }
};

module.exports = {
    query: (text, params) => pool.query(text, params), // Для выполнения запросов
    initDatabase, // Экспорт функции инициализации
};