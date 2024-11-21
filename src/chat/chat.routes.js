const express = require('express');
const { authenticateToken } = require('../utils/auth.middleware');
const {
    createChat
    , addMember
    , sendMessage
    , getMessages
    , deleteChat
    , editMessage
    , deleteMessage
} = require('./chat.controller');

const router = express.Router();

// Чаты
router.post('/', authenticateToken, createChat); // Создать чат
router.delete('/:chatId', authenticateToken, deleteChat); // Удалить чат

// Участники
router.post('/members', authenticateToken, addMember); // Добавить участника

// Сообщения
router.post('/messages', authenticateToken, sendMessage); // Отправить сообщение
router.get('/:chatId/messages', authenticateToken, getMessages); // Получить сообщения
router.put('/messages/:messageId', authenticateToken, editMessage); // Редактировать сообщение
router.delete('/messages/:messageId', authenticateToken, deleteMessage); // Удалить сообщение

module.exports = router;