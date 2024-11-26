const Joi = require('joi');

// Схема валидации регистрации
const registerSchema = Joi.object({
    user_name: Joi.string().min(3).max(50).required(), // Имя пользователя
    display_name: Joi.string().min(1).max(100).required(), // Отображаемое имя
    email: Joi.string().email().required(), // Email
    phone_number: Joi.string()
        .pattern(/^\+?[1-9]\d{1,14}$/)
        .required()
        .messages({
            'string.pattern.base': 'Phone number must be a valid international number.',
        }), // Номер телефона
    password: Joi.string().min(6).required(), // Пароль
    birth_date: Joi.date().less('now').required(), // Дата рождения должна быть в прошлом
});

// Middleware для проверки валидации
exports.validateRegister = (req, res, next) => {
    const { error } = registerSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }
    next();
};
