import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { Usuario } from '../auth/entities/usuario.entity';
import { Rol } from '../auth/entities/rol.entity';
import { UsuarioRol } from '../auth/entities/usuario-rol.entity';
import { UsuariosService } from './usuarios.service';

jest.mock('bcryptjs');

describe('UsuariosService', () => {
  let service: UsuariosService;
  let usuarioRepo: jest.Mocked<
    Pick<
      Repository<Usuario>,
      'find' | 'findOne' | 'create' | 'save'
    >
  >;
  let rolRepo: jest.Mocked<Pick<Repository<Rol>, 'find'>>;
  let usuarioRolRepo: jest.Mocked<
    Pick<Repository<UsuarioRol>, 'delete' | 'create' | 'save'>
  >;

  const adminRole = { id: 1, codigo: 'ADMIN', activo: true } as Rol;
  const operadorRole = { id: 2, codigo: 'OPERADOR', activo: true } as Rol;

  beforeEach(async () => {
    usuarioRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    rolRepo = {
      find: jest.fn(),
    };
    usuarioRolRepo = {
      delete: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuariosService,
        { provide: getRepositoryToken(Usuario), useValue: usuarioRepo },
        { provide: getRepositoryToken(Rol), useValue: rolRepo },
        {
          provide: getRepositoryToken(UsuarioRol),
          useValue: usuarioRolRepo,
        },
      ],
    }).compile();

    service = module.get(UsuariosService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listar', () => {
    it('returns users with roles and without passwordHash', async () => {
      usuarioRepo.find.mockResolvedValue([
        {
          id: '1',
          email: 'admin@admin.com',
          nombre: 'Administrador',
          enabled: true,
          passwordHash: 'secret-hash',
          usuarioRoles: [{ rol: { codigo: 'ADMIN' } }],
        } as unknown as Usuario,
      ]);

      const result = await service.listar();

      expect(result).toEqual([
        {
          id: '1',
          email: 'admin@admin.com',
          nombre: 'Administrador',
          enabled: true,
          roles: ['ADMIN'],
        },
      ]);
      expect(result[0]).not.toHaveProperty('passwordHash');
    });
  });

  describe('crear', () => {
    it('creates user with hashed password and assigned roles', async () => {
      usuarioRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: '10',
          email: 'op@test.com',
          nombre: 'Operador',
          enabled: true,
          usuarioRoles: [{ rol: { codigo: 'OPERADOR' } }],
        } as unknown as Usuario);
      rolRepo.find.mockResolvedValue([operadorRole]);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      usuarioRepo.create.mockImplementation((data) => data as Usuario);
      usuarioRepo.save.mockResolvedValue({
        id: '10',
        email: 'op@test.com',
      } as Usuario);
      usuarioRolRepo.create.mockImplementation((data) => data as UsuarioRol);
      usuarioRolRepo.save.mockResolvedValue([]);
      usuarioRolRepo.delete.mockResolvedValue({} as never);

      const result = await service.crear({
        email: 'op@test.com',
        password: 'password123',
        nombre: 'Operador',
        roles: ['OPERADOR'],
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(usuarioRolRepo.delete).toHaveBeenCalledWith({ usuarioId: '10' });
      expect(result).toEqual({
        id: '10',
        email: 'op@test.com',
        nombre: 'Operador',
        enabled: true,
        roles: ['OPERADOR'],
      });
    });

    it('rejects invalid role codes', async () => {
      usuarioRepo.findOne.mockResolvedValue(null);
      rolRepo.find.mockResolvedValue([]);

      await expect(
        service.crear({
          email: 'bad@test.com',
          password: 'password123',
          roles: ['OPERADOR'],
        }),
      ).rejects.toMatchObject({
        status: HttpStatus.BAD_REQUEST,
      });
      expect(usuarioRepo.save).not.toHaveBeenCalled();
    });

    it('rejects duplicate email', async () => {
      usuarioRepo.findOne.mockResolvedValue({ id: '1' } as Usuario);

      await expect(
        service.crear({
          email: 'admin@admin.com',
          password: 'password123',
          roles: ['ADMIN'],
        }),
      ).rejects.toBeInstanceOf(BusinessException);
    });
  });

  describe('actualizarEstado', () => {
    it('sets enabled flag', async () => {
      const user = {
        id: '1',
        email: 'admin@admin.com',
        nombre: 'Administrador',
        enabled: true,
        usuarioRoles: [{ rol: adminRole }],
      } as unknown as Usuario;

      usuarioRepo.findOne
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce({
          ...user,
          enabled: false,
        } as unknown as Usuario);
      usuarioRepo.save.mockImplementation(async (u) => u as Usuario);

      const result = await service.actualizarEstado('1', false);

      expect(usuarioRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: false }),
      );
      expect(result.enabled).toBe(false);
    });
  });
});
