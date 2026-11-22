process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ||= 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET ||= 'jest-only-secret-that-is-at-least-thirty-two-characters-long';
process.env.SESSION_IDLE_TIMEOUT_MINUTES ||= '30';

const jwt = require('jsonwebtoken') as typeof import('jsonwebtoken');
const { SESSION_COOKIE_NAME, SESSION_IDLE_TIMEOUT_MS, setSessionCookie, clearSessionCookie } = require('../src/shared/auth/session-cookie') as typeof import('../src/shared/auth/session-cookie');

describe('cookie de sesión', () => {
  it('usa HttpOnly y vence tras 30 minutos de inactividad', () => {
    const response = { cookie: jest.fn() } as unknown as import('express').Response;
    const user = { id: '2cb1d6b8-f2c5-4d8c-a71f-17322caf36e1', role: 'TOURIST' };

    setSessionCookie(response, user);

    const [name, token, options] = (response.cookie as jest.Mock).mock.calls[0];
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as jwt.JwtPayload;
    expect(name).toBe(SESSION_COOKIE_NAME);
    expect(options).toMatchObject({ httpOnly: true, secure: false, sameSite: 'lax', path: '/', maxAge: SESSION_IDLE_TIMEOUT_MS });
    expect(payload.exp! - payload.iat!).toBe(30 * 60);
  });

  it('expira la cookie al cerrar sesión', () => {
    const response = { clearCookie: jest.fn() } as unknown as import('express').Response;

    clearSessionCookie(response);

    expect((response.clearCookie as jest.Mock).mock.calls[0][0]).toBe(SESSION_COOKIE_NAME);
  });
});
