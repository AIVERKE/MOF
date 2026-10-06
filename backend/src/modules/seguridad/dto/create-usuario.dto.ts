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
  Matches,
  MaxLength,
  ValidateIf,
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
  @IsNotEmpty({ message: 'El C.I. es obligatorio' })
  @MaxLength(32)
  @Matches(/^\d{4,10}(?:-[a-zA-Z0-9]{1,3})?$/, {
    message:
      'El C.I. debe tener entre 4 y 10 dígitos numéricos, con complemento opcional (ej. 8123456 o 8123456-1A)',
  })
  ci: string;

  @ApiProperty({ example: 'Juan Carlos' })
  @IsString()
  @IsNotEmpty({ message: 'Los nombres son obligatorios' })
  @MaxLength(128)
  @Matches(/^[\p{L}\s]+$/u, {
    message:
      'Los nombres solo deben contener letras, acentos, diéresis y espacios',
  })
  nombres: string;

  @ApiPropertyOptional({ example: 'Pérez' })
  @IsOptional()
  @ValidateIf((_, val) => val != null && val !== '')
  @IsString()
  @MaxLength(128)
  @Matches(/^[\p{L}\s]+$/u, {
    message:
      'El apellido paterno solo debe contener letras, acentos, diéresis y espacios',
  })
  apellidoPaterno?: string;

  @ApiPropertyOptional({ example: 'Gutiérrez' })
  @IsOptional()
  @ValidateIf((_, val) => val != null && val !== '')
  @IsString()
  @MaxLength(128)
  @Matches(/^[\p{L}\s]+$/u, {
    message:
      'El apellido materno solo debe contener letras, acentos, diéresis y espacios',
  })
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
