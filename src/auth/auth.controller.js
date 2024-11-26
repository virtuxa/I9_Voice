const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');

// Регистрация пользователя
const register = async (req, res) => {
    try {
        const { user_name, display_name, email, password, birth_date, phone_number } = req.body;

        // Проверяем, что все обязательные поля заполнены
        if (!user_name || !display_name || !email || !password || !birth_date) {
            return res.status(400).json({ error: 'Все поля обязательны для заполнения' });
        }

        // Проверяем уникальность имени пользователя, email и номера телефона (если указан)
        const userExists = await db.query(
            `SELECT user_id FROM users WHERE user_name = $1 OR email = $2 OR phone_number = $3`,
            [user_name, email, phone_number]
        );
        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: 'Имя пользователя, email или номер телефона уже заняты' });
        }

        // Хэшируем пароль
        const hashedPassword = await bcrypt.hash(password, 10);

        // Сохраняем пользователя в базу данных
        const result = await db.query(
            `INSERT INTO users (user_name, display_name, email, password, birth_date, phone_number) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING user_id, user_name, display_name, email, birth_date, phone_number`,
            [user_name, display_name, email, hashedPassword, birth_date, phone_number]
        );
        const user = result.rows[0];

        // Создаем запись в user_profiles
        await db.query(
            `INSERT INTO user_profiles (user_id, status, description) 
             VALUES ($1, $2, $3)`,
            [user.user_id, 'offline', 'New user']
        );

        // Генерируем токены
        const accessToken = jwt.sign({ userId: user.user_id }, process.env.JWT_SECRET, { expiresIn: '15m' });
        const refreshToken = jwt.sign({ userId: user.user_id }, process.env.REFRESH_SECRET, { expiresIn: '7d' });

        // Вставляем или обновляем refreshToken в базе данных
        await db.query(
            `INSERT INTO refresh_tokens (refresh_token, user_id) 
             VALUES ($1, $2) 
             ON CONFLICT (user_id) 
             DO UPDATE SET refresh_token = $1, created_at = NOW()`,
            [refreshToken, user.user_id]
        );

        // Возвращаем успешный ответ
        res.status(201).json({
            message: 'Регистрация прошла успешно',
            user,
            tokens: {
                accessToken,
                refreshToken,
            },
        });
    } catch (error) {
        console.error('Ошибка при регистрации:', error.message);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// Авторизация пользователя
const login = async (req, res) => {
    try {
        const { login, password } = req.body;

        // Проверяем, что все поля заполнены
        if (!login || !password) {
            return res.status(400).json({ error: 'Логин и пароль обязательны' });
        }

        // Ищем пользователя по имени пользователя, email или номеру телефона
        const result = await db.query(
            `SELECT user_id, user_name, display_name, email, phone_number, password 
             FROM users 
             WHERE user_name = $1 OR email = $1 OR phone_number = $1`,
            [login]
        );
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ error: 'Неверный логин или пароль' });
        }

        // Сравниваем пароль
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Неверный логин или пароль' });
        }

        // Генерируем токены
        const accessToken = jwt.sign({ userId: user.user_id }, process.env.JWT_SECRET, { expiresIn: '15m' });
        const refreshToken = jwt.sign({ userId: user.user_id }, process.env.REFRESH_SECRET, { expiresIn: '7d' });

        // Вставляем или обновляем refreshToken в базе данных
        await db.query(
            `INSERT INTO refresh_tokens (refresh_token, user_id) 
             VALUES ($1, $2) 
             ON CONFLICT (user_id) 
             DO UPDATE SET refresh_token = $1, created_at = NOW()`,
            [refreshToken, user.user_id]
        );

        // Возвращаем успешный ответ
        res.json({
            message: 'Авторизация прошла успешно',
            user: {
                user_id: user.user_id,
                user_name: user.user_name,
                display_name: user.display_name,
                email: user.email,
                phone_number: user.phone_number,
            },
            tokens: {
                accessToken,
                refreshToken,
            },
        });
    } catch (error) {
        console.error('Ошибка при авторизации:', error.message);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// Выход из профиля
const logout = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        // Проверяем, что refreshToken передан
        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token обязателен' });
        }

        // Проверяем, существует ли токен
        const tokenExists = await db.query(
            `SELECT refresh_token FROM refresh_tokens WHERE refresh_token = $1`,
            [refreshToken]
        );

        if (tokenExists.rows.length === 0) {
            return res.status(404).json({ error: 'Токен не найден' });
        }

        // Удаляем токен
        await db.query(
            `DELETE FROM refresh_tokens WHERE refresh_token = $1`,
            [refreshToken]
        );

        res.json({ message: 'Вы успешно вышли из профиля' });
    } catch (error) {
        console.error('Ошибка при выходе из профиля:', error.message);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// Обновление токенов
const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        // Проверяем, что refreshToken передан
        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token обязателен' });
        }

        // Проверяем валидность токена
        const payload = jwt.verify(refreshToken, process.env.REFRESH_SECRET);

        // Генерируем новые токены
        const newAccessToken = jwt.sign({ userId: payload.userId }, process.env.JWT_SECRET, { expiresIn: '15m' });
        const newRefreshToken = jwt.sign({ userId: payload.userId }, process.env.REFRESH_SECRET, { expiresIn: '7d' });

        // Обновляем refreshToken в базе данных
        await db.query(
            `UPDATE refresh_tokens SET refresh_token = $1 WHERE user_id = $2`,
            [newRefreshToken, payload.userId]
        );

        res.json({
            message: 'Токены успешно обновлены',
            tokens: {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
            },
        });
    } catch (error) {
        console.error('Ошибка при обновлении токенов:', error.message);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

module.exports = {
    register,
    login,
    logout,
    refreshToken,
};