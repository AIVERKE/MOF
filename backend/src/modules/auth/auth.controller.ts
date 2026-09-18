import {
  Controller,
  Post,
  UseGuards,
  Req,
  Get,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService, AuthUser } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { PrimerAccesoDto } from './dto/primer-acceso.dto';
import { PrimerAccesoResponseDto } from './dto/primer-acceso-response.dto';
import { CambiarPasswordDto } from './dto/cambiar-password.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user and return JWT token' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Success', type: LoginResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  login(@Req() req: Request, @Body() _loginDto: LoginDto) {
    return this.authService.login(req.user as AuthUser);
  }

  @Post('primer-acceso')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Primer acceso con email y C.I.',
    description:
      'Valida la identidad del usuario recién creado y devuelve un token temporal para definir su contraseña.',
  })
  @ApiBody({ type: PrimerAccesoDto })
  @ApiResponse({
    status: 200,
    description: 'Token temporal',
    type: PrimerAccesoResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Datos de primer acceso inválidos' })
  primerAcceso(@Body() dto: PrimerAccesoDto) {
    return this.authService.primerAcceso(dto);
  }

  @Post('cambiar-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Definir contraseña con el token de primer acceso',
  })
  @ApiBody({ type: CambiarPasswordDto })
  @ApiResponse({ status: 200, description: 'Contraseña definida' })
  @ApiResponse({ status: 401, description: 'Token inválido o expirado' })
  async cambiarPassword(@Body() dto: CambiarPasswordDto) {
    await this.authService.cambiarPassword(dto);
  }

  @Get('password-policy')
  @ApiOperation({
    summary: 'Política de contraseñas (público)',
    description:
      'Longitud mínima configurada en mof_config. Usado por Login antes de autenticarse.',
  })
  @ApiResponse({ status: 200, description: 'Política de contraseña' })
  getPasswordPolicy() {
    return this.authService.getPasswordPolicy();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile (Protected)' })
  @ApiResponse({ status: 200, description: 'Return the current user profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getProfile(@Req() req: Request) {
    return req.user;
  }
}
