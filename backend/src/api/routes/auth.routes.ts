import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validateRequest } from '../middlewares/validation.middleware';
import { devLoginSchema, loginSchema } from '../validators/auth.validator';

const router = Router();
const authController = new AuthController();

router.post('/auth/dev/login', validateRequest(devLoginSchema), authController.devLogin);
router.post('/auth/login', validateRequest(loginSchema), authController.login);

export default router;
