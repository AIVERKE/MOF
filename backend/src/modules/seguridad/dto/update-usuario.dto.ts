import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { USUARIO_ROLE_CODES, type UsuarioRoleCode } from './create-usuario.dto';

export class UpdateUsuarioDto {
  @ApiPropertyOptional({ example: 'operador@umsa.bo' })
  @IsOptional()
  @IsEmail()
  email?: string;

  /** Reset manual por parte del administrador. */
  @ApiPropertyOptional({ example: 'password123', minLength: 6 })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({ example: '8123456' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  ci?: string;

  @ApiPropertyOptional({ example: 'Juan Carlos' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  nombres?: string;

  @ApiPropertyOptional({ example: 'Pérez' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  apellidoPaterno?: string;

  @ApiPropertyOptional({ example: 'Gutiérrez' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  apellidoMaterno?: string;

  @ApiPropertyOptional({
    example: ['OPERADOR', 'USER'],
    enum: USUARIO_ROLE_CODES,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsIn(USUARIO_ROLE_CODES, { each: true })
  roles?: UsuarioRoleCode[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
