import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { resolveJwtSecret } from '../jwt-secret.util';

interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
  /** Presente solo en tokens de un solo propósito (p.ej. primer acceso). */
  purpose?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: resolveJwtSecret(configService),
    });
  }

  validate(payload: JwtPayload) {
    // Los tokens de un solo propósito se firman con el mismo secreto, así que
    // aquí es donde se impide que uno de primer acceso valga como sesión.
    if (payload.purpose) {
      throw new UnauthorizedException('Token no válido para esta operación');
    }

    return {
      userId: payload.sub,
      email: payload.email,
      roles: payload.roles ?? [],
    };
  }
}
