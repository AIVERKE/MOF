import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  validateUser(username: string, pass: string): Promise<unknown> {
    void username;
    void pass;
    return Promise.resolve(null);
  }

  login(user: unknown): { access_token: string; user: unknown } {
    void user;
    return {
      access_token: this.jwtService.sign({}),
      user: null,
    };
  }
}
