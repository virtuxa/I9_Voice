const express = require( 'express' );
const {
    register
    , login
    , logout
    , refreshToken
} = require( './auth.controller' );

// /auth
const router = express.Router();

// Аутенфикация пользователя
router.post( '/register', register );
router.post( '/login', login );
router.post( '/logout', logout );

// Взаимодействие с токенами
router.post( '/refresh', refreshToken );

module.exports = router;