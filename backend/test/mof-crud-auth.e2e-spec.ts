import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { MofUnidadesController } from '../src/modules/unidades/mof-unidades.controller';
import { UnidadesService } from '../src/modules/unidades/unidades.service';
import { UnidadPdfService } from '../src/modules/unidades/unidad-pdf.service';
import { CatalogosController } from '../src/modules/catalogos/catalogos.controller';
import { CatalogosService } from '../src/modules/catalogos/catalogos.service';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';

describe('MOF CRUD auth (e2e)', () => {
  let app: INestApplication<App>;

  const unidadesService = {
    remove: jest.fn().mockResolvedValue({ id: 1, activo: false }),
  };

  const catalogosService = {
    createTipo: jest.fn().mockResolvedValue({
      id: 1,
      descripcion: 'Administrativo',
      activo: true,
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [MofUnidadesController, CatalogosController],
      providers: [
        { provide: UnidadesService, useValue: unidadesService },
        {
          provide: UnidadPdfService,
          useValue: { buildUnidadPdf: jest.fn() },
        },
        { provide: CatalogosService, useValue: catalogosService },
        RolesGuard,
        Reflector,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: {
          switchToHttp: () => {
            getRequest: () => {
              headers: { authorization?: string };
              user?: { userId: string; email: string; roles: string[] };
            };
          };
        }) => {
          const req = context.switchToHttp().getRequest();
          const auth = req.headers.authorization;
          if (auth === 'Bearer valid.admin.token') {
            req.user = {
              userId: '1',
              email: 'admin@admin.com',
              roles: ['ADMIN'],
            };
            return true;
          }
          if (auth === 'Bearer valid.user.token') {
            req.user = {
              userId: '2',
              email: 'user@example.com',
              roles: ['USER'],
            };
            return true;
          }
          throw new UnauthorizedException();
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('DELETE /api/v1/mof/unidades/:id', () => {
    it('returns 401 without Authorization', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/mof/unidades/1')
        .expect(401);
      expect(unidadesService.remove).not.toHaveBeenCalled();
    });

    it('returns 200 with ADMIN JWT', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/mof/unidades/1')
        .set('Authorization', 'Bearer valid.admin.token')
        .expect(200);
      expect(unidadesService.remove).toHaveBeenCalledWith(1);
    });

    it('returns 403 with USER JWT (no gestión)', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/mof/unidades/1')
        .set('Authorization', 'Bearer valid.user.token')
        .expect(403);
      expect(unidadesService.remove).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/mof/tipos', () => {
    it('returns 401 without Authorization', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/mof/tipos')
        .send({ descripcion: 'Administrativo' })
        .expect(401);
      expect(catalogosService.createTipo).not.toHaveBeenCalled();
    });

    it('returns 201 with ADMIN JWT', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/mof/tipos')
        .set('Authorization', 'Bearer valid.admin.token')
        .send({ descripcion: 'Administrativo' })
        .expect(201);
      expect(catalogosService.createTipo).toHaveBeenCalledWith({
        descripcion: 'Administrativo',
      });
    });
  });
});
