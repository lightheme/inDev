describe('worker entrypoints', () => {
  const resetEnv = () => {
    process.env.NODE_ENV = 'test';
  };

  beforeEach(() => {
    jest.resetModules();
    resetEnv();
  });

  it('scheduler exits early in test env', async () => {
    const connectDatabase = jest.fn();
    jest.doMock('../../config/database', () => ({ connectDatabase }));

    const { run } = await import('../../workers/scheduler');
    await run();

    expect(connectDatabase).not.toHaveBeenCalled();
  });

  it('worker runner exits early in test env', async () => {
    const connectDatabase = jest.fn();
    jest.doMock('../../config/database', () => ({ connectDatabase }));

    const { run } = await import('../../workers/workerRunner');
    await run();

    expect(connectDatabase).not.toHaveBeenCalled();
  });

  it('autobid worker exits early in test env', async () => {
    const connectDatabase = jest.fn();
    jest.doMock('../../config/database', () => ({ connectDatabase }));

    const { run } = await import('../../workers/autobid');
    await run();

    expect(connectDatabase).not.toHaveBeenCalled();
  });

  it('cleanup worker exits early in test env', async () => {
    const connectDatabase = jest.fn();
    jest.doMock('../../config/database', () => ({ connectDatabase }));

    const { run } = await import('../../workers/cleanup');
    await run();

    expect(connectDatabase).not.toHaveBeenCalled();
  });
});
