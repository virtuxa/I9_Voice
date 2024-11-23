const { pool } = require('../database/db.js');

// 

module.exports = { 
    createServer
    , serverList
    , serverInfo
    , serverEdit
    , deleteServer
    , inviteUser
    , joinServer
    , roleAdd
    , roleList
    , roleEdit
    , deleteRole
    , membersList
    , deleteMember
    , addMemberRole
    , deleteMemberRole
    , createGroup
    , groupList
    , groupInfo
    , groupEdit
    , deleteGroup
    , createCategory
    , categoryList
    , categoryInfo
    , categoryEdit
    , deleteCategory
    , addChannelToCategory
    , deleteChannelInCategory
    , createChannel
    , channelList
    , channelInfo
    , channelEdit
    , deleteChannel
}