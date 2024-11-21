const express = require('express');
const { authenticateToken } = require('../utils/auth.middleware');
const {
    getUserProfile
    , updateUserProfile
    , deleteUserProfile
    , getUserSessions
    , terminateSession
    , changePassword
    , updateStatus
    , getStatus
    , addFriend
    , acceptFriend
    , rejectFriend
    , deleteFriend
    , getFriends
    , getFriendRequests
} = require('./user.controller');

// /user
const router = express.Router();

// Профиль пользователя
router.get('/profile', authenticateToken, getUserProfile); // Получить информацию о пользователе
router.put('/profile', authenticateToken, updateUserProfile); // Редактировать информацию о пользователе
router.delete('/profile', authenticateToken, deleteUserProfile); // Удаление профиля пользователя

// Сессии пользователя
router.get('/sessions', authenticateToken, getUserSessions); // Получить активные сессии
router.delete('/sessions/:sessionId', authenticateToken, terminateSession); // Удаление сессии

// Безопасность
router.post('/change-password', authenticateToken, changePassword); // Изменить пароль

// Смена статуса
router.get('/:id/status', authenticateToken, getStatus); // Получить статус пользователя
router.put('/status', authenticateToken, updateStatus); // Обновить статус пользователя

// Друзья
router.post('/friends/:friendId', authenticateToken, addFriend); // Отправить запрос дружбы
router.put('/friends/:friendId/accept', authenticateToken, acceptFriend); // Принять запрос
router.put('/friends/:friendId/reject', authenticateToken, rejectFriend); // Отклонить запрос
router.get('/friends', authenticateToken, getFriends); // Получить список друзей
router.delete('/friends/:friendId', authenticateToken, deleteFriend); // Удалить из друзей
router.get('/friends/requests', authenticateToken, getFriendRequests); // Получение списка запросов

module.exports = router;