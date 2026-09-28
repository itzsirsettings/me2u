import { createRegistrationTransfer, login, ApiError } from '../src/api';

function response(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('mobile API client', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('logs in through the native endpoint without sending a browser cookie', async () => {
    const fetchMock = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(
        response(200, {
          accessToken: 'session-token',
          tokenType: 'Bearer',
          expiresIn: 604800,
        }),
      );
    globalThis.fetch = fetchMock;

    const result = await login('user@example.com', 'password');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://app.me2ulend.online/api/auth/native/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          email: 'user@example.com',
          password: 'password',
        }),
      }),
    );
    const init = fetchMock.mock.calls[0]?.[1];
    expect(new Headers(init?.headers).get('Authorization')).toBeNull();
    expect(init.credentials).toBeUndefined();
    expect(result.accessToken).toBe('session-token');
  });

  it('surfaces provider failures without retrying a money-related request', async () => {
    const fetchMock = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(
        response(502, {
          error:
            'Paystack could not create a transfer account. Please try again.',
        }),
      );
    globalThis.fetch = fetchMock;

    await expect(
      createRegistrationTransfer('session-token'),
    ).rejects.toMatchObject({
      name: 'ApiError',
      status: 502,
      reference: undefined,
      message:
        'Paystack could not create a transfer account. Please try again.',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('types HTTP failures as safe API errors', async () => {
    globalThis.fetch = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(
        response(423, { error: 'Account deletion is pending.' }),
      );

    try {
      await login('user@example.com', 'password');
      throw new Error('Expected API request to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({ status: 423 });
    }
  });
});
