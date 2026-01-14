import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validation.middleware';
import { topUpBalanceSchema } from '../validators/user.validator';

const router = Router();
const userController = new UserController();

router.get('/me', authMiddleware, userController.getMe);

router.post(
  '/balance/topup',
  authMiddleware,
  validateRequest(topUpBalanceSchema),
  userController.topUpBalance
);

export default router;
