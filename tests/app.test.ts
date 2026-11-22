process.env.NODE_ENV = 'test';
require('dotenv').config({ quiet: true });

jest.doMock('../src/config/database', () => ({
  prisma: {},
  checkDatabaseConnection: jest.fn(),
}));

const request = require('supertest') as typeof import('supertest');
const { app } = require('../src/app') as typeof import('../src/app');
const { checkDatabaseConnection } = require('../src/config/database') as {
  checkDatabaseConnection: jest.Mock;
};

describe('API principal', () => {
  it('responde con estado saludable cuando PostgreSQL está disponible', async () => {
    checkDatabaseConnection.mockResolvedValue({
      database: 'tourist_test',
      serverTime: new Date('2026-01-01T12:00:00.000Z'),
    });

    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.database).toMatchObject({ connected: true, name: 'tourist_test' });
  });

  it('devuelve 503 cuando no se puede conectar a PostgreSQL', async () => {
    const errorLog = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    checkDatabaseConnection.mockRejectedValue(new Error('database unavailable'));

    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(503);
    expect(response.body.status).toBe('error');
    expect(response.body.database).toEqual({ connected: false });
    errorLog.mockRestore();
  });

  it('valida los parámetros de búsqueda del mapa antes de consultar servicios externos', async () => {
    const response = await request(app).get('/api/v1/openmap/search?q=ab');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('responde con 404 para rutas inexistentes', async () => {
    const response = await request(app).get('/api/v1/no-existe');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('ROUTE_NOT_FOUND');
  });
});
