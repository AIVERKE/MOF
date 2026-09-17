import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { ErrorCodes } from '../../common/errors';
import { throwBusiness } from '../../common/exceptions/business.exception';
import { CambiarPasswordDto } from './dto/cambiar-password.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { PrimerAccesoDto } from './dto/primer-acceso.dto';
import { PrimerAccesoResponseDto } from './dto/primer-acceso-response.dto';
import { Usuario } from './entities/usuario.entity';

export type AuthUser = {
  id: string;
  email: string;
  nombre: string | null;
  roles: string[];
};

/**
 * Marca del token temporal de primer acceso. JwtStrategy rechaza cualquier
 * token que traiga un `purpose`, así que este no sirve como sesión.
 */
export const PROPOSITO_CAMBIO_PASSWORD = 'CAMBIO_PASSWORD';

const VIGENCIA_TOKEN_CAMBIO = '15m';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
  ) {}

  async validateUser(email: string, pass: string): Promise<AuthUser | null> {
    const user = await this.usuarioRepository.findOne({
      where: { email },
      relations: ['usuarioRoles', 'usuarioRoles.rol'],
    });

    if (!user || !user.enabled) {
      return null;
    }

    // Su hash es un valor aleatorio que nadie conoce: comparar no aportaría
    // nada y el mensaje genérico de credenciales dejaría al usuario sin saber
    // que le toca el primer acceso.
    if (user.debeCambiarPassword) {
      throwBusiness(ErrorCodes.PRIMER_ACCESO_REQUERIDO);
    }

    const passwordValid = await bcrypt.compare(pass, user.passwordHash);
    if (!passwordValid) {
      return null;
    }

    const roles = (user.usuarioRoles ?? [])
      .map((ur) => ur.rol?.codigo)
      .filter((codigo): codigo is string => Boolean(codigo));

    return {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      roles,
    };
  }

  login(user: AuthUser): LoginResponseDto {
    const payload = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        roles: user.roles,
      },
    };
  }

  /**
   * Primer acceso: el usuario se identifica con su email y el C.I. que el
   * administrador registró al crearlo, y recibe un token de un solo propósito
   * para definir su contraseña.
   */
  async primerAcceso(dto: PrimerAccesoDto): Promise<PrimerAccesoResponseDto> {
    const user = await this.usuarioRepository.findOne({
      where: { email: dto.email },
      relations: ['persona'],
    });

    const ciCoincide = user?.persona?.ci?.trim() === dto.ci.trim();

    if (!user || !user.enabled || !user.debeCambiarPassword || !ciCoincide) {
      throwBusiness(ErrorCodes.PRIMER_ACCESO_INVALIDO);
    }

    return {
      token: this.jwtService.sign(
        { sub: user.id, purpose: PROPOSITO_CAMBIO_PASSWORD },
        { expiresIn: VIGENCIA_TOKEN_CAMBIO },
      ),
    };
  }

  /** Define la contraseña definitiva y habilita el login normal. */
  async cambiarPassword(dto: CambiarPasswordDto): Promise<void> {
    let payload: { sub?: string; purpose?: string };
    try {
      payload = await this.jwtService.verifyAsync(dto.token);
    } catch {
      throwBusiness(ErrorCodes.PRIMER_ACCESO_INVALIDO);
    }

    if (payload.purpose !== PROPOSITO_CAMBIO_PASSWORD || !payload.sub) {
      throwBusiness(ErrorCodes.PRIMER_ACCESO_INVALIDO);
    }

    const user = await this.usuarioRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user || !user.enabled || !user.debeCambiarPassword) {
      throwBusiness(ErrorCodes.PRIMER_ACCESO_INVALIDO);
    }

    user.passwordHash = await bcrypt.hash(dto.password, 10);
    user.debeCambiarPassword = false;
    await this.usuarioRepository.save(user);
  }
}
