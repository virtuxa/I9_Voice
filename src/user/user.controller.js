const db = require('../database/db');
const bcrypt = require('bcryptjs');

// Получение информации о пользователе
const getMeProfile = async (req, res) => {
    try {
        const userId = req.user.userId; // ID пользователя из токена
        const result = await db.query(
            `SELECT id, username, display_name, email, birth_date FROM users WHERE id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Ошибка при выборе профиля пользователя:', error.message);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// Обновление профиля пользователя
const patchMeProfile = async (req, res) => {
    try {
        const userId = req.user.userId; // ID пользователя из токена
        const { username, display_name, email, birth_date } = req.body;

        // Проверяем, что хотя бы одно поле для обновления передано
        if (!username && !display_name && !email && !birth_date) {
            return res.status(400).json({ error: 'Нет полей для обновления' });
        }

        // Динамически создаём запрос с учётом переданных полей
        const fields = [];
        const values = [];
        let index = 1;

        if (username) {
            fields.push(`username = $${index++}`);
            values.push(username);
        }
        if (display_name) {
            fields.push(`display_name = $${index++}`);
            values.push(display_name);
        }
        if (email) {
            fields.push(`email = $${index++}`);
            values.push(email);
        }
        if (birth_date) {
            fields.push(`birth_date = $${index++}`);
            values.push(birth_date);
        }

        values.push(userId); // Добавляем userId как последний параметр

        const query = `
            UPDATE users
            SET ${fields.join(', ')}
            WHERE id = $${index}
            RETURNING id, username, display_name, email, birth_date
        `;

        const result = await db.query(query, values);

        res.json({
            message: 'Профиль успешно обновлен',
            user: result.rows[0],
        });
    } catch (error) {
        console.error('Ошибка обновления пользователя:', error.message);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// Удаление профиля пользователя
const deleteMeProfile = async (req, res) => {
    try {
        const userId = req.user.userId; // ID пользователя из токена

        // Удаляем пользователя
        await db.query(`DELETE FROM users WHERE id = $1`, [userId]);

        res.json({ message: 'Профиль успешно удален' });
    } catch (error) {
        console.error('Ошибка удаления профиля:', error.message);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// Получить сессии
const getSessions = async (req, res) => {
    try {
        const userId = req.user.userId; // ID пользователя из токена

        const result = await db.query(
            `SELECT id, device_info, created_at, last_used 
             FROM sessions 
             WHERE user_id = $1`,
            [userId]
        );

        res.json({
            message: 'Активные сессии переданы успешно',
            sessions: result.rows,
        });
    } catch (error) {
        console.error('Ошибка при получении сессий:', error.message);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// Удалить сессию
const terminateSession = async (req, res) => {
    try {
        const userId = req.user.userId; // ID пользователя из токена
        const sessionId = req.params.sessionId; // ID сессии из маршрута

        // Проверяем, что сессия принадлежит текущему пользователю
        const sessionCheck = await db.query(
            `SELECT id FROM sessions WHERE id = $1 AND user_id = $2`,
            [sessionId, userId]
        );

        if (sessionCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Сессия не найдена или принадлежит не пользователю' });
        }

        // Удаляем сессию
        await db.query(`DELETE FROM sessions WHERE id = $1`, [sessionId]);

        res.json({ message: 'Сессия успешно удалена' });
    } catch (error) {
        console.error('Ошибка при удалении сессии:', error.message);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// Удалить все сессии пользователя
const terminateAllSession = async (req, res) => {
    try {
        const userId = req.user.userId; // ID пользователя из токена

        // Удаляем все сессии пользователя
        await db.query(`DELETE FROM sessions WHERE user_id = $1`, [userId]);

        res.json({ message: 'Все сессии успешно удалены' });
    } catch (error) {
        console.error('Ошибка при удалении всех сессий:', error.message);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// Обновление пароля пользователя
const changePassword = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Поля не заполнены' });
        }

        // Получаем текущий хэш пароля из базы данных
        const result = await db.query(
            `SELECT password FROM users WHERE id = $1`,
            [userId]
        );
        const user = result.rows[0];

        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        // Проверяем текущий пароль
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Текущий пароль неверный' });
        }

        // Хэшируем новый пароль
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Обновляем пароль в базе данных
        await db.query(
            `UPDATE users SET password = $1 WHERE id = $2`,
            [hashedPassword, userId]
        );

        res.json({ message: 'Пароль успешно обновлен' });
    } catch (error) {
        console.error('Ошибка при обновлении пароля:', error.message);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// Получение статуса текущего пользователя
const getStatus = async (req, res) => {
    try {
        const userId = req.user.userId;

        const result = await db.query(
            `SELECT status, text_status, description, updated_at 
             FROM user_statuses 
             WHERE user_id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Status not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching status:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};


// Обновление статуса текущего пользователя
const updateStatus = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { status, text_status, description } = req.body;

        if (!status && !text_status && !description) {
            return res.status(400).json({ error: 'At least one field is required' });
        }

        const fields = [];
        const values = [];
        let index = 1;

        if (status) {
            fields.push(`status = $${index++}`);
            values.push(status);
        }
        if (text_status) {
            fields.push(`text_status = $${index++}`);
            values.push(text_status);
        }
        if (description) {
            fields.push(`description = $${index++}`);
            values.push(description);
        }

        values.push(userId);

        await db.query(
            `INSERT INTO user_statuses (user_id, ${fields.map(f => f.split('=')[0]).join(', ')})
             VALUES ($${index}, ${fields.map((_, i) => `$${i + 1}`).join(', ')})
             ON CONFLICT (user_id) 
             DO UPDATE SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP`,
            values
        );

        res.json({ message: 'Status updated successfully' });
    } catch (error) {
        console.error('Error updating status:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Получение информации о другом пользователе
const getUserProfile = async (req, res) => {
    try {
        const userId = req.params.userId;

        const result = await db.query(
            `SELECT id, username, display_name, email, birth_date 
             FROM users 
             WHERE id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching user profile:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Получение статуса другого пользователя
const getUserStatus = async (req, res) => {
    try {
        const userId = req.params.userId;

        const result = await db.query(
            `SELECT status, text_status, description, updated_at 
             FROM user_statuses 
             WHERE user_id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Status not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching user status:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { 
    getMeProfile
    , patchMeProfile
    , deleteMeProfile
    , getSessions
    , terminateSession
    , terminateAllSession
    , changePassword
    , getStatus
    , updateStatus
    , getUserProfile
    , getUserStatus
}