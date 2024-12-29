const cron = require('node-cron');
const db = require('../database/db'); // Утилита для работы с базой данных

// Очистка истёкших сессий
const scheduleSessionCleanup = () => {
    // Добавляем конфигурируемый интервал
    const CLEANUP_INTERVAL = process.env.TOKEN_CLEANUP_INTERVAL || '0 0 * * *';
    const TOKEN_EXPIRY_DAYS = process.env.TOKEN_EXPIRY_DAYS || 7;

    cron.schedule(CLEANUP_INTERVAL, async () => {
        try {
            // Добавляем метрики времени выполнения
            const startTime = Date.now();
            
            const result = await db.query(
                `DELETE FROM refresh_tokens
                 WHERE created_at < NOW() - INTERVAL '${TOKEN_EXPIRY_DAYS} days'`
            );

            const duration = Date.now() - startTime;
            
            // Улучшенное логирование
            console.log({
                event: 'session_cleanup',
                deletedCount: result.rowCount,
                durationMs: duration,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            // Более детальное логирование ошибок
            console.error({
                event: 'session_cleanup_error',
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
        }
    });
};

module.exports = scheduleSessionCleanup;