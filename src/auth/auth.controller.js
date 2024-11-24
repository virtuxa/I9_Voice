const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const db = require('../database/db');

// Регистрация пользователя
const register = async (req, res) => {
    try {
        const { username, display_name, email, password, birth_date } = req.body;

        // Проверка на заполненность полей
        if (!username || !display_name || !email || !password || !birth_date) {
            return res.status(400).json({ error: 'Заполнены не все поля' });
        }

        // Проверка уникальности email и имени пользователя
        const userExists = await db.query(
            `SELECT id FROM users WHERE email = $1 OR username = $2`,
            [email, username]
        );
        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: 'Пользователь с такой почтой или именем пользователя зарегистрирован' });
        }

        // Хэширование пароля
        const hashedPassword = await bcrypt.hash(password, 10);

        // Сохранение пользователя в базе данных
        const result = await db.query(
            `INSERT INTO users (username, display_name, email, password, birth_date) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING id, username, display_name, email, birth_date`,
            [username, display_name, email, hashedPassword, birth_date]
        );

        const user = result.rows[0];

        // Генерация токенов
        const accessToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '15m' });
        const refreshToken = jwt.sign({ userId: user.id }, process.env.REFRESH_SECRET, { expiresIn: '7d' });

        // Сохраняем refreshToken в таблице refresh_tokens
        await db.query(
            `INSERT INTO refresh_tokens (refresh_token, user_id) VALUES ($1, $2)`,
            [refreshToken, user.id]
        );

        // Добавляем начальный статус пользователя
        await db.query(
            `INSERT INTO user_statuses (user_id, status, text_status, description) 
             VALUES ($1, $2, $3, $4)`,
            [user.id, 'offline', 'Offline', 'User has not set a status yet']
        );

        // Возвращаем ответ клиенту
        res.status(201).json({
            message: 'Пользователь успешно зарегистрирован',
            user: {
                id: user.id,
                username: user.username,
                display_name: user.display_name,
                email: user.email,
                birth_date: user.birth_date,
            },
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

// Функция авторизации
const login = async (req, res) => {
    try {
        const { login, password } = req.body;

        // Проверяем, что все поля заполнены
        if (!login || !password) {
            return res.status(400).json({ error: 'Требуются логин и пароль' });
        }

        // Ищем пользователя по email или username
        const result = await db.query(
            `SELECT id, username, display_name, email, password, birth_date 
             FROM users 
             WHERE email = $1 OR username = $1`,
            [login]
        );
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ error: 'Неверный логин или пароль' });
        }

        // Сравниваем пароль
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            return res.status(401).json({ error: 'Неверный логин или пароль' });
        }

        // Генерируем токены
        const accessToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '15m' });
        const refreshToken = jwt.sign({ userId: user.id }, process.env.REFRESH_SECRET, { expiresIn: '7d' });

        // Проверяем, есть ли уже refreshToken в таблице
        const tokenExists = await db.query(
            `SELECT refresh_token FROM refresh_tokens WHERE user_id = $1`,
            [user.id]
        );

        if (tokenExists.rows.length > 0) {
            // Обновляем существующий refreshToken
            await db.query(
                `UPDATE refresh_tokens SET refresh_token = $1, created_at = NOW() WHERE user_id = $2`,
                [refreshToken, user.id]
            );
        } else {
            // Вставляем новый refreshToken
            await db.query(
                `INSERT INTO refresh_tokens (refresh_token, user_id) VALUES ($1, $2)`,
                [refreshToken, user.id]
            );
        };

        // Сохранение сессии
        const deviceInfo = req.headers['user-agent'] || 'Unknown Device';
        await db.query(
            `INSERT INTO sessions (user_id, refresh_token, device_info) VALUES ($1, $2, $3)`,
            [user.id, refreshToken, deviceInfo]
        );

        // Возвращаем токены и данные пользователя
        res.json({
            message: 'Авторизация прошла успешно',
            user: {
                id: user.id,
                username: user.username,
                display_name: user.display_name,
                email: user.email,
                birth_date: user.birth_date,
            },
            tokens: {
                accessToken,
                refreshToken,
            },
        });
    } catch (error) {
        console.error('Error during login:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Функция выхода из профиля
const logout = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        // Проверяем, что refreshToken передан
        if (!refreshToken) {
            return res.status(400).json({ error: 'Требуется Refresh token' });
        }

        // Проверяем наличие токена в базе
        const tokenExists = await db.query(
            `SELECT refresh_token FROM refresh_tokens WHERE refresh_token = $1`,
            [refreshToken]
        );

        if (tokenExists.rows.length === 0) {
            return res.status(404).json({ error: 'Refresh token не найден' });
        }

        // Удаляем refreshToken из базы
        await db.query(
            `DELETE FROM refresh_tokens WHERE refresh_token = $1`,
            [refreshToken]
        );

        res.json({ message: 'Успешный выход' });
    } catch (error) {
        console.error('Ошибка при logout:', error.message);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// Функция обновления refresh токена
const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        // Проверяем, что refreshToken передан
        if (!refreshToken) {
            return res.status(400).json({ error: 'Требуется токен' });
        }

        // Проверяем, что токен есть в базе данных
        const tokenExists = await db.query(
            `SELECT user_id FROM refresh_tokens WHERE refresh_token = $1`,
            [refreshToken]
        );

        if (tokenExists.rows.length === 0) {
            return res.status(403).json({ error: 'Токен не найден' });
        }

        // Проверяем валидность токена
        let payload;
        try {
            payload = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
        } catch (err) {
            return res.status(403).json({ error: 'Неверный токен' });
        }

        const userId = payload.userId;

        // Генерируем новые токены
        const newAccessToken = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '15m' });
        const newRefreshToken = jwt.sign({ userId }, process.env.REFRESH_SECRET, { expiresIn: '7d' });

        // Обновляем refreshToken в базе
        await db.query(
            `UPDATE refresh_tokens SET refresh_token = $1, created_at = NOW() WHERE user_id = $2`,
            [newRefreshToken, userId]
        );

        // Возвращаем новые токены клиенту
        res.json({
            message: 'Токены обновлены успешно',
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
    register
    , login
    , logout
    , refreshToken
}