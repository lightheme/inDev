import { Response, Request, NextFunction } from "express";
import Joi from "joi";
import { AppError } from "../../utils/errors";

export const validateRequest = (schema: Joi.ObjectSchema) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const { error } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true,
            convert: true
        });

        if(error) {
            const errorMessage = error.details
                .map(detail => detail.message)
                .join(', ');

            throw new AppError(errorMessage, 400);
        }

        next();
    };
};
