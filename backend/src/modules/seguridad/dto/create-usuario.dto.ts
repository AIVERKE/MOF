import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export const USUARIO_ROLE_CODES = ['ADMIN', 'OPERADOR', 'USER'] as const;
export type UsuarioRoleCode = (typeof USUARIO_ROLE_CODES)[number];

export class CreateUsuarioDto {
  @ApiProperty({ example: 'operador@umsa.bo' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ example: 'Operador MOF' })
  @IsOptional()
  @IsString()
  nombre?: string;

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
