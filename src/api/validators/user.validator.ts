import Joi from 'joi';

export const topUpBalanceSchema = Joi.object({
  amount: Joi.number().min(1).max(1000000).required()
});
