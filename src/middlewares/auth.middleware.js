const jwt = require('jsonwebtoken');

// Middleware для проверки токена
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization']; // Получаем заголовок Authorization
    const token = authHeader && authHeader.split(' ')[1]; // Извлекаем сам токен

    if (!token) {
        return res.status(401).json({ error: 'Access token is required' });
    }

    try {
        // Проверяем и декодируем токен
        const user = jwt.verify(token, process.env.JWT_SECRET);
        req.user = user; // Добавляем данные пользователя в req
        next(); // Передаём управление следующему middleware
    } catch (err) {
        console.error('Error verifying token:', err.message);
        res.status(403).json({ error: 'Invalid or expired token' });
    }
};

module.exports = {
    authenticateToken,
};
