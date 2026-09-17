import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export const USUARIO_ROLE_CODES = ['ADMIN', 'OPERADOR', 'USER'] as const;
export type UsuarioRoleCode = (typeof USUARIO_ROLE_CODES)[number];

/**
 * El alta no lleva contraseña: el usuario la define él mismo en el primer
 * acceso, identificándose con este email y este C.I.
 */
export class CreateUsuarioDto {
  @ApiProperty({ example: 'operador@umsa.bo' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '8123456' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  ci: string;

  @ApiProperty({ example: 'Juan Carlos' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  nombres: string;

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

  @ApiProperty({
    example: ['OPERADOR'],
    enum: USUARIO_ROLE_CODES,
    isArray: true,
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsIn(USUARIO_ROLE_CODES, { each: true })
  roles: UsuarioRoleCode[];

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
