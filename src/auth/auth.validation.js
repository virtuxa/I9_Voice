const Joi = require('joi');

const registerSchema = Joi.object({
    username: Joi.string().min(3).max(50).required(),
    display_name: Joi.string().min(1).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    birth_date: Joi.date().less('now').required(), // Дата должна быть в прошлом
});

exports.validateRegister = (req, res, next) => {
    const { error } = registerSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }
    next();
};