import Joi from "joi";
import { AuctionStatus, RoundStatus } from "../../types/auction.types";

const roundSchema = Joi.object({
  roundNumber: Joi.number().integer().min(1).required(),
  giftsToDistribute: Joi.number().integer().min(1).required(),
  startTime: Joi.date().required(),
  endTime: Joi.date().required(),
  extendedTime: Joi.number().integer().min(0).default(0),
  status: Joi.string()
    .valid(...Object.values(RoundStatus))
    .default(RoundStatus.PENDING),
  winnerIds: Joi.array().items(Joi.string()).default([])
});

export const createAuctionSchema = Joi.object({
    title: Joi.string().min(3).max(100).required(),
    totalGifts: Joi.number().integer().min(1).max(1_000_000).required(),
    giftsPerRound: Joi.array().items(Joi.number()).min(1).required(),
    roundDurations: Joi.array().items(Joi.number()).min(1).required()
});

export const placeBidSchema = Joi.object({
    amount: Joi.number().min(1).required()
});
