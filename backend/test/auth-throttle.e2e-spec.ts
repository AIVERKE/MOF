import { UnauthorizedException } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import type { App } from 'supertest/types';
import { ResultExceptionFilter } from '../src/common/filters/result-exception.filter';
import { ErrorCodes } from '../src/common/errors';
import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService, AuthUser } from '../src/modules/auth/auth.service';
import { LocalAuthGuard } from '../src/modules/auth/guards/local-auth.guard';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';

describe('Auth rate limit (e2e)', () => {
  let app: NestExpressApplication;

  const authUser: AuthUser = {
    id: '1',
    email: 'admin@admin.com',
    nombre: 'Administrador',
    roles: ['ADMIN'],
  };
  const badLogin = { email: 'a@b.com', password: 'wrongpass1' };

  // Apache (mod_proxy) appends the client IP as the last X-Forwarded-For entry.
  const viaApache = (clientIp: string, spoofed?: string) =>
    spoofed ? `${spoofed}, ${clientIp}` : clientIp;

  const server = () => app.getHttpServer() as App;

  const post = (path: string, xff: string | undefined, body: object) => {
    const req = request(server()).post(path);
    if (xff) req.set('X-Forwarded-For', xff);
    return req.send(body);
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
            primerAcceso: jest
              .fn()
              .mockRejectedValue(
                new UnauthorizedException('Datos de primer acceso inválidos'),
              ),
            cambiarPassword: jest
              .fn()
              .mockRejectedValue(new UnauthorizedException('Token inválido')),
            getPasswordPolicy: jest.fn().mockReturnValue({ minLength: 8 }),
          },
        },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    })
      .overrideGuard(LocalAuthGuard)
      .useValue({
        canActivate: (context: {
          switchToHttp: () => {
            getRequest: () => {
              body: { email?: string; password?: string };
              user?: AuthUser;
            };
          };
        }) => {
          const req = context.switchToHttp().getRequest();
          const { email, password } = req.body || {};
          if (email === 'admin@admin.com' && password === 'admin123') {
            req.user = authUser;
            return true;
          }
          throw new UnauthorizedException('Credenciales inválidas');
        },
      })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    app.set('trust proxy', 1);
    app.useGlobalFilters(new ResultExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 429 on the 11th POST /auth/login from the same IP', async () => {
    const ip = viaApache('198.51.100.1');
    for (let i = 0; i < 10; i++) {
      await post('/auth/login', ip, badLogin).expect(401);
    }

    const res = await post('/auth/login', ip, badLogin).expect(429);

    expect(res.body).toEqual(
      expect.objectContaining({
        status: false,
        message: 'Demasiadas solicitudes. Intente más tarde',
        errorCode: ErrorCodes.TOO_MANY_REQUESTS,
        data: null,
      }),
    );
    expect(JSON.stringify(res.body)).not.toMatch(/access_token|stack/i);
    expect(res.headers['retry-after']).toBeDefined();
  });

  it('lets a valid user in on the first attempt', async () => {
    const res = await post('/auth/login', viaApache('198.51.100.2'), {
      email: 'admin@admin.com',
      password: 'admin123',
    }).expect(200);

    expect((res.body as { access_token: string }).access_token).toBe(
      'test.jwt.token',
    );
  });

  it.each(['/auth/primer-acceso', '/auth/cambiar-password'])(
    'returns 429 on the 11th POST %s from the same IP',
    async (path) => {
      const ip = viaApache(
        path === '/auth/primer-acceso' ? '198.51.100.3' : '198.51.100.4',
      );
      for (let i = 0; i < 10; i++) {
        await post(path, ip, {}).expect(401);
      }
      const res = await post(path, ip, {}).expect(429);
      expect((res.body as { errorCode: string }).errorCode).toBe(
        ErrorCodes.TOO_MANY_REQUESTS,
      );
    },
  );

  it('uses distinct buckets per client IP behind Apache', async () => {
    const blocked = viaApache('198.51.100.5');
    for (let i = 0; i < 10; i++) {
      await post('/auth/login', blocked, badLogin).expect(401);
    }
    await post('/auth/login', blocked, badLogin).expect(429);

    await post('/auth/login', viaApache('198.51.100.6'), badLogin).expect(401);
  });

  it('does not let a client-forged X-Forwarded-For bypass the limit', async () => {
    const clientIp = '198.51.100.7';
    for (let i = 0; i < 10; i++) {
      await post(
        '/auth/login',
        viaApache(clientIp, `10.0.0.${i}`),
        badLogin,
      ).expect(401);
    }
    await post(
      '/auth/login',
      viaApache(clientIp, '10.0.0.99'),
      badLogin,
    ).expect(429);
  });

  it('does not count every proxied request as the Apache address', async () => {
    const ip = viaApache('198.51.100.8');
    for (let i = 0; i < 10; i++) {
      await post('/auth/login', ip, badLogin).expect(401);
    }
    await post('/auth/login', ip, badLogin).expect(429);

    // Without X-Forwarded-For the key is the socket address (loopback here).
    await post('/auth/login', undefined, badLogin).expect(401);
  });

  it('does not apply the auth 10/min limit to GET /auth/password-policy', async () => {
    for (let i = 0; i < 11; i++) {
      await request(server())
        .get('/auth/password-policy')
        .set('X-Forwarded-For', viaApache('198.51.100.9'))
        .expect(200);
    }
  });
});
