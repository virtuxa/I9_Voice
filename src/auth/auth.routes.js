const express = require( 'express' );
const { authenticateToken } = require('../utils/auth.middleware');
const {
    register
    , login
    , logout
    , refreshToken
} = require( './auth.controller' );

// /auth
const router = express.Router();

// ------------------------------------------------------------------- //
// Аутентификация

router.post( '/register', register ); // Регистрация пользователя
router.post( '/login', login ); // Авторизация пользователя
router.post( '/refresh', refreshToken ); // Обновление токенов
router.post( '/logout', logout ); // Выход из профиля

// ------------------------------------------------------------------- //

module.exports = router;