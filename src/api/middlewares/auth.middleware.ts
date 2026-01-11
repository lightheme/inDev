import { Response, Request, NextFunction } from "express";
import { validateTelegramInitData } from "../../utils/telegram.util";
import { UserService } from '../../services/UserService';
import { AppError } from '../../utils/errors';

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string,
                telegramId: string;
                username?: string;
            };
        }
    }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const initData = req.headers['x-telegram-init-data'] as string;

        if(!initData) {
            throw AppError('Telegram init data is required', 401);
        }

        const telegramUser = validateTelegramInitData(initData);

        if(!telegramUser) {
            throw AppError('Invalid Telegram init data', 401);
        }

        const userService;
    }
}
