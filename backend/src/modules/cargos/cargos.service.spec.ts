import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { Unidad } from '../unidades/entities/unidad.entity';
import { AsignacionCargo } from './entities/asignacion-cargo.entity';
import { CargoJerarquiaHist } from './entities/cargo-jerarquia-hist.entity';
import { CargoUnidad } from './entities/cargo-unidad.entity';
import { Cargo } from './entities/cargo.entity';
import { CargosService } from './cargos.service';

describe('CargosService', () => {
  let service: CargosService;
  let cargoRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
    count: jest.Mock;
    softRemove: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let cargoUnidadRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
    count: jest.Mock;
    softRemove: jest.Mock;
  };
  let unidadRepo: { findOne: jest.Mock };

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
      createQueryBuilder: jest.fn(() => qb),
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
        {
          provide: getRepositoryToken(AsignacionCargo),
          useValue: { count: jest.fn() },
        },
        {
          provide: getRepositoryToken(CargoJerarquiaHist),
          useValue: { save: jest.fn(), create: jest.fn() },
        },
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
      expect(qb.orderBy).toHaveBeenCalledWith(
        'c.nivelOrden',
        'DESC',
        'NULLS LAST',
      );
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
      unidadRepo.findOne.mockResolvedValue({ id: '1' });
      cargoRepo.findOne.mockResolvedValue({
        id: '4',
        activo: false,
        unicoEnUnidad: false,
      });

      await expect(service.asignar(1, { cargoId: 4 })).rejects.toMatchObject({
        status: HttpStatus.BAD_REQUEST,
      });
      await expect(service.asignar(1, { cargoId: 4 })).rejects.toBeInstanceOf(
        BusinessException,
      );
      expect(cargoUnidadRepo.save).not.toHaveBeenCalled();
    });

    it('creates cargo_unidad when cargo is active', async () => {
      unidadRepo.findOne.mockResolvedValue({ id: '1' });
      cargoRepo.findOne.mockResolvedValue({
        id: '8',
        activo: true,
        unicoEnUnidad: false,
      });
      cargoUnidadRepo.save.mockResolvedValue({ id: '99' });

      const result = await service.asignar(1, { cargoId: 8 });

      expect(result).toBe(1);
      expect(cargoUnidadRepo.save).toHaveBeenCalled();
    });

    it('rejects duplicate assignment even when unicoEnUnidad is false', async () => {
      unidadRepo.findOne.mockResolvedValue({ id: '1' });
      cargoRepo.findOne.mockResolvedValue({
        id: '8',
        activo: true,
        unicoEnUnidad: false,
      });
      cargoUnidadRepo.findOne.mockResolvedValue({
        id: '50',
        unidadId: '1',
        cargoId: '8',
        activo: true,
      });

      await expect(service.asignar(1, { cargoId: 8 })).rejects.toMatchObject({
        errorCode: 'CARGO_YA_ASIGNADO',
      });
      expect(cargoUnidadRepo.save).not.toHaveBeenCalled();
    });

    it('copies the catalog nivel when none is provided', async () => {
      unidadRepo.findOne.mockResolvedValue({ id: '1' });
      cargoRepo.findOne.mockResolvedValue({
        id: '8',
        activo: true,
        nivelOrden: 10,
      });
      cargoUnidadRepo.findOne.mockResolvedValue(null);

      await service.asignar(1, { cargoId: 8 });

      expect(cargoUnidadRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          cargoId: '8',
          unidadId: '1',
          nivelOrden: 10,
        }),
      );
    });

    it('uses the explicit nivel when provided', async () => {
      unidadRepo.findOne.mockResolvedValue({ id: '1' });
      cargoRepo.findOne.mockResolvedValue({
        id: '8',
        activo: true,
        nivelOrden: 10,
      });
      cargoUnidadRepo.findOne.mockResolvedValue(null);

      await service.asignar(1, { cargoId: 8, nivelOrden: 14 });

      expect(cargoUnidadRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ nivelOrden: 14 }),
      );
    });

    it('maps unique violation (23505) to CARGO_YA_ASIGNADO', async () => {
      unidadRepo.findOne.mockResolvedValue({ id: '1' });
      cargoRepo.findOne.mockResolvedValue({ id: '8', activo: true });
      cargoUnidadRepo.findOne.mockResolvedValue(null);
      cargoUnidadRepo.save.mockRejectedValue({ code: '23505' });

      await expect(service.asignar(1, { cargoId: 8 })).rejects.toMatchObject({
        errorCode: 'CARGO_YA_ASIGNADO',
      });
    });
  });

  describe('actualizarAsignacion', () => {
    it('updates nivelOrden of the unit assignment', async () => {
      const row = { id: '50', unidadId: '1', cargoId: '8', nivelOrden: 10 };
      cargoUnidadRepo.findOne.mockResolvedValue(row);

      const result = await service.actualizarAsignacion(1, 50, {
        nivelOrden: 14,
      });

      expect(result).toBe(50);
      expect(cargoUnidadRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: '50', nivelOrden: 14 }),
      );
    });

    it('throws 404 when assignment does not belong to the unit', async () => {
      cargoUnidadRepo.findOne.mockResolvedValue(null);

      await expect(
        service.actualizarAsignacion(1, 50, { nivelOrden: 14 }),
      ).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
    });
  });

  describe('removerTodoPersonal', () => {
    it('throws 404 when unidad is not found', async () => {
      unidadRepo.findOne.mockResolvedValue(null);

      await expect(service.removerTodoPersonal(999)).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
      });
      expect(cargoUnidadRepo.softRemove).not.toHaveBeenCalled();
    });

    it('soft-removes all active personal rows in batch when found', async () => {
      unidadRepo.findOne.mockResolvedValue({ id: '1' });
      const mockRows = [
        { id: '10', unidadId: '1', activo: true },
        { id: '11', unidadId: '1', activo: true },
      ];
      cargoUnidadRepo.find.mockResolvedValue(mockRows);
      cargoUnidadRepo.softRemove.mockResolvedValue(mockRows);

      const result = await service.removerTodoPersonal(1);

      expect(cargoUnidadRepo.find).toHaveBeenCalledWith({
        where: { unidadId: '1', activo: true },
      });
      expect(cargoUnidadRepo.softRemove).toHaveBeenCalledWith(mockRows);
      expect(result).toEqual({ count: 2, unidadId: 1 });
    });

    it('returns count 0 without calling softRemove if no rows found', async () => {
      unidadRepo.findOne.mockResolvedValue({ id: '1' });
      cargoUnidadRepo.find.mockResolvedValue([]);

      const result = await service.removerTodoPersonal(1);

      expect(cargoUnidadRepo.softRemove).not.toHaveBeenCalled();
      expect(result).toEqual({ count: 0, unidadId: 1 });
    });
  });
});
