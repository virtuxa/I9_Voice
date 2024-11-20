const express = require('express');
const {
    getUserProfile
    , updateUserProfile
    , deleteUserProfile
    , getUserSessions
    , terminateSession
    , changePassword
    , updateStatus
    , getStatus
} = require('./user.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

// /user
const router = express.Router();

// Профиль пользователя
router.get('/profile', authenticateToken, getUserProfile);
router.put('/profile', authenticateToken, updateUserProfile);
router.delete('/profile', authenticateToken, deleteUserProfile);

// Сессии пользователя
router.get('/sessions', authenticateToken, getUserSessions);
router.delete('/sessions/:sessionId', authenticateToken, terminateSession);

// Смена пароля
router.post('/change-password', authenticateToken, changePassword);

// Смена статуса
router.put('/status', authenticateToken, updateStatus);
router.get('/:id/status', authenticateToken, getStatus);

module.exports = router;
