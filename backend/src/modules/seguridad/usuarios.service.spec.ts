import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { Usuario } from '../auth/entities/usuario.entity';
import { Rol } from '../auth/entities/rol.entity';
import { UsuarioRol } from '../auth/entities/usuario-rol.entity';
import { Persona } from '../personas/entities/persona.entity';
import { AuditoriaService } from '../versiones/auditoria.service';
import { UsuariosService } from './usuarios.service';

jest.mock('bcryptjs');

describe('UsuariosService', () => {
  let service: UsuariosService;
  let usuarioRepo: jest.Mocked<
    Pick<Repository<Usuario>, 'find' | 'findOne' | 'create' | 'save'>
  >;
  let rolRepo: jest.Mocked<Pick<Repository<Rol>, 'find'>>;
  let usuarioRolRepo: {
    delete: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let personaRepo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let auditoria: { registrarCambio: jest.Mock };
  let dataSource: { transaction: jest.Mock };

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
    personaRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    auditoria = { registrarCambio: jest.fn() };

    // La transacción corre contra los mismos mocks: así las aserciones no
    // dependen de si el repositorio viene del manager o de la inyección.
    const managerRepos = new Map<unknown, unknown>([
      [Usuario, usuarioRepo],
      [UsuarioRol, usuarioRolRepo],
      [Persona, personaRepo],
      [Rol, rolRepo],
    ]);
    const manager = {
      getRepository: (entity: unknown): unknown => managerRepos.get(entity),
    } as unknown as EntityManager;
    dataSource = {
      transaction: jest.fn((cb: (m: EntityManager) => Promise<unknown>) =>
        cb(manager),
      ),
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
        { provide: getRepositoryToken(Persona), useValue: personaRepo },
        { provide: DataSource, useValue: dataSource },
        { provide: AuditoriaService, useValue: auditoria },
      ],
    }).compile();

    service = module.get(UsuariosService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listar', () => {
    it('returns users with roles, persona data and without passwordHash', async () => {
      usuarioRepo.find.mockResolvedValue([
        {
          id: '1',
          email: 'admin@admin.com',
          nombre: 'Juan Carlos Pérez Gutiérrez',
          enabled: true,
          debeCambiarPassword: false,
          passwordHash: 'secret-hash',
          persona: {
            ci: '8123456',
            nombre: 'Juan Carlos',
            paterno: 'Pérez',
            materno: 'Gutiérrez',
          },
          usuarioRoles: [{ rol: { codigo: 'ADMIN' } }],
        } as unknown as Usuario,
      ]);

      const result = await service.listar();

      expect(result).toEqual([
        {
          id: '1',
          email: 'admin@admin.com',
          nombre: 'Juan Carlos Pérez Gutiérrez',
          ci: '8123456',
          nombres: 'Juan Carlos',
          apellidoPaterno: 'Pérez',
          apellidoMaterno: 'Gutiérrez',
          enabled: true,
          debeCambiarPassword: false,
          roles: ['ADMIN'],
        },
      ]);
      expect(result[0]).not.toHaveProperty('passwordHash');
    });
  });

  describe('crear', () => {
    const dto = {
      email: 'op@test.com',
      ci: '8123456',
      nombres: 'Juan Carlos',
      apellidoPaterno: 'Pérez',
      apellidoMaterno: 'Gutiérrez',
      roles: ['OPERADOR' as const],
    };

    function mockAltaFeliz() {
      // findOne 1: email libre. findOne 2: relectura final del usuario creado.
      usuarioRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({
        id: '10',
        email: 'op@test.com',
        nombre: 'Juan Carlos Pérez Gutiérrez',
        enabled: true,
        debeCambiarPassword: true,
        persona: {
          ci: '8123456',
          nombre: 'Juan Carlos',
          paterno: 'Pérez',
          materno: 'Gutiérrez',
        },
        usuarioRoles: [{ rol: { codigo: 'OPERADOR' } }],
      } as unknown as Usuario);
      personaRepo.findOne.mockResolvedValue(null);
      personaRepo.create.mockImplementation((data: Partial<Persona>) => data);
      personaRepo.save.mockImplementation((data: Partial<Persona>) =>
        Promise.resolve({ ...data, idPersona: '55' }),
      );
      rolRepo.find.mockResolvedValue([operadorRole]);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-placeholder');
      usuarioRepo.create.mockImplementation((data) => data as Usuario);
      usuarioRepo.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: '10' } as Usuario),
      );
      usuarioRolRepo.create.mockImplementation(
        (data: Partial<UsuarioRol>) => data,
      );
      usuarioRolRepo.save.mockResolvedValue([]);
      usuarioRolRepo.delete.mockResolvedValue({});
    }

    it('creates persona, links it and derives the display name', async () => {
      mockAltaFeliz();

      const result = await service.crear(dto, '1');

      expect(personaRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          ci: '8123456',
          nombre: 'Juan Carlos',
          paterno: 'Pérez',
          materno: 'Gutiérrez',
          email: 'op@test.com',
        }),
      );
      expect(usuarioRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'op@test.com',
          idPersona: '55',
          nombre: 'Juan Carlos Pérez Gutiérrez',
          debeCambiarPassword: true,
        }),
      );
      expect(usuarioRolRepo.delete).toHaveBeenCalledWith({ usuarioId: '10' });
      expect(result).toEqual({
        id: '10',
        email: 'op@test.com',
        nombre: 'Juan Carlos Pérez Gutiérrez',
        ci: '8123456',
        nombres: 'Juan Carlos',
        apellidoPaterno: 'Pérez',
        apellidoMaterno: 'Gutiérrez',
        enabled: true,
        debeCambiarPassword: true,
        roles: ['OPERADOR'],
      });
    });

    it('stores an unusable random password hash', async () => {
      mockAltaFeliz();

      await service.crear(dto, '1');

      expect(bcrypt.hash).toHaveBeenCalledTimes(1);
      const [plano, rounds] = (bcrypt.hash as jest.Mock).mock.calls[0] as [
        string,
        number,
      ];
      expect(rounds).toBe(10);
      expect(typeof plano).toBe('string');
      expect(plano).toHaveLength(64);
    });

    it('records the audit trail with the authenticated admin', async () => {
      mockAltaFeliz();

      await service.crear(dto, '7');

      expect(auditoria.registrarCambio).toHaveBeenCalledWith(
        expect.objectContaining({
          tablaAfectada: 'usuario',
          accion: 'CREATE',
          idRegistroOriginal: '10',
          idUsuario: '7',
          datosNuevos: {
            email: 'op@test.com',
            ci: '8123456',
            nombres: 'Juan Carlos',
            apellidoPaterno: 'Pérez',
            apellidoMaterno: 'Gutiérrez',
            roles: ['OPERADOR'],
            enabled: true,
          },
        }),
        expect.anything(),
      );
    });

    it('rejects duplicate ci without creating anything', async () => {
      usuarioRepo.findOne.mockResolvedValue(null);
      personaRepo.findOne.mockResolvedValue({ idPersona: '99' });

      await expect(service.crear(dto, '1')).rejects.toMatchObject({
        status: HttpStatus.BAD_REQUEST,
      });
      expect(personaRepo.save).not.toHaveBeenCalled();
      expect(usuarioRepo.save).not.toHaveBeenCalled();
      expect(auditoria.registrarCambio).not.toHaveBeenCalled();
    });

    it('rejects invalid role codes', async () => {
      usuarioRepo.findOne.mockResolvedValue(null);
      personaRepo.findOne.mockResolvedValue(null);
      rolRepo.find.mockResolvedValue([]);

      await expect(service.crear(dto, '1')).rejects.toMatchObject({
        status: HttpStatus.BAD_REQUEST,
      });
      expect(usuarioRepo.save).not.toHaveBeenCalled();
    });

    it('rejects duplicate email', async () => {
      usuarioRepo.findOne.mockResolvedValue({ id: '1' } as Usuario);

      await expect(service.crear(dto, '1')).rejects.toBeInstanceOf(
        BusinessException,
      );
      expect(personaRepo.findOne).not.toHaveBeenCalled();
    });
  });

  describe('actualizar', () => {
    it('updates the linked persona and re-derives the display name', async () => {
      const persona = {
        idPersona: '55',
        ci: '8123456',
        nombre: 'Juan',
        paterno: 'Pérez',
        materno: null,
      } as unknown as Persona;
      const user = {
        id: '10',
        email: 'op@test.com',
        nombre: 'Juan Pérez',
        enabled: true,
        debeCambiarPassword: false,
        idPersona: '55',
        persona,
        usuarioRoles: [{ rol: operadorRole }],
      } as unknown as Usuario;

      usuarioRepo.findOne.mockResolvedValue(user);
      personaRepo.findOne.mockResolvedValue(null);
      personaRepo.save.mockImplementation((data: Partial<Persona>) =>
        Promise.resolve(data),
      );
      usuarioRepo.save.mockImplementation((u) => Promise.resolve(u as Usuario));

      await service.actualizar('10', {
        nombres: 'Juan Carlos',
        apellidoMaterno: 'Gutiérrez',
      });

      expect(personaRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          nombre: 'Juan Carlos',
          materno: 'Gutiérrez',
        }),
      );
      expect(usuarioRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          nombre: 'Juan Carlos Pérez Gutiérrez',
        }),
      );
    });

    it('rejects a ci already used by another persona', async () => {
      const user = {
        id: '10',
        email: 'op@test.com',
        idPersona: '55',
        persona: { idPersona: '55', ci: '8123456' },
        usuarioRoles: [],
      } as unknown as Usuario;

      usuarioRepo.findOne.mockResolvedValue(user);
      personaRepo.findOne.mockResolvedValue({ idPersona: '99' });

      await expect(
        service.actualizar('10', { ci: '9999999' }),
      ).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
      expect(personaRepo.save).not.toHaveBeenCalled();
    });

    it('clears the pending first access when the admin sets a password', async () => {
      const user = {
        id: '10',
        email: 'op@test.com',
        nombre: 'Juan',
        enabled: true,
        debeCambiarPassword: true,
        idPersona: '55',
        persona: { idPersona: '55', ci: '8123456', nombre: 'Juan' },
        usuarioRoles: [],
      } as unknown as Usuario;

      usuarioRepo.findOne.mockResolvedValue(user);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      usuarioRepo.save.mockImplementation((u) => Promise.resolve(u as Usuario));

      await service.actualizar('10', { password: 'password123' });

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(usuarioRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ debeCambiarPassword: false }),
      );
    });
  });

  describe('actualizarEstado', () => {
    it('sets enabled flag', async () => {
      const user = {
        id: '1',
        email: 'admin@admin.com',
        nombre: 'Administrador',
        enabled: true,
        debeCambiarPassword: false,
        persona: null,
        usuarioRoles: [{ rol: adminRole }],
      } as unknown as Usuario;

      usuarioRepo.findOne.mockResolvedValueOnce(user).mockResolvedValueOnce({
        ...user,
        enabled: false,
      });
      usuarioRepo.save.mockImplementation((u) => Promise.resolve(u as Usuario));

      const result = await service.actualizarEstado('1', false);

      expect(usuarioRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: false }),
      );
      expect(result.enabled).toBe(false);
    });
  });
});
