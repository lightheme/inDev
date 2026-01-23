import type { Request, Response, NextFunction } from 'express';

describe('Auth flows', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.NODE_ENV = 'development';
    process.env.AUTH_JWT_SECRET = 'test-secret';
    process.env.AUTH_JWT_TTL_SECONDS = '3600';
  });

  it('creates user and returns token on login', async () => {
    const { AuthController } = await import('../../api/controllers/auth.controller');
    const { UserRepository } = await import('../../repositories/UserRepository');
    const { verifyAuthToken } = await import('../../utils/auth.util');

    jest.spyOn(UserRepository.prototype, 'findByLogin').mockResolvedValue(null);
    jest.spyOn(UserRepository.prototype, 'create').mockResolvedValue({
      _id: 'user-id',
      login: 'dev',
      passwordHash: 'hashed',
      balance: 0,
      reservedBalance: 0,
    } as any);

    const controller = new AuthController();
    const req = { body: { login: 'dev', password: 'pass1234' } } as Request;
    const res = { json: jest.fn() } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await controller.login(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalled();
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    const tokenPayload = verifyAuthToken(payload.data.token);
    expect(tokenPayload?.login).toBe('dev');
  });

  it('rejects invalid password on login', async () => {
    const { AuthController } = await import('../../api/controllers/auth.controller');
    const { UnauthorizedError } = await import('../../utils/errors');
    const { UserRepository } = await import('../../repositories/UserRepository');
    const { hashPassword } = await import('../../utils/password.util');

    const passwordHash = await hashPassword('right-password');
    jest.spyOn(UserRepository.prototype, 'findByLogin').mockResolvedValue({
      _id: 'user-id',
      login: 'dev',
      passwordHash,
      balance: 0,
      reservedBalance: 0,
    } as any);

    const controller = new AuthController();
    const req = { body: { login: 'dev', password: 'wrong' } } as Request;
    const res = { json: jest.fn() } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await controller.login(req, res, next);

    expect(next).toHaveBeenCalled();
    const error = (next as jest.Mock).mock.calls[0][0];
    expect(error).toBeInstanceOf(UnauthorizedError);
  });

  it('authenticates with bearer token', async () => {
    const { authMiddleware } = await import('../../api/middlewares/auth.middleware');
    const { UserService } = await import('../../services/UserService');
    const { issueAuthToken } = await import('../../utils/auth.util');

    jest.spyOn(UserService.prototype, 'getUserById').mockResolvedValue({
      _id: 'user-id',
      username: 'dev',
    } as any);

    const token = issueAuthToken({ sub: 'user-id', login: 'dev' });
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
