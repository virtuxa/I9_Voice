const express = require( 'express' );
const { register, login, logout } = require( './auth.controller' )

const router = express.Router();

// /auth
router.post('/register', register)
router.post('/login', login)
router.post('/logout', logout)

module.exports = router;