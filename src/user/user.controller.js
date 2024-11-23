const { pool } = require('../database/db.js');

// 

module.exports = { 
    getMeProfile
    , patchMeProfile
    , deleteMeProfile
    , getSessions
    , terminateSession
    , changePassword
    , getStatus
    , updateStatus
    , getUserProfile
    , getUserStatus
}