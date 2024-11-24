const express = require( 'express' );
const { authenticateToken } = require('../middlewares/auth.middleware');
const {
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
} = require( './server.controller' );

// /server
const router = express.Router();

// ------------------------------------------------------------------- //
// Создание и управление

router.post('/', authenticateToken, createServer); // Создание сервера
router.get('/', authenticateToken, serverList); // Получение списка серверов, где пользователь является участником
router.get('/:serverId', authenticateToken, serverInfo); // Получение информации о сервере
router.patch('/:serverId', authenticateToken, serverEdit); // Изменение настроек сервера
router.delete('/:serverId', authenticateToken, deleteServer); // Удаление сервера
router.post('/:serverId/invite', authenticateToken, inviteUser); // Приглашение на сервер
router.post('/:serverId/join', authenticateToken, joinServer); // Вступление в сервер

// ------------------------------------------------------------------- //
// Роли

router.post('/:serverId/roles', authenticateToken, roleAdd); // Создание новой роли
router.get('/:serverId/roles', authenticateToken, roleList); // Получение списка ролей сервера
router.patch('/:serverId/roles/:roleId', authenticateToken, roleEdit); // Изменение роли
router.delete('/:serverId/roles/:roleId', authenticateToken, deleteRole); // Удаление роли

// ------------------------------------------------------------------- //
// Участники

router.get('/:serverId/users', authenticateToken, membersList); // Получение списка участников сервера
router.delete('/:serverId/users/:userId', authenticateToken, deleteMember); // Удаление пользователя с сервера
router.patch('/:serverId/users/:userId/roles/roleId', authenticateToken, addMemberRole); // Назначение роли пользователю
router.delete('/:serverId/users/:userId/roles/roleId', authenticateToken, deleteMemberRole); // Удаление роли у пользователя

// ------------------------------------------------------------------- //
// Группы

// Создание и управление
router.post('/:serverId/guilds', authenticateToken, createGroup); // Создание группы
router.get('/:serverId/guilds', authenticateToken, groupList); // Получение списка групп сервера
router.get('/:serverId/guilds/:guildId', authenticateToken, groupInfo); // Получение информации о группе
router.patch('/:serverId/guilds/:guildId', authenticateToken, groupEdit); // Изменение настроек группы
router.delete('/:serverId/guilds/:guildId', authenticateToken, deleteGroup); // Удаление группы

// ------------------------------------------------------------------- //
// Категории

// Создание и управление
router.post('/:serverId/categories', authenticateToken, createCategory); // Создание категории
router.get('/:serverId/categories', authenticateToken, categoryList); // Получение списка категорий сервера
router.get('/:serverId/categories/:categoriesId', authenticateToken, categoryInfo); // Получение информации о категории
router.patch('/:serverId/categories/:categoriesId', authenticateToken, categoryEdit); // Изменение настроек категории
router.delete('/:serverId/categories/:categoriesId', authenticateToken, deleteCategory); // Удаление категории
router.post('/:serverId/categories/:categoriesId/channels/:channelId', authenticateToken, addChannelToCategory); // Добавление канала в категорию
router.delete('/:serverId/categories/:categoriesId/channels/:channelId', authenticateToken, deleteChannelInCategory); // Удаление канала из категории

// ------------------------------------------------------------------- //
// Каналы

// Создание и управление
router.post('/:serverId/channels', authenticateToken, createChannel); // Создание канала
router.get('/:serverId/channels', authenticateToken, channelList); // Получение списка каналов сервера
router.get('/:serverId/channels/:channelId', authenticateToken, channelInfo); // Получение информации о канале
router.patch('/:serverId/channels/:channelId', authenticateToken, channelEdit); // Изменение настроек канала
router.delete('/:serverId/channels/:channelId', authenticateToken, deleteChannel); // Удаление канала

// ------------------------------------------------------------------- //

module.exports = router;