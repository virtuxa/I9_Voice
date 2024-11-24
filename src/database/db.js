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
        // Создание таблицы users, если она не существует
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY, -- Уникальный идентификатор
                username VARCHAR(50) NOT NULL UNIQUE, -- Имя пользователя (уникальное)
                display_name VARCHAR(100) NOT NULL, -- Отображаемое имя
                email VARCHAR(100) NOT NULL UNIQUE, -- Email (уникальный)
                password VARCHAR(255) NOT NULL, -- Хэш пароля
                birth_date DATE NOT NULL, -- Дата рождения
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- Дата создания записи
            );
        `);

        // Создание таблицы refresh_tokens, если она не существует
        await pool.query(`
            CREATE TABLE IF NOT EXISTS refresh_tokens (
                refresh_token TEXT PRIMARY KEY,
                user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Создание таблицы notifications, если она не существует
        await pool.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                type VARCHAR(50) NOT NULL, -- Тип уведомления (например, friend_request, message)
                message TEXT NOT NULL, -- Текст уведомления
                is_read BOOLEAN DEFAULT FALSE, -- Прочитано или нет
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- Дата создания
            );
        `);

        // Создание таблицы sessions, если она не существует
        await pool.query(`
            CREATE TABLE IF NOT EXISTS sessions (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                refresh_token TEXT NOT NULL, -- Привязка сессии к refreshToken
                device_info TEXT, -- Информация об устройстве (например, браузер, IP)
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Создание таблицы user_statuses, если она не существует
        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_statuses (
                user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, -- Ссылка на пользователя
                status VARCHAR(20) DEFAULT 'offline', -- Текущий статус пользователя
                text_status TEXT, -- Текстовый статус (например, "Не беспокоить")
                description TEXT, -- Дополнительное описание
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- Дата последнего обновления
            );
        `);

        console.log('База данных инциализирована.');
    } catch (error) {
        console.error('Ошибка инициализации базы данных:', error.message);
    }
};

module.exports = {
    query: (text, params) => pool.query(text, params), // Для выполнения запросов
    initDatabase, // Экспорт функции инициализации
};
