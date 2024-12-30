const chatService = require('./chats.service');

// Получение списка чатов пользователя
const getMyChats = async (req, res) => {
    try {
        const userId = req.user.userId;
        const chats = await chatService.getMyChats(userId);

        res.json({
            status: 0,
            data: chats
        });
    } catch (error) {
        res.status(500).json({
            status: 1,
            error: 'Server error: ' + error.message
        });
    }
};

// Создание нового чата
const createChat = async (req, res) => {
    try {
        const userId = req.user.userId;
        const chat = await chatService.createChat(userId, req.body);

        res.status(201).json({
            status: 0,
            data: chat
        });
    } catch (error) {
        res.status(400).json({
            status: 1,
            error: 'Server error: ' + error.message
        });
    }
};

// Получение информации о чате
const getChatById = async (req, res) => {
    try {
        const { chatId } = req.params;
        const chat = await chatService.getChatById(chatId);

        res.json({
            status: 0,
            data: chat
        });
    } catch (error) {
        res.status(404).json({
            status: 1,
            error: 'Server error: ' + error.message
        });
    }
};

// Обновление информации о чате
const updateChat = async (req, res) => {
    try {
        const { chatId } = req.params;
        const chat = await chatService.updateChat(chatId, req.body);

        res.json({
            status: 0,
            data: chat
        });
    } catch (error) {
        res.status(404).json({
            status: 1,
            error: 'Server error: ' + error.message
        });
    }
};

// Удаление чата
const deleteChat = async (req, res) => {
    try {
        const { chatId } = req.params;
        await chatService.deleteChat(chatId);

        res.json({
            status: 0,
            message: 'Chat deleted successfully'
        });
    } catch (error) {
        res.status(404).json({
            status: 1,
            error: 'Server error: ' + error.message
        });
    }
};

// Получение списка участников чата
const getChatMembers = async (req, res) => {
    try {
        const { chatId } = req.params;
        const members = await chatService.getChatMembers(chatId);

        res.json({
            status: 0,
            data: members
        });
    } catch (error) {
        res.status(500).json({
            status: 1,
            error: 'Server error: ' + error.message
        });
    }
};

// Добавление участника в чат
const addChatMember = async (req, res) => {
    try {
        const { chatId } = req.params;
        const { userId } = req.body;
        const member = await chatService.addChatMember(chatId, userId);

        res.status(201).json({
            status: 0,
            data: member
        });
    } catch (error) {
        res.status(400).json({
            status: 1,
            error: 'Server error: ' + error.message
        });
    }
};

// Удаление участника из чата
const removeChatMember = async (req, res) => {
    try {
        const { chatId, userId } = req.params;
        await chatService.removeChatMember(chatId, userId);

        res.json({
            status: 0,
            message: 'Member removed successfully'
        });
    } catch (error) {
        res.status(404).json({
            status: 1,
            error: 'Server error: ' + error.message
        });
    }
};

// Получение сообщений чата
const getChatMessages = async (req, res) => {
    try {
        const { chatId } = req.params;
        const messages = await chatService.getChatMessages(chatId);

        res.json({
            status: 0,
            data: messages
        });
    } catch (error) {
        res.status(500).json({
            status: 1,
            error: 'Server error: ' + error.message
        });
    }
};

// Отправка сообщения
const sendMessage = async (req, res) => {
    try {
        const { chatId } = req.params;
        const userId = req.user.userId;
        const message = await chatService.sendMessage(chatId, userId, req.body);

        res.status(201).json({
            status: 0,
            data: message
        });
    } catch (error) {
        res.status(400).json({
            status: 1,
            error: 'Server error: ' + error.message
        });
    }
};

// Редактирование сообщения
const editMessage = async (req, res) => {
    try {
        const { chatId, messageId } = req.params;
        const message = await chatService.editMessage(chatId, messageId, req.body);

        res.json({
            status: 0,
            data: message
        });
    } catch (error) {
        res.status(404).json({
            status: 1,
            error: 'Server error: ' + error.message
        });
    }
};

// Удаление сообщения
const deleteMessage = async (req, res) => {
    try {
        const { chatId, messageId } = req.params;
        await chatService.deleteMessage(chatId, messageId);

        res.json({
            status: 0,
            message: 'Message deleted successfully'
        });
    } catch (error) {
        res.status(404).json({
            status: 1,
            error: 'Server error: ' + error.message
        });
    }
};

module.exports = {
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
};