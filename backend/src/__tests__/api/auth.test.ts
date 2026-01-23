import type { Request, Response, NextFunction } from 'express';

describe('Auth flows', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.NODE_ENV = 'development';
    process.env.DEV_AUTH_JWT_SECRET = 'dev-secret';
    process.env.DEV_AUTH_TTL_SECONDS = '3600';
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

  it('authenticates with bearer token', async () => {
    const { authMiddleware } = await import('../../api/middlewares/auth.middleware');
    const { UserService } = await import('../../services/UserService');
    const { issueDevToken } = await import('../../utils/dev-auth.util');

    jest.spyOn(UserService.prototype, 'getUserById').mockResolvedValue({
      _id: 'user-id',
      telegramId: 101,
      username: 'dev',
    } as any);

    const token = issueDevToken({ sub: 'user-id', login: 'dev', role: 'admin' });
    const req: Partial<Request> = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    };
    const res = {} as Response;
    const next = jest.fn() as NextFunction;

    await authMiddleware(req as Request, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user?.login).toBe('dev');
  });
});
