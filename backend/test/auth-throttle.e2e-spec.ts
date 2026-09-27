import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { App } from 'supertest/types';
import { ResultExceptionFilter } from '../src/common/filters/result-exception.filter';
import { ErrorCodes } from '../src/common/errors';
import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService, AuthUser } from '../src/modules/auth/auth.service';
import { LocalAuthGuard } from '../src/modules/auth/guards/local-auth.guard';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';

describe('Auth rate limit (e2e)', () => {
  let app: INestApplication<App>;

  const authUser: AuthUser = {
    id: '1',
    email: 'admin@admin.com',
    nombre: 'Administrador',
    roles: ['ADMIN'],
  };

  beforeAll(async () => {
    process.env.THROTTLE_AUTH_LIMIT = '10';
    process.env.THROTTLE_AUTH_TTL_MS = '60000';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ name: 'default', ttl: 60_000, limit: 60 }],
          errorMessage: 'Demasiadas solicitudes. Intente más tarde',
        }),
      ],
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn().mockReturnValue({
              access_token: 'test.jwt.token',
              user: authUser,
            }),
            primerAcceso: jest.fn().mockRejectedValue(
              new UnauthorizedException('Datos de primer acceso inválidos'),
            ),
            cambiarPassword: jest.fn().mockRejectedValue(
              new UnauthorizedException('Token inválido'),
            ),
            getPasswordPolicy: jest.fn().mockReturnValue({ minLength: 8 }),
          },
        },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    })
      .overrideGuard(LocalAuthGuard)
      .useValue({
        canActivate: () => {
          throw new UnauthorizedException('Credenciales inválidas');
        },
      })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
    app.useGlobalFilters(new ResultExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 429 on the 11th POST /auth/login from the same IP', async () => {
    const server = app.getHttpServer();
    for (let i = 0; i < 10; i++) {
      await request(server)
        .post('/auth/login')
        .send({ email: 'a@b.com', password: 'wrongpass1' })
        .expect(401);
    }

    const res = await request(server)
      .post('/auth/login')
      .send({ email: 'a@b.com', password: 'wrongpass1' })
      .expect(429);

    expect(res.body).toEqual(
      expect.objectContaining({
        status: false,
        message: 'Demasiadas solicitudes. Intente más tarde',
        errorCode: ErrorCodes.TOO_MANY_REQUESTS,
        data: null,
      }),
    );
    expect(JSON.stringify(res.body)).not.toMatch(/access_token|stack/i);
  });

  it('does not apply the auth 10/min limit to GET /auth/password-policy', async () => {
    const server = app.getHttpServer();
    // Same process still has login bucket exhausted; password-policy uses default 60.
    for (let i = 0; i < 11; i++) {
      await request(server).get('/auth/password-policy').expect(200);
    }
  });

  it('uses distinct buckets per client IP behind trust proxy', async () => {
    const server = app.getHttpServer();
    const otherIp = '203.0.113.50';

    // Exhausted bucket above was for the default test agent IP.
    // A different X-Forwarded-For (1 hop trusted) must not be rate-limited yet.
    await request(server)
      .post('/auth/login')
      .set('X-Forwarded-For', otherIp)
      .send({ email: 'a@b.com', password: 'wrongpass1' })
      .expect(401);

    // Spoofing alone after the trusted hop is already accounted: with trust proxy = 1,
    // Express uses the leftmost client address from X-Forwarded-For when present.
    // Hitting again as otherIp still counts on that IP's bucket (not the first IP's).
    for (let i = 0; i < 9; i++) {
      await request(server)
        .post('/auth/login')
        .set('X-Forwarded-For', otherIp)
        .send({ email: 'a@b.com', password: 'wrongpass1' })
        .expect(401);
    }
    await request(server)
      .post('/auth/login')
      .set('X-Forwarded-For', otherIp)
      .send({ email: 'a@b.com', password: 'wrongpass1' })
      .expect(429);
  });
});
