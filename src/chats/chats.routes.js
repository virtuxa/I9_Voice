const express = require( 'express' );
const { authenticateToken } = require('../middlewares/auth.middleware');
const { checkChatAccess } = require('../middlewares/chats.middleware');
const {
    getMyChats
    , createChat
    , getChatById
    , updateChat
    , deleteChat
    , getChatMembers
    , addChatMember
    , removeChatMember
    , getChatMessages
    , sendMessage
    , editMessage
    , deleteMessage
} = require( './chats.controller' );

// /chats
const router = express.Router();

// ------------------------------------------------------------------- //

// Чаты
router.get('/', authenticateToken, getMyChats); // Получение списка чатов пользователя
router.post('/', authenticateToken, createChat); // Создание нового чата
router.get('/:chatId', authenticateToken, checkChatAccess, getChatById); // Получение информации о чате
router.patch('/:chatId', authenticateToken, checkChatAccess, updateChat); // Обновление информации о чате
router.delete('/:chatId', authenticateToken, checkChatAccess, deleteChat); // Удаление чата

// Участники чата
router.get('/:chatId/members', authenticateToken, checkChatAccess, getChatMembers); // Получение списка участников
router.post('/:chatId/members', authenticateToken, checkChatAccess, addChatMember); // Добавление участника
router.delete('/:chatId/members/:userId', authenticateToken, checkChatAccess, removeChatMember); // Удаление участника

// Сообщения
router.get('/:chatId/messages', authenticateToken, checkChatAccess, getChatMessages); // Получение сообщений чата
router.post('/:chatId/messages', authenticateToken, checkChatAccess, sendMessage); // Отправка сообщения
router.patch('/:chatId/messages/:messageId', authenticateToken, checkChatAccess, editMessage); // Редактирование сообщения
router.delete('/:chatId/messages/:messageId', authenticateToken, checkChatAccess, deleteMessage); // Удаление сообщения


// ------------------------------------------------------------------- //

module.exports = router;