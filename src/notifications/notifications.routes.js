const express = require( 'express' );
const { authenticateToken } = require('../middlewares/auth.middleware');
const {
    createNotification
    , getAllNotifications
    , markAsRead
    , deleteNotification
} = require( './notifications.controller' );

// /notifications
const router = express.Router();

// ------------------------------------------------------------------- //
// Управление профилем

router.post('/', authenticateToken, createNotification); // Создать уведомление
router.get('/', authenticateToken, getAllNotifications); // Получить все уведомления пользователя
router.patch('/:id/read', authenticateToken, markAsRead); // Отметить уведомление как «прочитано»
router.delete('/:id', authenticateToken, deleteNotification); // Удалить уведомление

// ------------------------------------------------------------------- //

module.exports = router;