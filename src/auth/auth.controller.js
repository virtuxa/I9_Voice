const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../db.init.js');


// Функция регистрации
const register = async (req, res) => {
    try {
        const { username, password } = req.body;

        if ( !username || !password ) {
            return res.status( 400 ).json({ message: 'Введите имя пользователя и пароль.' });
        }

        // Проверка уникальности имени пользователя
        const existingUser = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if ( existingUser.rows.length > 0 ) {
            return res.status( 409 ).json({ message: 'Пользователь уже существует.' })
        }

        // Хеширование пароля
        const hashedPassword = await bcrypt.hash( password, 10 );

        // Добавление пользователя в базу данных
        await pool.query(
            'INSERT INTO users (username, password) VALUES ($1, $2)',
            [username, hashedPassword]
        );

        res.status( 201 ).json({ message: 'Пользователь успешно зарегистрирован.' })
    } catch ( error ) {
        console.error( 'Ошибка при регистрации:', error );
        res.status( 500 ).json({ message: 'Ошибка сервера.' });
    }
};

// Функция авторизации
const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if ( !username || !password ) {
            return res.status( 400 ).json({ message: 'Введите имя пользователя и пароль.' });
        }

        // Проверка наличия пользователя
        const result = await pool.query( 'SELECT * FROM users WHERE username = $1', [username] );
        const user = result.rows[0];

        if ( !user ) {
            return res.status( 404 ).json({ message: 'Пользователь не найден.' });
        }

        // Проверка пароля
        const isPasswordValid = await bcrypt.compare( password, user.password );
        if ( !isPasswordValid ) {
            return res.status( 401 ).json({ message: 'Неверный пароль.' });
        }

        // Создаём Access Token
        const accessToken = jwt.sign(
            { id: user.id, username: user.username }
            , process.env.JWT_SECRET
            , { expiresIn: '15m' }
        );

        // Создаём Refresh Token
        const refreshToken = jwt.sign(
            { id: user.id, username: user.username }
            , process.env.REFRESH_SECRET
            , { expiresIn: '7d' }
        );

        // Добавляем refresh токен в БД
        await pool.query(
            'INSERT INTO refresh_tokens (user_id, token) VALUES ($1, $2)',
            [user.id, refreshToken]
        );

        // Обновляем статус пользователя на "online"
        await pool.query('UPDATE users SET status = $1 WHERE id = $2', ['online', user.id]);

        res.status(200).json({
            message: 'Авторизация прошла успешно',
            accessToken,
            refreshToken
        });
    } catch ( error ) {
        console.error( 'Ошибка при входе:', error );
        res.status( 500 ).json({ message: 'Ошибка сервера.' });
    }
}

// Функция выхода
const logout = async ( req, res ) => {
    try {
        const { refreshToken } = req.body; // Принимаем токен из тела запроса

        if ( !refreshToken ) {
            return res.status( 401 ).json({ message: 'Токен отсутствует.' });
        }

        // Проверяем, существует ли токен в базе
        const result = await pool.query('SELECT * FROM refresh_tokens WHERE token = $1', [ refreshToken ]);
        if (result.rows.length === 0) {
            return res.status( 404 ).json({ message: 'Недействительный токен.' });
        }

        const userId = result.rows[0].user_id;

        // Удаляем токен из базы
        await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [ refreshToken ]);

        // Обновляем статус пользователя на "offline"
        await pool.query('UPDATE users SET status = $1 WHERE id = $2', ['offline', userId]);

        res.status(200).json({ message: 'Успешный выход.' });
    } catch ( error ) {
        console.error( 'Ошибка при выходе:', error );
        res.status( 500 ).json({ message: 'Ошибка сервера.' });
    }
}

// Функция обновления refresh токена
const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if ( !refreshToken ) {
            return res.status( 401 ).json({ message: 'Токен отсутствует.' });
        }

        // Проверяем наличие токена в базе
        const result = await pool.query('SELECT * FROM refresh_tokens WHERE token = $1', [ refreshToken ]);
        if ( result.rows.length === 0 ) {
            return res.status( 403 ).json({ message: 'Токен не найден в базе.' });
        }

        // Проверяем валидность токена
        jwt.verify( refreshToken, process.env.REFRESH_SECRET, async ( err, decoded ) => {
            if (err) {
                if (err.name === 'TokenExpiredError') {
                    return res.status(403).json({ message: 'Refresh token истек. Пожалуйста, войдите снова.' });
                }
                return res.status(403).json({ message: 'Токен недействителен.' });
            }

            // Генерация нового Access токена
            const newAccessToken = jwt.sign(
                { id: decoded.id, username: decoded.username },
                process.env.JWT_SECRET,
                { expiresIn: '15m' } // Кратковременный токен
            );

            // Генерация нового Refresh токена
            const newRefreshToken = jwt.sign(
                { id: decoded.id, username: decoded.username },
                process.env.REFRESH_SECRET,
                { expiresIn: '7d' } // Новый refresh token на 7 дней
            );
            
            // Обновляем токен в базе
            await pool.query('UPDATE refresh_tokens SET token = $1, created_at = CURRENT_TIMESTAMP WHERE token = $2', 
                [newRefreshToken, refreshToken]
            );

            res.status(200).json({
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
            });
        });
    } catch ( error ) {
        console.error( 'Ошибка при обновлении токена:', error );
        res.status( 500 ).json({ message: 'Ошибка сервера.' });
    }
};

module.exports = { register, login, logout, refreshToken }