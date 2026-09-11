import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { AuditoriaService } from '../../versiones/auditoria.service';
import { AuditoriaCambio } from '../../versiones/entities/auditoria-cambio.entity';
import { GacetaSyncService } from './gaceta-sync.service';

jest.mock('axios');
/* eslint-disable @typescript-eslint/unbound-method --
   jest.mock() sustituye axios.post por un doble; aqui se usa como funcion
   suelta, nunca como metodo de axios. */
const post = axios.post as jest.Mock;

/** Forma de una llamada a axios.post, para leer el cuerpo sin caer en `any`. */
type Llamada = [
  string,
  Record<string, unknown>,
  { headers: Record<string, string> },
];
const llamadas = (): Llamada[] => post.mock.calls as Llamada[];

function evento(over: Partial<AuditoriaCambio> = {}): AuditoriaCambio {
  return {
    id: '1',
    tablaAfectada: 'unidad',
    idRegistroOriginal: '12',
    accion: 'UPDATE',
    datosAnteriores: null,
    datosNuevos: null,
    usuario: null,
    idUsuario: null,
    unidadAfectadaId: '12',
    enviadoAt: null,
    intentos: 0,
    ultimoIntentoAt: null,
    ultimoError: null,
    createdAt: new Date(),
    ...over,
  };
}

