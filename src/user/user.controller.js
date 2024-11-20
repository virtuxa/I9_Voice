const bcrypt = require('bcrypt');
const { pool } = require('../db.init');

// Получение профиля пользователя
const getUserProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await pool.query(
            'SELECT id, username, created_at FROM users WHERE id = $1',
            [userId]
        );
        const user = result.rows[0];

        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден.' });
        }

        res.status(200).json(user);
    } catch (error) {
        console.error('Ошибка при получении профиля:', error.message);
        res.status(500).json({ message: 'Ошибка сервера.' });
    }
};

// Обновление профиля
const updateUserProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { username } = req.body;

        if (!username) {
            return res.status(400).json({ message: 'Не указаны данные для обновления.' });
        }

        const result = await pool.query(
            `
            UPDATE users 
            SET username = $1
            WHERE id = $2 
            RETURNING id, username, created_at
            `,
            [username, userId]
        );

        const updatedUser = result.rows[0];
        res.status(200).json(updatedUser);
    } catch (error) {
        console.error('Ошибка при обновлении профиля:', error.message);
        res.status(500).json({ message: 'Ошибка сервера.' });
    }
};

// Удаление профиля
const deleteUserProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        await pool.query('DELETE FROM users WHERE id = $1', [userId]);

        res.status(200).json({ message: 'Профиль успешно удален.' });
    } catch (error) {
        console.error('Ошибка при удалении профиля:', error.message);
        res.status(500).json({ message: 'Ошибка сервера.' });
    }
};

// Получение списка сессий
const getUserSessions = async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await pool.query(
            'SELECT id, token, created_at FROM refresh_tokens WHERE user_id = $1',
            [userId]
        );

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Ошибка при получении сессий:', error.message);
        res.status(500).json({ message: 'Ошибка сервера.' });
    }
};

// Закрытие выбранной сессии
const terminateSession = async (req, res) => {
    try {
        const userId = req.user.id; // ID текущего пользователя из токена
        const { sessionId } = req.params; // ID сессии из параметров запроса

        // Проверяем, существует ли указанная сессия и принадлежит ли она текущему пользователю
        const result = await pool.query(
            'SELECT * FROM refresh_tokens WHERE id = $1 AND user_id = $2',
            [sessionId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Сессия не найдена или не принадлежит пользователю.' });
        }

        // Удаляем указанную сессию
        await pool.query('DELETE FROM refresh_tokens WHERE id = $1', [sessionId]);

        res.status(200).json({ message: 'Сессия успешно завершена.' });
    } catch (error) {
        console.error('Ошибка при завершении сессии:', error.message);
        res.status(500).json({ message: 'Ошибка сервера.' });
    }
};

// Смена пароля
const changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Не указаны текущий или новый пароль.' });
        }

        const result = await pool.query('SELECT password FROM users WHERE id = $1', [userId]);
        const user = result.rows[0];

        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден.' });
        }

        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Текущий пароль неверен.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, userId]);

        res.status(200).json({ message: 'Пароль успешно обновлен.' });
    } catch (error) {
        console.error('Ошибка при смене пароля:', error.message);
        res.status(500).json({ message: 'Ошибка сервера.' });
    }
};

// Обновление статуса
const updateStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        const { status } = req.body;

        if (!['online', 'offline'].includes(status)) {
            return res.status(400).json({ message: 'Некорректный статус.' });
        }

        await pool.query('UPDATE users SET status = $1 WHERE id = $2', [status, userId]);

        res.status(200).json({ message: 'Статус успешно обновлен.', status });
    } catch (error) {
        console.error('Ошибка при обновлении статуса:', error);
        res.status(500).json({ message: 'Ошибка сервера.' });
    }
};

// Получение статуса пользователя
const getStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query('SELECT status FROM users WHERE id = $1', [id]);
        const user = result.rows[0];

        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден.' });
        }

        res.status(200).json({ status: user.status });
    } catch (error) {
        console.error('Ошибка при получении статуса:', error);
        res.status(500).json({ message: 'Ошибка сервера.' });
    }
};

module.exports = {
    getUserProfile
    , updateUserProfile
    , deleteUserProfile
    , getUserSessions
    , terminateSession
    , changePassword
    , updateStatus
    , getStatus
};
