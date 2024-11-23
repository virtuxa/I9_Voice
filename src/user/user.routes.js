const express = require( 'express' );
const { authenticateToken } = require('../utils/auth.middleware');
const {
    getMeProfile
    , patchMeProfile
    , deleteMeProfile
    , getSessions
    , terminateSession
    , changePassword
    , getStatus
    , updateStatus
    , getUserProfile
    , getUserStatus
} = require( './user.controller' );

// /user
const router = express.Router();

// ------------------------------------------------------------------- //
// Управление профилем

router.get('/', authenticateToken, getMeProfile); // Получение информации о пользователе
router.patch('/', authenticateToken, patchMeProfile); // Обновление профиля пользователя
router.delete('/', authenticateToken, deleteMeProfile); // Удаление профиля пользователя

// ------------------------------------------------------------------- //
// Сессии пользователя

router.get('/sessions', authenticateToken, getSessions); // Получить активные сессии
router.delete('/sessions/:sessionId', authenticateToken, terminateSession); // Удаление сессии

// ------------------------------------------------------------------- //
// Безопасность

router.post('/password', authenticateToken, changePassword); // Обновить пароль пользователя

// ------------------------------------------------------------------- //
// Статусы

router.get('/status', authenticateToken, getStatus); // Получить статус пользователя
router.patch('/status', authenticateToken, updateStatus); // Обновить статус пользователя

// ------------------------------------------------------------------- //
// Другие пользователи

router.get('/:userId/profile', authenticateToken, getUserProfile); // Получение информации о пользователе
router.get('/:userId/status', authenticateToken, getUserStatus); // Получить статус пользователя

// ------------------------------------------------------------------- //

module.exports = router;