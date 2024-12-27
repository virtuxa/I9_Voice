const db = require('../database/db');
const bcrypt = require('bcryptjs');

// Общая функция для получения профиля
const getUserProfileById = async (userId, includePrivateData = false) => {
    const fields = [
        'user_id', 'user_name', 'display_name', 'email', 'birth_date'
    ];
    
    if (includePrivateData) {
        fields.push('phone_number', 'created_at');
    }

    const result = await db.query(
        `SELECT ${fields.join(', ')} FROM users WHERE user_id = $1`,
        [userId]
    );

    return result.rows[0];
};

// Получение информации о текущем пользователе
const getCurrentUserProfile = async (req, res) => {
    try {
        const user = await getUserProfileById(req.user.userId, true);
        
        if (!user) {
            return res.status(404).json({
                status: 1,
                error: 'User not found'
            });
        }

        res.json({
            status: 0,
            data: user
        });
    } catch (error) {
        console.error('Error fetching user profile:', error.message);
        res.status(500).json({
            status: 1,
            error: 'Server error'
        });
    }
};

// Обновление профиля текущего пользователя
const patchProfile = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { user_name, display_name, phone_number } = req.body;

        const updates = [];
        const values = [];
        let index = 1;

        if (user_name) {
            updates.push(`user_name = $${index++}`);
            values.push(user_name);
        }
        if (display_name) {
            updates.push(`display_name = $${index++}`);
            values.push(display_name);
        }
        if (phone_number) {
            updates.push(`phone_number = $${index++}`);
            values.push(phone_number);
        }

        if (updates.length === 0) {
            return res.status(400).json({ 
                status: 1,
                error: 'No data to update' });
        }

        values.push(userId);

        const query = `
            UPDATE users 
            SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
            WHERE user_id = $${index}
        `;

        await db.query(query, values);

        res.json({
            status: 0,
            message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Error updating user profile:', error.message, error.stack);
        res.status(500).json({
            status: 1,
            error: 'Server error'
        });
    }
};

// Удаление текущего профиля
const deleteProfile = async (req, res) => {
    try {
        const userId = req.user.userId;

        await db.query(`DELETE FROM users WHERE user_id = $1`, [userId]);

        res.json({ 
            status: 0,
            message: 'Profile deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting user profile:', error.message);
        res.status(500).json({
            status: 1,
            error: 'Server error'
        });
    }
};

// Получение деталей текущего профиля
const getUserDetails = async (req, res) => {
    try {
        const userId = req.user.userId;

        const result = await db.query(
            `SELECT avatar_url, status, description, updated_at 
             FROM user_profiles WHERE user_id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                status: 1,
                error: 'Details not found' });
        }

        res.json({
            status: 0,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching user details:', error.message);
        res.status(500).json({
            status: 1,
            error: 'Server error'
        });
    }
};

// Обновление деталей текущего профиля
const patchUserDetails = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { avatar_url, status, description } = req.body;

        const fields = [];
        const values = [];
        let index = 1;

        if (avatar_url) {
            fields.push(`avatar_url = $${index++}`);
            values.push(avatar_url);
        }
        if (status) {
            fields.push(`status = $${index++}`);
            values.push(status);
        }
        if (description) {
            fields.push(`description = $${index++}`);
            values.push(description);
        }

        if (fields.length === 0) {
            return res.status(400).json({
                status: 1,
                error: 'No fields provided for update'
            });
        }

        values.push(userId);

        await db.query(
            `INSERT INTO user_profiles (user_id, ${fields.map(f => f.split('=')[0]).join(', ')})
             VALUES ($${index}, ${fields.map((_, i) => `$${i + 1}`).join(', ')})
             ON CONFLICT (user_id) 
             DO UPDATE SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP`,
            values
        );

        res.json({
            status: 0,
            message: 'Details updated successfully' });
    } catch (error) {
        console.error('Error updating user details:', error.message);
        res.status(500).json({ 
            status: 1,
            error: 'Server error' });
    }
};

// Удаление деталей текущего профиля (установка значений в NULL)
const deleteUserDetails = async (req, res) => {
    try {
        const userId = req.user.userId;

        // Обновляем запись, устанавливая все поля в NULL
        await db.query(
            `UPDATE user_profiles 
             SET avatar_url = NULL, 
                 status = NULL, 
                 description = NULL, 
                 updated_at = CURRENT_TIMESTAMP
             WHERE user_id = $1`,
            [userId]
        );

        res.json({ 
            status: 0,
            message: 'Details set to NULL successfully'
        });
    } catch (error) {
        console.error('Error setting user details to NULL:', error.message);
        res.status(500).json({
            status: 1,
            error: 'Server error'
        });
    }
};

// Получение информации о другом пользователе
const getUserProfile = async (req, res) => {
    try {
        const user = await getUserProfileById(req.params.user_id, false);
        
        if (!user) {
            return res.status(404).json({
                status: 1,
                error: 'User not found'
            });
        }

        res.json({
            status: 0,
            data: user
        });
    } catch (error) {
        console.error('Error fetching another user profile:', error.message);
        res.status(500).json({
            status: 1,
            error: 'Server error'
        });
    }
};

// Получение деталей другого пользователя
const getUserDetailsById = async (req, res) => {
    try {
        const userId = req.params.user_id; // ID пользователя из параметров маршрута

        const result = await db.query(
            `SELECT avatar_url, status, description, updated_at 
             FROM user_profiles WHERE user_id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                status: 1,
                error: 'Details not found for the user'
            });
        }

        res.json({
            status: 0,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching user details by ID:', error.message);
        res.status(500).json({
            status: 1,
            error: 'Server error'
        });
    }
};

// Обновить пароль текущего пользователя
const changePassword = async (req, res) => {
    try {
        const userId = req.user.userId; // ID текущего пользователя из токена
        const { currentPassword, newPassword } = req.body; // Текущий и новый пароли из тела запроса

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ 
                status: 1,
                error: 'Both current and new passwords are required'
            });
        }

        // Получаем текущий хэш пароля из базы данных
        const result = await db.query(
            `SELECT password FROM users WHERE user_id = $1`,
            [userId]
        );

        const user = result.rows[0];
        if (!user) {
            return res.status(404).json({
                status: 1,
                error: 'User not found'
            });
        }

        // Проверяем текущий пароль
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ 
                status: 1,
                error: 'Current password is incorrect'
            });
        }

        // Хэшируем новый пароль
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Обновляем пароль в базе данных
        await db.query(
            `UPDATE users SET password = $1 WHERE user_id = $2`,
            [hashedPassword, userId]
        );

        res.json({
            status: 0,
            message: 'Password updated successfully'
        });
    } catch (error) {
        console.error('Error changing password:', error.message);
        res.status(500).json({
            status: 1,
            error: 'Server error'
        });
    }
};


module.exports = {
    getCurrentUserProfile
    , patchProfile
    , deleteProfile
    , getUserDetails
    , patchUserDetails
    , deleteUserDetails
    , getUserProfile
    , getUserDetailsById
    , changePassword
}