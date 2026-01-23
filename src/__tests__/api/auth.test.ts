import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';

const buildInitData = (botToken: string, authDate: number) => {
  const params = new URLSearchParams({
    user: JSON.stringify({
      id: 123,
      first_name: 'Dev',
      last_name: 'User',
      username: 'devuser',
    }),
    auth_date: authDate.toString(),
  });

  const dataCheckArray: string[] = [];
  Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([key, value]) => {
      dataCheckArray.push(`${key}=${value}`);
    });

  const dataCheckString = dataCheckArray.join('\n');
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  params.append('hash', hash);
  return params.toString();
};

describe('Auth flows', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.NODE_ENV = 'development';
    process.env.DEV_AUTH_JWT_SECRET = 'dev-secret';
    process.env.DEV_AUTH_TTL_SECONDS = '3600';
    process.env.BOT_TOKEN = '';
    process.env.TELEGRAM_AUTH_MAX_AGE_SECONDS = '86400';
    process.env.DEV_AUTH_USERS = JSON.stringify([
      { login: 'dev', password: 'pass', userId: 101, role: 'admin' },
    ]);
  });

  it('dev login ok', async () => {
    const { AuthController } = await import('../../api/controllers/auth.controller');
    const { UserService } = await import('../../services/UserService');
    const { verifyDevToken } = await import('../../utils/dev-auth.util');

    jest.spyOn(UserService.prototype, 'getOrCreateDevUser').mockResolvedValue({
      _id: 'user-id',
      telegramId: 101,
      username: 'dev',
      firstName: 'Dev',
      lastName: 'User',
      balance: 0,
      reservedBalance: 0,
    } as any);

    const controller = new AuthController();
    const req = { body: { login: 'dev', password: 'pass' } } as Request;
    const res = { json: jest.fn() } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await controller.devLogin(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalled();
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    const tokenPayload = verifyDevToken(payload.token);
    expect(tokenPayload?.login).toBe('dev');
  });

  it('dev login wrong password', async () => {
    const { AuthController } = await import('../../api/controllers/auth.controller');
    const { UnauthorizedError } = await import('../../utils/errors');

    const controller = new AuthController();
    const req = { body: { login: 'dev', password: 'wrong' } } as Request;
    const res = { json: jest.fn() } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await controller.devLogin(req, res, next);

    expect(next).toHaveBeenCalled();
    const error = (next as jest.Mock).mock.calls[0][0];
    expect(error).toBeInstanceOf(UnauthorizedError);
  });

  it('rejects old telegram initData', async () => {
    process.env.BOT_TOKEN = 'token';
    process.env.TELEGRAM_AUTH_MAX_AGE_SECONDS = '60';
    jest.resetModules();
    const { validateTelegramInitData } = await import('../../utils/telegram.util');

    const authDate = Math.floor(Date.now() / 1000) - 120;
    const initData = buildInitData('token', authDate);
    const user = validateTelegramInitData(initData);
    expect(user).toBeNull();
  });

  it('prioritizes bearer over initData', async () => {
    const { authMiddleware } = await import('../../api/middlewares/auth.middleware');
    const { UserService } = await import('../../services/UserService');
    const { issueDevToken } = await import('../../utils/dev-auth.util');

    jest.spyOn(UserService.prototype, 'getUserById').mockResolvedValue({
      _id: 'user-id',
      telegramId: 101,
      username: 'dev',
    } as any);
    const getOrCreateSpy = jest
      .spyOn(UserService.prototype, 'getOrCreateUser')
      .mockResolvedValue({} as any);

    const token = issueDevToken({ sub: 'user-id', login: 'dev', role: 'admin' });
    const req: Partial<Request> = {
      headers: {
        authorization: `Bearer ${token}`,
        'x-telegram-init-data': 'invalid',
      },
    };
    const res = {} as Response;
    const next = jest.fn() as NextFunction;

    await authMiddleware(req as Request, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(getOrCreateSpy).not.toHaveBeenCalled();
    expect(req.user?.login).toBe('dev');
  });
});
