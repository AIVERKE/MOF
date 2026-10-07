import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsFecCreacionInRange } from '../../../common/validators/fec-creacion-range.validator';

export class UnidadDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Za-z0-9.-]+$/, {
    message: 'El código solo puede contener letras, números, puntos y guiones',
  })
  codigo: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^[\p{L}0-9-]*$/u, {
    message: 'La sigla solo puede contener letras, números y guiones',
  })
  sigla?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Matches(/^[\p{L}0-9\s.,\-/()°º"']+$/u, {
    message: 'El nombre contiene caracteres especiales no permitidos',
  })
  nombre: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  parentId?: number | null;

  @ApiProperty({ description: 'Código o id del tipo (A/B/C o id numérico)' })
  @IsNotEmpty()
  tipo: string | number;

  @ApiProperty({ description: 'Código o id del nivel (D/E/O o id numérico)' })
  @IsNotEmpty()
  nivel: string | number;

  @ApiProperty()
  @IsBoolean()
  oficial: boolean;

  @ApiPropertyOptional({
    description: 'Indica si es unidad troncal del eje central de gobierno',
  })
  @IsOptional()
  @IsBoolean()
  esTroncal?: boolean;

  @ApiPropertyOptional({
    description:
      'Indica si es unidad sub-troncal (eje central local en su facultad o dirección)',
  })
  @IsOptional()
  @IsBoolean()
  esSubTroncal?: boolean;

  @ApiPropertyOptional({ description: 'Alias snake_case para esSubTroncal' })
  @IsOptional()
  @IsBoolean()
  es_sub_troncal?: boolean;

  @ApiPropertyOptional({ description: 'Alias esSubtroncal' })
  @IsOptional()
  @IsBoolean()
  esSubtroncal?: boolean;

  @ApiPropertyOptional({ description: 'Alias es_subtroncal' })
  @IsOptional()
  @IsBoolean()
  es_subtroncal?: boolean;

  @ApiPropertyOptional({
    description:
      'Lado o disposición en organigrama (CENTRO, IZQUIERDA, DERECHA, AUTOMATICO)',
  })
  @IsOptional()
  @IsString()
  lado?: string;

  @ApiProperty({ description: 'Código o id de relación (L/S o id numérico)' })
  @IsNotEmpty()
  relacion: string | number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resCreacion?: string;

  @ApiPropertyOptional({
    example: '1990-05-10',
    description: 'Entre 1825-01-01 y el 31/12 del año actual',
  })
  @IsOptional()
  @IsDateString()
  @IsFecCreacionInRange()
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
  @IsString()
  color?: string;

  @ApiProperty()
  @IsNumber()
  tipoUnidad: number;

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  dependenciasFuncionales?: number[];

  @ApiPropertyOptional({ description: 'Trámites atendidos por la unidad' })
  @IsOptional()
  @IsString()
  @Matches(/^[^@#$^*~{}[\]|\\<>`]*$/, {
    message: 'Trámites atendidos contiene caracteres no permitidos (@, #, $, ^, *, ~, {, }, [, ], |, \\, <, >)',
  })
  tramitesAtendidos?: string;

  @ApiPropertyOptional({ description: 'Ejecución del POA de la unidad' })
  @IsOptional()
  @IsString()
  @Matches(/^[^@#$^*~{}[\]|\\<>`]*$/, {
    message: 'Ejecución POA contiene caracteres no permitidos (@, #, $, ^, *, ~, {, }, [, ], |, \\, <, >)',
  })
  ejecucionPoa?: string;

  @ApiPropertyOptional({ description: 'Ejecución presupuestaria de la unidad' })
  @IsOptional()
  @IsString()
  @Matches(/^[^@#$^*~{}[\]|\\<>`]*$/, {
    message: 'Ejecución presupuestaria contiene caracteres no permitidos (@, #, $, ^, *, ~, {, }, [, ], |, \\, <, >)',
  })
  ejecucionPresupuestaria?: string;

  @ApiPropertyOptional({ description: 'Carga horaria programada' })
  @IsOptional()
  @IsString()
  @Matches(/^[^@#$^*~{}[\]|\\<>`]*$/, {
    message: 'Carga horaria programada contiene caracteres no permitidos (@, #, $, ^, *, ~, {, }, [, ], |, \\, <, >)',
  })
  cargaHorariaProgramada?: string;

  @ApiPropertyOptional({ description: 'Carga horaria ejecutada' })
  @IsOptional()
  @IsString()
  @Matches(/^[^@#$^*~{}[\]|\\<>`]*$/, {
    message: 'Carga horaria ejecutada contiene caracteres no permitidos (@, #, $, ^, *, ~, {, }, [, ], |, \\, <, >)',
  })
  cargaHorariaEjecutada?: string;

  @ApiPropertyOptional({ description: 'Infraestructura física utilizada' })
  @IsOptional()
  @IsString()
  @Matches(/^[^@#$^*~{}[\]|\\<>`]*$/, {
    message: 'Infraestructura física contiene caracteres no permitidos (@, #, $, ^, *, ~, {, }, [, ], |, \\, <, >)',
  })
  infraestructura?: string;

  @ApiPropertyOptional({ description: 'Ubicación física de la unidad' })
  @IsOptional()
  @IsString()
  @Matches(/^[^@#$^*~{}[\]|\\<>`]*$/, {
    message: 'Ubicación física contiene caracteres no permitidos (@, #, $, ^, *, ~, {, }, [, ], |, \\, <, >)',
  })
  ubicacion?: string;

  @ApiPropertyOptional({ description: 'Relaciones internas asociadas' })
  @IsOptional()
  @IsArray()
  relacionesInternas?: (number | UnidadRelacionInternaDto)[];

  @ApiPropertyOptional({ description: 'Relaciones externas asociadas' })
  @IsOptional()
  @IsArray()
  relacionesExternas?: (string | UnidadRelacionExternaDto)[];
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

export class UnidadRelacionInternaDto {
  @ApiProperty({ description: 'ID de la unidad relacionada' })
  @IsNumber()
  relacionadaId: number;

  @ApiPropertyOptional({ description: 'Tipo o motivo de la relación interna' })
  @IsOptional()
  @IsString()
  tipo?: string;
}

export class UnidadRelacionExternaDto {
  @ApiProperty({ description: 'Descripción de la relación externa' })
  @IsString()
  @IsNotEmpty()
  descripcion: string;
}