describe('GacetaSyncService', () => {
  let auditoria: {
    pendientesDeEnviar: jest.Mock;
    marcarEnviado: jest.Mock;
    marcarFallido: jest.Mock;
  };

  async function crear(config: Record<string, string> = {}) {
    auditoria = {
      pendientesDeEnviar: jest.fn().mockResolvedValue([]),
      marcarEnviado: jest.fn().mockResolvedValue(undefined),
      marcarFallido: jest.fn().mockResolvedValue(undefined),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GacetaSyncService,
        { provide: AuditoriaService, useValue: auditoria },
        {
          provide: ConfigService,
          useValue: { get: (k: string, d?: unknown) => config[k] ?? d },
        },
      ],
    }).compile();
    return module.get<GacetaSyncService>(GacetaSyncService);
  }

  beforeEach(() => post.mockReset());

  it('sin GACETA_URL no envia nada', async () => {
    const service = await crear();

    expect(service.activo).toBe(false);
    await service.vaciar();
    expect(post).not.toHaveBeenCalled();
    expect(auditoria.pendientesDeEnviar).not.toHaveBeenCalled();
  });

  it('manda el id de la unidad, no sus datos', async () => {
    // Es lo que evita que dos cambios cruzados en la red dejen indexada la
    // version vieja: la Gaceta vuelve a leer el estado actual.
    const service = await crear({ GACETA_URL: 'http://gaceta:8000' });
    auditoria.pendientesDeEnviar.mockResolvedValue([evento()]);
    post.mockResolvedValue({ status: 200 });

    await service.vaciar();

    const [url, cuerpo] = llamadas()[0];
    expect(url).toBe('http://gaceta:8000/api/ingesta/mof');
    expect(cuerpo).toMatchObject({ accion: 'upsert', unidad_id: 12 });
    expect(cuerpo).not.toHaveProperty('unidad');
  });

  it('el evento_id es estable para que reintentar sea seguro', async () => {
    const service = await crear({ GACETA_URL: 'http://gaceta:8000' });
    auditoria.pendientesDeEnviar.mockResolvedValue([evento({ id: '99' })]);
    post.mockResolvedValue({ status: 200 });

    await service.vaciar();

    expect(llamadas()[0][1].evento_id).toBe('mof-99');
  });

  it('manda el token de administrador cuando esta configurado', async () => {
    const service = await crear({
      GACETA_URL: 'http://gaceta:8000',
      GACETA_ADMIN_TOKEN: 's3cr3t',
    });
    auditoria.pendientesDeEnviar.mockResolvedValue([evento()]);
    post.mockResolvedValue({ status: 200 });

    await service.vaciar();

    expect(llamadas()[0][2].headers['X-Admin-Token']).toBe('s3cr3t');
  });

  it('una baja se traduce a delete', async () => {
    const service = await crear({ GACETA_URL: 'http://gaceta:8000' });
    auditoria.pendientesDeEnviar.mockResolvedValue([
      evento({ accion: 'DELETE' }),
    ]);
    post.mockResolvedValue({ status: 200 });

    await service.vaciar();

    expect(llamadas()[0][1].accion).toBe('delete');
  });

  it('solo marca como enviado lo que la Gaceta confirmo', async () => {
    const service = await crear({ GACETA_URL: 'http://gaceta:8000' });
    auditoria.pendientesDeEnviar.mockResolvedValue([evento()]);
    post.mockRejectedValue(new Error('ECONNREFUSED'));

    await service.vaciar();

    expect(auditoria.marcarEnviado).not.toHaveBeenCalled();
    expect(auditoria.marcarFallido).toHaveBeenCalled();
  });

  it('si la Gaceta no responde, deja de insistir con el resto de la cola', async () => {
    // Reintentar los 50 pendientes contra un destino caido solo gasta tiempo
    // y llena el log; vuelven en el siguiente barrido.
    const service = await crear({ GACETA_URL: 'http://gaceta:8000' });
    auditoria.pendientesDeEnviar.mockResolvedValue([
      evento({ id: '1' }),
      evento({ id: '2' }),
      evento({ id: '3' }),
    ]);
    post.mockRejectedValue(new Error('ECONNREFUSED'));

    await service.vaciar();

    expect(post).toHaveBeenCalledTimes(1);
  });

  it('un evento que la Gaceta rechaza no bloquea la cola', async () => {
    const service = await crear({ GACETA_URL: 'http://gaceta:8000' });
    auditoria.pendientesDeEnviar.mockResolvedValue([
      evento({ id: '1' }),
      evento({ id: '2' }),
    ]);
    post
      .mockRejectedValueOnce({ response: { status: 400 } })
      .mockResolvedValueOnce({ status: 200 });

    await service.vaciar();

    expect(post).toHaveBeenCalledTimes(2);
    expect(auditoria.marcarEnviado).toHaveBeenCalledWith('2');
  });

  it('un evento rechazado no se cuenta como entregado', async () => {
    // El contador alimenta el log de la reconciliacion: si un rechazo contara
    // como entrega, el log diria que todo salio bien mientras la Gaceta se
    // queda sin ese cambio.
    const service = await crear({ GACETA_URL: 'http://gaceta:8000' });
    auditoria.pendientesDeEnviar.mockResolvedValue([evento()]);
    post.mockRejectedValue({ response: { status: 400 } });

    expect(await service.vaciar()).toBe(0);
    expect(auditoria.marcarEnviado).not.toHaveBeenCalled();
  });

  it('cuenta solo las entregas confirmadas', async () => {
    const service = await crear({ GACETA_URL: 'http://gaceta:8000' });
    auditoria.pendientesDeEnviar.mockResolvedValue([
      evento({ id: '1' }),
      evento({ id: '2' }),
    ]);
    post
      .mockRejectedValueOnce({ response: { status: 400 } })
      .mockResolvedValueOnce({ status: 200 });

    expect(await service.vaciar()).toBe(1);
  });

  it('respeta el backoff de un evento que acaba de fallar', async () => {
    const service = await crear({ GACETA_URL: 'http://gaceta:8000' });
    auditoria.pendientesDeEnviar.mockResolvedValue([
      evento({ intentos: 3, ultimoIntentoAt: new Date() }),
    ]);

    await service.vaciar();

    expect(post).not.toHaveBeenCalled();
  });

  it('reintenta cuando ya paso la espera', async () => {
    const service = await crear({ GACETA_URL: 'http://gaceta:8000' });
    auditoria.pendientesDeEnviar.mockResolvedValue([
      evento({
        intentos: 3,
        ultimoIntentoAt: new Date(Date.now() - 60_000),
      }),
    ]);
    post.mockResolvedValue({ status: 200 });

    await service.vaciar();

    expect(post).toHaveBeenCalledTimes(1);
  });

  it('abandona un evento tras demasiados intentos', async () => {
    // A partir de aqui lo arregla la reconciliacion, no el reintento.
    const service = await crear({
      GACETA_URL: 'http://gaceta:8000',
      GACETA_MAX_INTENTOS: '3',
    });
    auditoria.pendientesDeEnviar.mockResolvedValue([evento({ intentos: 3 })]);

    await service.vaciar();

    expect(post).not.toHaveBeenCalled();
  });

  it('el empujon nunca lanza aunque la Gaceta este caida', async () => {
    const service = await crear({ GACETA_URL: 'http://gaceta:8000' });
    auditoria.pendientesDeEnviar.mockRejectedValue(new Error('boom'));

    expect(() => service.empujar()).not.toThrow();
  });
});
