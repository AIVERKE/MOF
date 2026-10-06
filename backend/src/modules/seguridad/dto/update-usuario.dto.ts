import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
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
  @ValidateIf((_, val) => val != null && val !== '')
  @IsString()
  @MaxLength(32)
  @Matches(/^\d{4,10}(?:-[a-zA-Z0-9]{1,3})?$/, {
    message:
      'El C.I. debe tener entre 4 y 10 dígitos numéricos, con complemento opcional (ej. 8123456 o 8123456-1A)',
  })
  ci?: string;

  @ApiPropertyOptional({ example: 'Juan Carlos' })
  @IsOptional()
  @ValidateIf((_, val) => val != null && val !== '')
  @IsString()
  @MaxLength(128)
  @Matches(/^[\p{L}\s]+$/u, {
    message:
      'Los nombres solo deben contener letras, acentos, diéresis y espacios',
  })
  nombres?: string;

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
