const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');

// Регистрация пользователя
const register = async (req, res) => {
    try {
        const { user_name, display_name, email, password, birth_date, phone_number } = req.body;

        // Проверяем, что все обязательные поля заполнены
        if (!user_name || !display_name || !email || !password || !birth_date) {
            return res.status(400).json({
                status: 1,
                error: 'All fields are required' 
            });
        }

        // Проверяем уникальность имени пользователя, email и номера телефона (если указан)
        const userExists = await db.query(
            `SELECT user_id FROM users WHERE user_name = $1 OR email = $2 OR phone_number = $3`,
            [user_name, email, phone_number]
        );
        if (userExists.rows.length > 0) {
            return res.status(400).json({ 
                status: 1,
                error: 'Username, email or phone number already taken' 
            });
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
            [user.user_id, 'online', 'New user']
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
            status: 0,
            message: 'Registration successful',
            user,
            tokens: {
                accessToken,
                refreshToken,
            },
        });
    } catch (error) {
        console.error('Error during registration:', error.message);
        res.status(500).json({ 
            status: 1,
            error: 'Server error' 
        });
    }
};

// Авторизация пользователя
const login = async (req, res) => {
    try {
        const { login, password } = req.body;

        // Проверяем, что все поля заполнены
        if (!login || !password) {
            return res.status(400).json({ 
                status: 1,
                error: 'Login and password are required'
            });
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
            return res.status(401).json({ 
                status: 1,
                error: 'Invalid login or password'
            });
        }

        // Сравниваем пароль
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                status: 1,
                error: 'Invalid login or password'
            });
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
            status: 0,
            message: 'Authorization successful',
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
        console.error('Error during authorization:', error.message);
        res.status(500).json({
            status: 1,
            error: 'Server error'
        });
    }
};

// Выход из профиля
const logout = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        // Проверяем, что refreshToken передан
        if (!refreshToken) {
            return res.status(400).json({ 
                status: 1,
                error: 'Refresh token is required'
            });
        }

        // Проверяем, существует ли токен
        const tokenExists = await db.query(
            `SELECT refresh_token FROM refresh_tokens WHERE refresh_token = $1`,
            [refreshToken]
        );

        if (tokenExists.rows.length === 0) {
            return res.status(404).json({
                status: 1,
                error: 'Token not found'
            });
        }

        // Удаляем токен
        await db.query(
            `DELETE FROM refresh_tokens WHERE refresh_token = $1`,
            [refreshToken]
        );

        res.json({
            status: 0,
            message: 'You have successfully logged out'
        });
    } catch (error) {
        console.error('Error during logout:', error.message);
        res.status(500).json({
            status: 1,
            error: 'Server error'
        });
    }
};

// Обновление токенов
const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        // Проверяем, что refreshToken передан
        if (!refreshToken) {
            return res.status(400).json({ 
                status: 1,
                error: 'Refresh token is required'
            });
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
            status: 0,
            message: 'Tokens updated successfully',
            tokens: {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
            },
        });
    } catch (error) {
        console.error('Error during token update:', error.message);
        res.status(500).json({
            status: 1,
            error: 'Server error'
        });
    }
};

module.exports = {
    register,
    login,
    logout,
    refreshToken,
};