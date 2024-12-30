const friendService = require('./friends.service');

// Функция получения списка друзей пользователя
const myFriendList = async (req, res) => {
    try {
        const userId = req.user.userId;
        const friends = await friendService.getMyFriends(userId);

        res.json({
            status: 0,
            message: 'Friend list retrieved successfully',
            data: friends
        });
    } catch (error) {
        console.error('Error fetching friend list:', error.message);
        res.status(500).json({
            status: 1,
            error: 'Server error: ' + error.message
        });
    }
};

// Функция добавления в друзья
const addFriend = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { friendId } = req.body;
        
        const friendship = await friendService.addFriend(userId, friendId);

        res.status(201).json({ 
            status: 0,
            message: 'Friend request sent successfully'
        });
    } catch (error) {
        console.error('Error sending friend request:', error.message);
        res.status(500).json({ 
            status: 1,
            error: 'Server error: ' + error.message
        });
    }
};

// Функция ответа на запрос
const ansRequest = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { friendshipId } = req.params;
        const { action } = req.body;

        const { updatedRequest } = await friendService.answerRequest(friendshipId, userId, action);

        res.json({ 
            status: 0,
            message: `Friend request ${updatedRequest.status}`
        });
    } catch (error) {
        console.error('Error responding to friend request:', error.message);
        res.status(500).json({ 
            status: 1,
            error: 'Server error: ' + error.message
        });
    }
};

// Функция удаления друга
const deleteFriend = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { friendId } = req.params;

        await friendService.deleteFriend(userId, friendId);

        res.json({ 
            status: 0,
            message: 'Friend removed successfully' 
        });
    } catch (error) {
        console.error('Error removing friend:', error.message);
        res.status(500).json({ 
            status: 1,
            error: 'Server error: ' + error.message
        });
    }
};

// Функция получения списка друзей другого пользователя
const userFriendList = async (req, res) => {
    try {
        const { userId } = req.params;
        const friends = await friendService.getUserFriends(userId);

        res.json({
            status: 0,
            message: 'Friend list retrieved successfully',
            data: friends
        });
    } catch (error) {
        console.error('Error fetching user friend list:', error.message);
        res.status(500).json({ 
            status: 1,
            error: 'Server error: ' + error.message
        });
    }
};

module.exports = { 
    myFriendList,
    addFriend,
    ansRequest,
    deleteFriend,
    userFriendList
};