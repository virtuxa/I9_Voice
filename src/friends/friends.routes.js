const express = require( 'express' );
const { authenticateToken } = require('../utils/auth.middleware');
const {
    myFriendList
    , addFriend
    , ansRequest
    , deleteFriend
    , userFriendList
} = require( './friends.controller' );

// /friends
const router = express.Router();

// ------------------------------------------------------------------- //
// Друзья

router.get('/', authenticateToken, myFriendList); // Получение списка друзей
router.post('/', authenticateToken, addFriend); // Отправка запроса на дружбу
router.patch('/:requestId', authenticateToken, ansRequest); // Принятие/отклонение запроса на дружбу
router.delete('/:userId', authenticateToken, deleteFriend); // Удаление друга

// ------------------------------------------------------------------- //
// Другие пользователи

router.get('/:userId', authenticateToken, userFriendList); // Получение списка друзей пользователя

// ------------------------------------------------------------------- //

module.exports = router;