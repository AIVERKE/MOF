import { ApiPropertyOptional } from '@nestjs/swagger';
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
import {
  USUARIO_ROLE_CODES,
  type UsuarioRoleCode,
} from './create-usuario.dto';

export class UpdateUsuarioDto {
  @ApiPropertyOptional({ example: 'operador@umsa.bo' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'password123', minLength: 6 })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({ example: 'Operador MOF' })
  @IsOptional()
  @IsString()
  nombre?: string;

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
