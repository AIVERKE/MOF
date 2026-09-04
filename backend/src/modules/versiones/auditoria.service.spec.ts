import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditoriaService } from './auditoria.service';
import { AuditoriaCambio } from './entities/auditoria-cambio.entity';

describe('AuditoriaService', () => {
  let service: AuditoriaService;
  let repo: {
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    findOne: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let qb: Record<string, jest.Mock>;

  beforeEach(async () => {
    qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    repo = {
      create: jest.fn((x: unknown) => x),
      save: jest.fn((x: unknown) => Promise.resolve(x)),
      update: jest.fn().mockResolvedValue(undefined),
      findOne: jest.fn().mockResolvedValue(null),
      createQueryBuilder: jest.fn(() => qb),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditoriaService,
        { provide: getRepositoryToken(AuditoriaCambio), useValue: repo },
      ],
    }).compile();

    service = module.get<AuditoriaService>(AuditoriaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('anota el cambio con la unidad afectada y sin marcar como enviado', async () => {
    await service.registrarCambio({
      tablaAfectada: 'unidad_funcion',
      idRegistroOriginal: 55,
      accion: 'UPDATE',
      unidadAfectadaId: 12,
    });

    const fila = (repo.create.mock.calls as [Record<string, unknown>][])[0][0];
    expect(fila.unidadAfectadaId).toBe('12');
    expect(fila.enviadoAt).toBeNull();
    expect(fila.intentos).toBe(0);
    expect(repo.save).toHaveBeenCalled();
  });

  it('escribe en la transaccion en curso cuando se le pasa un manager', async () => {
    // Es lo que garantiza que no exista un cambio de datos sin su evento.
    const repoTx = { create: jest.fn((x: unknown) => x), save: jest.fn() };
    const manager = { getRepository: jest.fn(() => repoTx) };

    await service.registrarCambio(
      {
        tablaAfectada: 'unidad',
        idRegistroOriginal: 1,
        accion: 'CREATE',
        unidadAfectadaId: 1,
      },
      manager as never,
    );

    expect(repoTx.save).toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('solo devuelve pendientes que afectan a una unidad', async () => {
    await service.pendientesDeEnviar();
    expect(qb.where).toHaveBeenCalledWith('a.enviado_at IS NULL');
    expect(qb.andWhere).toHaveBeenCalledWith(
      'a.unidad_afectada_id IS NOT NULL',
    );
  });

  it('los pendientes salen del mas viejo al mas nuevo', async () => {
    // El orden importa: dos cambios sobre la misma unidad tienen que aplicarse
    // en el orden en que ocurrieron.
    await service.pendientesDeEnviar();
    expect(qb.orderBy).toHaveBeenCalledWith('a.created_at', 'ASC');
  });

  it('marcar fallido incrementa intentos y sella el ultimo intento', async () => {
    await service.marcarFallido('7', 2, 'timeout');
    const cambios = (
      repo.update.mock.calls as [string, Record<string, unknown>][]
    )[0][1];
    expect(cambios.intentos).toBe(3);
    expect(cambios.ultimoIntentoAt).toBeInstanceOf(Date);
  });

  it('acota el limite de pagina para que nadie pida la tabla entera', async () => {
    const r = await service.findAll({ limit: 5000 });
    expect(r.limit).toBeLessThanOrEqual(200);
  });
});
