import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { ErrorCodes } from '../../common/errors';
import { AuthService, PROPOSITO_CAMBIO_PASSWORD } from './auth.service';
import { Usuario } from './entities/usuario.entity';
import { MofConfig } from '../unidades/entities/mof-config.entity';

jest.mock('bcryptjs');

describe('AuthService', () => {
  let service: AuthService;
  let usuarioRepository: jest.Mocked<
    Pick<Repository<Usuario>, 'findOne' | 'save'>
  >;
  let mofConfigRepo: { findOne: jest.Mock };
  let jwtService: jest.Mocked<Pick<JwtService, 'sign' | 'verifyAsync'>>;

  const mockUser = {
    id: '1',
    email: 'admin@admin.com',
    passwordHash: '$2a$10$hashed',
    nombre: 'Administrador',
    enabled: true,
    debeCambiarPassword: false,
    usuarioRoles: [{ rol: { codigo: 'ADMIN' } }],
  };

  beforeEach(async () => {
    usuarioRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    mofConfigRepo = {
      findOne: jest.fn().mockResolvedValue({ passwordPolicy: { minLength: 6 } }),
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('signed.jwt.token'),
      verifyAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: jwtService },
        {
          provide: getRepositoryToken(Usuario),
          useValue: usuarioRepository,
        },
        {
          provide: getRepositoryToken(MofConfig),
          useValue: mofConfigRepo,
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('returns AuthUser when credentials are valid', async () => {
      usuarioRepository.findOne.mockResolvedValue(mockUser as Usuario);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('admin@admin.com', 'admin123');

      expect(result).toEqual({
        id: '1',
        email: 'admin@admin.com',
        nombre: 'Administrador',
        roles: ['ADMIN'],
      });
      expect(usuarioRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'admin@admin.com' },
        relations: ['usuarioRoles', 'usuarioRoles.rol'],
      });
    });

    it('returns null when user does not exist', async () => {
      usuarioRepository.findOne.mockResolvedValue(null);

      const result = await service.validateUser('missing@test.com', 'admin123');

      expect(result).toBeNull();
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('returns null when password is invalid', async () => {
      usuarioRepository.findOne.mockResolvedValue(mockUser as Usuario);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('admin@admin.com', 'wrong');

      expect(result).toBeNull();
    });

    it('returns null when user is disabled', async () => {
      usuarioRepository.findOne.mockResolvedValue({
        ...mockUser,
        enabled: false,
      } as Usuario);

      const result = await service.validateUser('admin@admin.com', 'admin123');

      expect(result).toBeNull();
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('blocks login while the first access is pending', async () => {
      usuarioRepository.findOne.mockResolvedValue({
        ...mockUser,
        debeCambiarPassword: true,
      } as Usuario);

      await expect(
        service.validateUser('admin@admin.com', 'admin123'),
      ).rejects.toMatchObject({
        errorCode: ErrorCodes.PRIMER_ACCESO_REQUERIDO,
      });
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('signs JWT with sub, email and roles and returns response shape', () => {
      const authUser = {
        id: '1',
        email: 'admin@admin.com',
        nombre: 'Administrador',
        roles: ['ADMIN'],
      };

      const result = service.login(authUser);

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: '1',
        email: 'admin@admin.com',
        roles: ['ADMIN'],
      });
      expect(result).toEqual({
        access_token: 'signed.jwt.token',
        user: authUser,
      });
    });
  });

  describe('primerAcceso', () => {
    const pendiente = {
      id: '10',
      email: 'op@test.com',
      enabled: true,
      debeCambiarPassword: true,
      persona: { ci: '8123456' },
    } as unknown as Usuario;

    it('returns a single-purpose token when the ci matches', async () => {
      usuarioRepository.findOne.mockResolvedValue(pendiente);

      const result = await service.primerAcceso({
        email: 'op@test.com',
        ci: '8123456',
      });

      expect(jwtService.sign).toHaveBeenCalledWith(
        { sub: '10', purpose: PROPOSITO_CAMBIO_PASSWORD },
        { expiresIn: '15m' },
      );
      expect(result).toEqual({ token: 'signed.jwt.token' });
    });

    it('rejects a ci that does not match', async () => {
      usuarioRepository.findOne.mockResolvedValue(pendiente);

      await expect(
        service.primerAcceso({ email: 'op@test.com', ci: '0000000' }),
      ).rejects.toMatchObject({
        errorCode: ErrorCodes.PRIMER_ACCESO_INVALIDO,
      });
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('rejects users that already defined their password', async () => {
      usuarioRepository.findOne.mockResolvedValue({
        ...pendiente,
        debeCambiarPassword: false,
      });

      await expect(
        service.primerAcceso({ email: 'op@test.com', ci: '8123456' }),
      ).rejects.toMatchObject({
        errorCode: ErrorCodes.PRIMER_ACCESO_INVALIDO,
      });
    });
  });

  describe('cambiarPassword', () => {
    it('stores the new hash and clears the pending flag', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        sub: '10',
        purpose: PROPOSITO_CAMBIO_PASSWORD,
      });
      usuarioRepository.findOne.mockResolvedValue({
        id: '10',
        enabled: true,
        debeCambiarPassword: true,
      } as Usuario);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-new');

      await service.cambiarPassword({
        token: 'temp.token',
        password: 'miClave123',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('miClave123', 10);
      expect(usuarioRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          passwordHash: 'hashed-new',
          debeCambiarPassword: false,
        }),
      );
    });

    it('rejects a token without the change-password purpose', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        sub: '10',
        email: 'op@test.com',
        roles: ['USER'],
      });

      await expect(
        service.cambiarPassword({
          token: 'session.token',
          password: 'x123456',
        }),
      ).rejects.toMatchObject({
        errorCode: ErrorCodes.PRIMER_ACCESO_INVALIDO,
      });
      expect(usuarioRepository.save).not.toHaveBeenCalled();
    });

    it('rejects an invalid or expired token', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      await expect(
        service.cambiarPassword({ token: 'bad.token', password: 'x123456' }),
      ).rejects.toMatchObject({
        errorCode: ErrorCodes.PRIMER_ACCESO_INVALIDO,
      });
    });
  });
});
