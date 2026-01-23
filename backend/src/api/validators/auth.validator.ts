import Joi from 'joi';

export const devLoginSchema = Joi.object({
  login: Joi.string().min(1).required(),
  password: Joi.string().min(1).required(),
});

export const loginSchema = Joi.object({
  login: Joi.string().min(1),
  email: Joi.string().email(),
  password: Joi.string().min(6).required(),
}).or('login', 'email');
