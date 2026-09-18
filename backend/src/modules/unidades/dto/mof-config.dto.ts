import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsHexColor,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

class MofDefaultsDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  tipo?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  nivel?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  relacion?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  clase?: number;

  @ApiPropertyOptional({ example: '#1976D2' })
  @IsOptional()
  @IsHexColor()
  color?: string;

  @ApiPropertyOptional({ example: 'AUTOMATICO' })
  @IsOptional()
  @IsString()
  @IsIn(['AUTOMATICO', 'IZQUIERDA', 'DERECHA', 'CENTRO'])
  lado?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  oficial?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  es_troncal?: boolean;
}

class MofReglasDto {
  @ApiPropertyOptional({ example: 99 })
  @IsOptional()
  @IsNumber()
  pesoNulo?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  pesoDefault?: number;

  @ApiPropertyOptional({ example: '#757575' })
  @IsOptional()
  @IsHexColor()
  defaultClaseColor?: string;

  @ApiPropertyOptional({ example: ['S'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  staffRelacionCodigos?: string[];

  @ApiPropertyOptional({ example: 'CENTRO' })
  @IsOptional()
  @IsString()
  @IsIn(['AUTOMATICO', 'IZQUIERDA', 'DERECHA', 'CENTRO'])
  ladoTroncalForzado?: string;
}

class MofPasswordPolicyDto {
  @ApiPropertyOptional({ example: 6, minimum: 6, maximum: 128 })
  @IsOptional()
  @IsInt()
  @Min(6)
  @Max(128)
  minLength?: number;
}

export class UpdateMofConfigDto {
  @ApiPropertyOptional({ type: MofDefaultsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MofDefaultsDto)
  defaults?: MofDefaultsDto;

  @ApiPropertyOptional({ type: MofReglasDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MofReglasDto)
  reglas?: MofReglasDto;

  @ApiPropertyOptional({
    description: 'Grilla de swatches (filas de colores hex)',
    example: [['#1976D2', '#2196F3']],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsArray({ each: true })
  paleta?: string[][];

  @ApiPropertyOptional({ type: MofPasswordPolicyDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MofPasswordPolicyDto)
  passwordPolicy?: MofPasswordPolicyDto;
}
