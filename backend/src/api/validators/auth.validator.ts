import Joi from 'joi';

export const loginSchema = Joi.object({
  login: Joi.string().min(1).required(),
  password: Joi.string().min(6).required(),
});
