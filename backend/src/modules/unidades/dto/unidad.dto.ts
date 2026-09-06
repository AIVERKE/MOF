import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UnidadDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  codigo: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sigla?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  parentId?: number | null;

  @ApiPropertyOptional({ description: 'Código o id del tipo (A/B/C o id numérico)' })
  @IsOptional()
  tipo?: string | number;

  @ApiPropertyOptional({ description: 'Código o id del nivel (D/E/O o id numérico)' })
  @IsOptional()
  nivel?: string | number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  oficial?: boolean;

  @ApiPropertyOptional({ description: 'Indica si es unidad troncal del eje central de gobierno' })
  @IsOptional()
  @IsBoolean()
  esTroncal?: boolean;

  @ApiPropertyOptional({ description: 'Lado o disposición en organigrama (CENTRO, IZQUIERDA, DERECHA, AUTOMATICO)' })
  @IsOptional()
  @IsString()
  lado?: string;

  @ApiPropertyOptional({ description: 'Código o id de relación (L/S o id numérico)' })
  @IsOptional()
  relacion?: string | number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resCreacion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecCreacion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  objetivo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  baseLegal?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  tipoUnidad?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  clase?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  dependenciasFuncionales?: number[];
}

export class SetParentDto {
  @ApiProperty()
  @IsNumber()
  parentId: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  razon?: string;
}

export class UnidadFuncionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  funcion: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  baseLegal?: string;
}

export class DependenciaFuncionalDto {
  @ApiProperty()
  @IsNumber()
  dependenciaId: number;
}
