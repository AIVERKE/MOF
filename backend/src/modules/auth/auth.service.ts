import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { LoginResponseDto } from './dto/login-response.dto';
import { Usuario } from './entities/usuario.entity';

export type AuthUser = {
  id: string;
  email: string;
  nombre: string | null;
  roles: string[];
};

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
  ) {}

  async validateUser(
    email: string,
    pass: string,
  ): Promise<AuthUser | null> {
    const user = await this.usuarioRepository.findOne({
      where: { email },
      relations: ['usuarioRoles', 'usuarioRoles.rol'],
    });

    if (!user || !user.enabled) {
      return null;
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
}
