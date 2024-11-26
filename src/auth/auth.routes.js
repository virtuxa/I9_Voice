const express = require( 'express' );
const { validateRegister } = require('./auth.validation');
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
router.post( '/logout', logout ); // Выход из профиля
router.post( '/refresh', refreshToken ); // Обновление токенов

// ------------------------------------------------------------------- //

module.exports = router;