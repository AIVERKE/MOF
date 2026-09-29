import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import type { Request } from 'express';
import { resolveServiceToken } from './service-token.util';

export const SERVICE_TOKEN_HEADER = 'x-api-key';

@Injectable()
export class ServiceTokenGuard implements CanActivate {
  private readonly expected: Buffer | null;

  constructor(configService: ConfigService) {
    const token = resolveServiceToken(configService);
    this.expected = token ? Buffer.from(token) : null;
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.headers[SERVICE_TOKEN_HEADER];

    if (!this.expected || typeof provided !== 'string') {
      throw new UnauthorizedException();
    }

    const candidate = Buffer.from(provided);
    if (
      candidate.length !== this.expected.length ||
      !timingSafeEqual(candidate, this.expected)
    ) {
      throw new UnauthorizedException();
    }

    return true;
  }
}
