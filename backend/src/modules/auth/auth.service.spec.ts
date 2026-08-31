import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { AuthService } from './auth.service';
import { Usuario } from './entities/usuario.entity';

jest.mock('bcryptjs');

describe('AuthService', () => {
  let service: AuthService;
  let usuarioRepository: jest.Mocked<Pick<Repository<Usuario>, 'findOne'>>;
  let jwtService: jest.Mocked<Pick<JwtService, 'sign'>>;

  const mockUser = {
    id: '1',
    email: 'admin@admin.com',
    passwordHash: '$2a$10$hashed',
    nombre: 'Administrador',
    enabled: true,
    usuarioRoles: [{ rol: { codigo: 'ADMIN' } }],
  };

  beforeEach(async () => {
    usuarioRepository = {
      findOne: jest.fn(),
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('signed.jwt.token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: jwtService },
        {
          provide: getRepositoryToken(Usuario),
          useValue: usuarioRepository,
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
});
