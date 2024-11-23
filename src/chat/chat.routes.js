const express = require( 'express' );
const { authenticateToken } = require('../utils/auth.middleware');
const {
    createChat
    , chatList
    , chatEdit
    , deleteChat
    , chatMembers
    , addChatMember
    , deleteChatMember
    , sendMessage
    , getMessages
    , editMessage
    , deleteMessage
} = require( './chat.controller' );

// /chat
const router = express.Router();

// ------------------------------------------------------------------- //
// Чат

router.post('/', authenticateToken, createChat); // Создание чата
router.get('/', authenticateToken, chatList); // Получение списка чатов
router.patch('/:chatId', authenticateToken, chatEdit); // Изменение настроек чата
router.delete('/:chatId', authenticateToken, deleteChat); // Удаление чата

// ------------------------------------------------------------------- //
// Участники

router.get('/:chatId/users', authenticateToken, chatMembers); // Получение списка участников чата
router.post('/:chatId/users/:userId', authenticateToken, addChatMember); // Добавить пользователя в чат
router.delete('/:chatId/users/:userId', authenticateToken, deleteChatMember); // Удалить пользователя из чата

// ------------------------------------------------------------------- //
// Сообщения

router.post('/:chatId/messages', authenticateToken, sendMessage); // Отправить сообщение
router.get('/:chatId/messages', authenticateToken, getMessages); // Получить сообщения
router.put('/:chatId/messages/:messageId', authenticateToken, editMessage); // Редактировать сообщение
router.delete('/:chatId/messages/:messageId', authenticateToken, deleteMessage); // Удалить сообщение

// ------------------------------------------------------------------- //

module.exports = router;