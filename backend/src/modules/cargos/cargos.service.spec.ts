import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { Unidad } from '../unidades/entities/unidad.entity';
import { AsignacionCargo } from './entities/asignacion-cargo.entity';
import { CargoJerarquiaHist } from './entities/cargo-jerarquia-hist.entity';
import { CargoUnidad } from './entities/cargo-unidad.entity';
import { Cargo } from './entities/cargo.entity';
import { CargosService } from './cargos.service';

describe('CargosService', () => {
  let service: CargosService;
  let cargoRepo: jest.Mocked<
    Pick<
      Repository<Cargo>,
      'find' | 'findOne' | 'save' | 'create' | 'count' | 'softRemove' | 'createQueryBuilder'
    >
  >;
  let cargoUnidadRepo: jest.Mocked<
    Pick<Repository<CargoUnidad>, 'find' | 'findOne' | 'save' | 'create' | 'count' | 'softRemove'>
  >;
  let unidadRepo: jest.Mocked<Pick<Repository<Unidad>, 'findOne'>>;

  const qb = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  beforeEach(async () => {
    cargoRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn((x) => x),
      count: jest.fn(),
      softRemove: jest.fn(),
      createQueryBuilder: jest.fn(() => qb as never),
    };
    cargoUnidadRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn((x) => x),
      count: jest.fn(),
      softRemove: jest.fn(),
    };
    unidadRepo = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CargosService,
        { provide: getRepositoryToken(Cargo), useValue: cargoRepo },
        { provide: getRepositoryToken(CargoUnidad), useValue: cargoUnidadRepo },
        { provide: getRepositoryToken(AsignacionCargo), useValue: { count: jest.fn() } },
        { provide: getRepositoryToken(CargoJerarquiaHist), useValue: { save: jest.fn(), create: jest.fn() } },
        { provide: getRepositoryToken(Unidad), useValue: unidadRepo },
      ],
    }).compile();

    service = module.get(CargosService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('list', () => {
    it('orders by nivelOrden DESC NULLS LAST then nombre ASC', async () => {
      qb.getMany.mockResolvedValue([
        {
          id: '8',
          codigo: 'ADM-26-RECTORA',
          nombre: 'RECTOR/A',
          descripcion: 'RECTOR/A',
          activo: true,
          nivelOrden: 26,
          ambito: 'ADM',
          parentId: null,
          parent: null,
        } as Cargo,
        {
          id: '7',
          codigo: 'ADM-25-VICERRECTOR',
          nombre: 'VICERRECTOR/A',
          descripcion: 'VICERRECTOR/A',
          activo: true,
          nivelOrden: 25,
          ambito: 'ADM',
          parentId: null,
          parent: null,
        } as Cargo,
      ]);

      const result = await service.list();

      expect(cargoRepo.createQueryBuilder).toHaveBeenCalledWith('c');
      expect(qb.orderBy).toHaveBeenCalledWith('c.nivelOrden', 'DESC', 'NULLS LAST');
      expect(qb.addOrderBy).toHaveBeenCalledWith('c.nombre', 'ASC');
      expect(result[0]).toMatchObject({
        id: 8,
        nivelOrden: 26,
        ambito: 'ADM',
        nombre: 'RECTOR/A',
      });
    });
  });

  describe('asignar', () => {
    it('throws 400 when cargo is inactive', async () => {
      unidadRepo.findOne.mockResolvedValue({ id: '1' } as Unidad);
      cargoRepo.findOne.mockResolvedValue({
        id: '4',
        activo: false,
        unicoEnUnidad: false,
      } as Cargo);

      await expect(service.asignar(1, { cargoId: 4 })).rejects.toMatchObject({
        status: HttpStatus.BAD_REQUEST,
      });
      await expect(service.asignar(1, { cargoId: 4 })).rejects.toBeInstanceOf(
        BusinessException,
      );
      expect(cargoUnidadRepo.save).not.toHaveBeenCalled();
    });

    it('creates cargo_unidad when cargo is active', async () => {
      unidadRepo.findOne.mockResolvedValue({ id: '1' } as Unidad);
      cargoRepo.findOne.mockResolvedValue({
        id: '8',
        activo: true,
        unicoEnUnidad: false,
      } as Cargo);
      cargoUnidadRepo.save.mockResolvedValue({ id: '99' } as CargoUnidad);

      const result = await service.asignar(1, { cargoId: 8 });

      expect(result).toBe(1);
      expect(cargoUnidadRepo.save).toHaveBeenCalled();
    });
  });
});
