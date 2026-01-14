import { Response, Request, NextFunction } from "express";
import { validataTelegramInitData } from "../../utils/telegram.util";
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

const userService = new UserService();

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const initData = req.headers['x-telegram-init-data'] as string;

        if(!initData) {
            throw new AppError('Telegram init data is required', 401);
        }

        const telegramUser = validataTelegramInitData(initData);

        if(!telegramUser) {
            throw new AppError('Invalid Telegram init data', 401);
        }
        
        const user = await userService.getOrCreateUser(telegramUser);

        req.user = {
            id: user._id.toString(),
            telegramId: user.telegramId.toString(),
            username: user.username
        };

        next();
    } catch(error) {
        next(error);
    }
};
