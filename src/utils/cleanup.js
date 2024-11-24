const cron = require('node-cron');
const db = require('../database/db'); // Утилита для работы с базой данных

// Очистка истёкших сессий
const scheduleSessionCleanup = () => {
    cron.schedule('0 0 * * *', async () => { // Запуск каждый день в полночь
        try {
            const result = await db.query(
                `DELETE FROM sessions 
                 WHERE id IN (
                     SELECT id FROM sessions 
                     WHERE refresh_token NOT IN (
                         SELECT refresh_token FROM refresh_tokens
                     )
                 )`
            );
            console.log(`Очищено сессий: ${result.rowCount}`);
        } catch (error) {
            console.error('Ошибка при очистке устаревших сессий:', error.message);
        }
    });
};

module.exports = scheduleSessionCleanup;
