import crypto from 'crypto';

const buildInitData = (botToken: string, authDate: number, overrides?: Record<string, string>) => {
  const params = new URLSearchParams({
    user: JSON.stringify({
      id: 123,
      first_name: 'Dev',
      last_name: 'User',
      username: 'devuser',
    }),
    auth_date: authDate.toString(),
    ...overrides,
  });

  if (params.has('hash')) {
    params.delete('hash');
  }

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

describe('validateTelegramInitData', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.BOT_TOKEN = 'token';
    process.env.TELEGRAM_AUTH_MAX_AGE_SECONDS = '86400';
  });

  it('accepts valid initDataRaw', async () => {
    const { validateTelegramInitData } = await import('../../utils/telegram.util');
    const authDate = Math.floor(Date.now() / 1000);
    const initData = buildInitData('token', authDate);
    const user = validateTelegramInitData(initData);
    expect(user.telegramId).toBe(123);
    expect(user.username).toBe('devuser');
  });

  it('fails when hash/auth_date missing', async () => {
    const { validateTelegramInitData, TelegramInitDataValidationError } = await import(
      '../../utils/telegram.util'
    );
    const initData = 'user=%7B%22id%22%3A123%7D';
    expect(() => validateTelegramInitData(initData)).toThrow(TelegramInitDataValidationError);
  });

  it('fails on signature mismatch', async () => {
    const { validateTelegramInitData } = await import('../../utils/telegram.util');
    const authDate = Math.floor(Date.now() / 1000);
    const initData = buildInitData('token', authDate).replace(/hash=[^&]+/, 'hash=bad');
    expect(() => validateTelegramInitData(initData)).toThrow('InitData signature mismatch');
  });

  it('fails when auth_date expired', async () => {
    const { validateTelegramInitData } = await import('../../utils/telegram.util');
    const authDate = Math.floor(Date.now() / 1000) - 120;
    process.env.TELEGRAM_AUTH_MAX_AGE_SECONDS = '60';
    jest.resetModules();
    const { validateTelegramInitData: validateAfterReload } = await import(
      '../../utils/telegram.util'
    );
    const initData = buildInitData('token', authDate);
    expect(() => validateAfterReload(initData)).toThrow('InitData expired');
  });
});
