import Joi from 'joi';

export const devLoginSchema = Joi.object({
  login: Joi.string().min(1).required(),
  password: Joi.string().min(1).required(),
});
