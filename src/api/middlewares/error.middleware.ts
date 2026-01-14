import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../utils/errors';
import { logger } from '../../utils/logger';

export const errorMiddleware = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error('Error:', {
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method
  });

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      error: error.message
    });
  }

  return res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
};
