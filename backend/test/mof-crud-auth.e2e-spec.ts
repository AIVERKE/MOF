import {
  INestApplication,
  RequestMethod,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { METHOD_METADATA } from '@nestjs/common/constants';
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
import { ROLES_KEY } from '../src/modules/auth/decorators/roles.decorator';

/** Una ruta de MofUnidadesController que escribe el organigrama. */
type Escritura = {
  metodo: 'post' | 'put' | 'delete';
  ruta: string;
  cuerpo?: object;
  servicio: string;
  estado: number;
};

const UNIDAD = {
  codigo: 'U-1',
  nombre: 'Unidad de prueba',
  tipo: 1,
  nivel: 1,
  relacion: 'L',
  oficial: true,
  tipoUnidad: 1,
};

// Todas menos PUT config, que es solo de ADMIN (se prueba aparte).
const ESCRITURAS: Escritura[] = [
  {
    metodo: 'post',
    ruta: '/api/v1/mof/unidades',
    cuerpo: UNIDAD,
    servicio: 'create',
    estado: 201,
  },
  {
    metodo: 'put',
    ruta: '/api/v1/mof/unidades/1',
    cuerpo: UNIDAD,
    servicio: 'update',
    estado: 200,
  },
  {
    metodo: 'delete',
    ruta: '/api/v1/mof/unidades/1',
    servicio: 'remove',
    estado: 200,
  },
  {
    metodo: 'put',
    ruta: '/api/v1/mof/unidades/1/setparent',
    cuerpo: { parentId: 2 },
    servicio: 'setParent',
    estado: 200,
  },
  {
    metodo: 'post',
    ruta: '/api/v1/mof/unidades/1/funciones',
    cuerpo: { funcion: 'Planificar' },
    servicio: 'addFuncion',
    estado: 201,
  },
  {
    metodo: 'put',
    ruta: '/api/v1/mof/unidades/1/funciones/2',
    cuerpo: { funcion: 'Planificar' },
    servicio: 'updateFuncion',
    estado: 200,
  },
  {
    metodo: 'delete',
    ruta: '/api/v1/mof/unidades/1/funciones/2',
    servicio: 'deleteFuncion',
    estado: 200,
  },
  {
    metodo: 'put',
    ruta: '/api/v1/mof/unidades/1/funciones/2/subir',
    servicio: 'subirFuncion',
    estado: 200,
  },
  {
    metodo: 'put',
    ruta: '/api/v1/mof/unidades/1/funciones/2/bajar',
    servicio: 'bajarFuncion',
    estado: 200,
  },
  {
    metodo: 'post',
    ruta: '/api/v1/mof/unidades/1/dependencias-funcionales',
    cuerpo: { dependenciaId: 2 },
    servicio: 'addDependencia',
    estado: 201,
  },
  {
    metodo: 'delete',
    ruta: '/api/v1/mof/unidades/1/dependencias-funcionales/2',
    servicio: 'removeDependencia',
    estado: 200,
  },
  {
    metodo: 'post',
    ruta: '/api/v1/mof/unidades/1/relaciones-internas',
    cuerpo: { relacionadaId: 2 },
    servicio: 'addRelacionInterna',
    estado: 201,
  },
  {
    metodo: 'delete',
    ruta: '/api/v1/mof/unidades/1/relaciones-internas/2',
    servicio: 'removeRelacionInterna',
    estado: 200,
  },
  {
    metodo: 'post',
    ruta: '/api/v1/mof/unidades/1/relaciones-externas',
    cuerpo: { descripcion: 'Ministerio de Educación' },
    servicio: 'addRelacionExterna',
    estado: 201,
  },
  {
    metodo: 'put',
    ruta: '/api/v1/mof/unidades/1/relaciones-externas/2',
    cuerpo: { descripcion: 'Ministerio de Educación' },
    servicio: 'updateRelacionExterna',
    estado: 200,
  },
  {
    metodo: 'delete',
    ruta: '/api/v1/mof/unidades/1/relaciones-externas/2',
    servicio: 'removeRelacionExterna',
    estado: 200,
  },
];

// Lecturas que usan la interfaz y la Gaceta (con su cuenta de rol USER).
const LECTURAS: [string, string][] = [
  ['/api/v1/mof/unidades', 'lista'],
  ['/api/v1/mof/unidades/1', 'findById'],
  ['/api/v1/mof/unidades/1/funciones', 'funciones'],
  ['/api/v1/mof/config', 'getConfig'],
];

describe('MOF CRUD auth (e2e)', () => {
  let app: INestApplication<App>;

  const unidadesService: Record<string, jest.Mock> = Object.fromEntries(
    [
      ...ESCRITURAS.map((e) => e.servicio),
      ...LECTURAS.map(([, servicio]) => servicio),
      'updateConfig',
    ].map((servicio) => [servicio, jest.fn().mockResolvedValue({ id: 1 })]),
  );

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
          if (auth === 'Bearer valid.operador.token') {
            req.user = {
              userId: '3',
              email: 'operador@example.com',
              roles: ['OPERADOR'],
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

  describe('every route that writes the organigrama', () => {
    const enviar = (e: Escritura, token?: string) => {
      let pedido = request(app.getHttpServer())[e.metodo](e.ruta);
      if (token) {
        pedido = pedido.set('Authorization', `Bearer ${token}`);
      }
      return e.cuerpo ? pedido.send(e.cuerpo) : pedido;
    };

    it.each(ESCRITURAS)(
      '$metodo $ruta returns 401 without Authorization',
      async (e) => {
        await enviar(e).expect(401);
        expect(unidadesService[e.servicio]).not.toHaveBeenCalled();
      },
    );

    it.each(ESCRITURAS)(
      '$metodo $ruta returns 403 with USER JWT',
      async (e) => {
        await enviar(e, 'valid.user.token').expect(403);
        expect(unidadesService[e.servicio]).not.toHaveBeenCalled();
      },
    );

    it.each(ESCRITURAS)('$metodo $ruta works with OPERADOR JWT', async (e) => {
      await enviar(e, 'valid.operador.token').expect(e.estado);
      expect(unidadesService[e.servicio]).toHaveBeenCalledTimes(1);
    });

    it.each(ESCRITURAS)('$metodo $ruta works with ADMIN JWT', async (e) => {
      await enviar(e, 'valid.admin.token').expect(e.estado);
      expect(unidadesService[e.servicio]).toHaveBeenCalledTimes(1);
    });

    it('covers every write handler and none is left without @Roles', () => {
      // A new POST/PUT/DELETE without @Roles would be open to any logged-in
      // USER: the class-level RolesGuard lets through what declares no role.
      const prototipo = MofUnidadesController.prototype as unknown as Record<
        string,
        unknown
      >;
      const escrituras = Object.getOwnPropertyNames(prototipo).filter(
        (nombre) => {
          const handler = prototipo[nombre];
          if (typeof handler !== 'function') {
            return false;
          }
          const metodo = Reflect.getMetadata(METHOD_METADATA, handler) as
            RequestMethod | undefined;
          return metodo !== undefined && metodo !== RequestMethod.GET;
        },
      );
      const sinRoles = escrituras.filter(
        (nombre) =>
          !(
            Reflect.getMetadata(ROLES_KEY, prototipo[nombre] as object) as
              string[] | undefined
          )?.length,
      );
      expect(sinRoles).toEqual([]);
      // the table above plus PUT config: a new write route must be added here
      expect(escrituras).toHaveLength(ESCRITURAS.length + 1);
    });
  });

  describe('PUT /api/v1/mof/config (ADMIN only)', () => {
    it('returns 401 without Authorization', async () => {
      await request(app.getHttpServer())
        .put('/api/v1/mof/config')
        .send({})
        .expect(401);
      expect(unidadesService.updateConfig).not.toHaveBeenCalled();
    });

    it.each(['valid.user.token', 'valid.operador.token'])(
      'returns 403 with %s',
      async (token) => {
        await request(app.getHttpServer())
          .put('/api/v1/mof/config')
          .set('Authorization', `Bearer ${token}`)
          .send({})
          .expect(403);
        expect(unidadesService.updateConfig).not.toHaveBeenCalled();
      },
    );

    it('returns 200 with ADMIN JWT', async () => {
      await request(app.getHttpServer())
        .put('/api/v1/mof/config')
        .set('Authorization', 'Bearer valid.admin.token')
        .send({})
        .expect(200);
      expect(unidadesService.updateConfig).toHaveBeenCalledTimes(1);
    });
  });

  describe('reads: any logged-in user, including USER', () => {
    it.each(LECTURAS)(
      'GET %s returns 200 with USER JWT',
      async (ruta, servicio) => {
        await request(app.getHttpServer())
          .get(ruta)
          .set('Authorization', 'Bearer valid.user.token')
          .expect(200);
        expect(unidadesService[servicio]).toHaveBeenCalledTimes(1);
      },
    );

    it.each(LECTURAS)(
      'GET %s returns 401 without Authorization',
      async (ruta, servicio) => {
        await request(app.getHttpServer()).get(ruta).expect(401);
        expect(unidadesService[servicio]).not.toHaveBeenCalled();
      },
    );
  });
});
