import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validateRequest } from '../middlewares/validation.middleware';
import { devLoginSchema } from '../validators/auth.validator';

const router = Router();
const authController = new AuthController();

router.post('/auth/dev/login', validateRequest(devLoginSchema), authController.devLogin);

export default router;
