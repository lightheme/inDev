import crypto from 'crypto';
import request from 'supertest';

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
  const secretKey = crypto.createHash('sha256').update(botToken).digest();
  const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  params.append('hash', hash);
  return params.toString();
};

const buildUser = () => ({
  _id: 'user-id',
  telegramId: 123,
  username: 'devuser',
  firstName: 'Dev',
  lastName: 'User',
  balance: 0,
  reservedBalance: 0,
});

describe('authMiddleware integration', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.DEV_AUTH_JWT_SECRET = 'dev-secret';
    process.env.DEV_AUTH_TTL_SECONDS = '3600';
    process.env.BOT_TOKEN = 'token';
    process.env.TELEGRAM_AUTH_MAX_AGE_SECONDS = '86400';
  });

  it('allows dev bearer token in development', async () => {
    process.env.NODE_ENV = 'development';
    jest.resetModules();
    const { createApp } = await import('../../app');
    const { issueDevToken } = await import('../../utils/dev-auth.util');
    const { UserService } = await import('../../services/UserService');

    jest.spyOn(UserService.prototype, 'getUserById').mockResolvedValue(buildUser() as any);

    const token = issueDevToken({ sub: 'user-id', login: 'dev', role: 'admin' });
    const app = createApp();

    const response = await request(app)
      .get('/api/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
  });

  it('allows initData in development', async () => {
    process.env.NODE_ENV = 'development';
    jest.resetModules();
    const { createApp } = await import('../../app');
    const { UserService } = await import('../../services/UserService');

    jest
      .spyOn(UserService.prototype, 'getOrCreateUser')
      .mockResolvedValue(buildUser() as any);
    jest.spyOn(UserService.prototype, 'getUserById').mockResolvedValue(buildUser() as any);

    const initData = buildInitData('token', Math.floor(Date.now() / 1000));
    const app = createApp();

    const response = await request(app)
      .get('/api/me')
      .set('x-telegram-init-data', initData);

    expect(response.status).toBe(200);
  });

  it('rejects missing auth headers in development', async () => {
    process.env.NODE_ENV = 'development';
    jest.resetModules();
    const { createApp } = await import('../../app');
    const app = createApp();

    const response = await request(app).get('/api/me');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Missing x-telegram-init-data');
  });

  it('rejects dev bearer token in production', async () => {
    process.env.NODE_ENV = 'production';
    jest.resetModules();
    const { createApp } = await import('../../app');
    const { issueDevToken } = await import('../../utils/dev-auth.util');

    const token = issueDevToken({ sub: 'user-id', login: 'dev' });
    const app = createApp();

    const response = await request(app)
      .get('/api/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Bearer authentication is disabled in production');
  });

  it('allows initData in production', async () => {
    process.env.NODE_ENV = 'production';
    jest.resetModules();
    const { createApp } = await import('../../app');
    const { UserService } = await import('../../services/UserService');

    jest
      .spyOn(UserService.prototype, 'getOrCreateUser')
      .mockResolvedValue(buildUser() as any);
    jest.spyOn(UserService.prototype, 'getUserById').mockResolvedValue(buildUser() as any);

    const initData = buildInitData('token', Math.floor(Date.now() / 1000));
    const app = createApp();

    const response = await request(app)
      .get('/api/me')
      .set('x-telegram-init-data', initData);

    expect(response.status).toBe(200);
  });
});
