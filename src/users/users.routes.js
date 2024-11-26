const express = require( 'express' );
const { authenticateToken } = require('../middlewares/auth.middleware');
const {
    getCurrentUserProfile
    , patchProfile
    , deleteProfile
    , getUserDetails
    , patchUserDetails
    , deleteUserDetails
    , getUserProfile
    , getUserDetailsById
    , changePassword
} = require( './users.controller' );

// /user
const router = express.Router();

// ------------------------------------------------------------------- //
// Управление профилем

// Основной профиль
router.get('/', authenticateToken, getCurrentUserProfile); // Получение информации о текущем пользователе
router.patch('/', authenticateToken, patchProfile); // Обновление профиля текущего пользователя
router.delete('/', authenticateToken, deleteProfile); // Удаление текущего профиля

// Пользовательские данные
router.get('/details', authenticateToken, getUserDetails); // Получение деталей текущего профиля
router.patch('/details', authenticateToken, patchUserDetails); // Обновление деталей текущего профиля
router.delete('/details', authenticateToken, deleteUserDetails); // Удаление деталей текущего профиля

// Просмотр других пользователей
router.get('/:user_id', authenticateToken, getUserProfile); // Получение информации о другом пользователе
router.get('/:user_id/details', authenticateToken, getUserDetailsById); // Получение деталей другого пользователя

// ------------------------------------------------------------------- //
// Безопасность

router.post('/password', authenticateToken, changePassword); // Обновить пароль текущего пользователя

// ------------------------------------------------------------------- //

module.exports = router;