import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { IsFecCreacionInRange } from '../../../common/validators/fec-creacion-range.validator';

const MAX_RELACIONES = 1000;

/**
 * Sigla: letras (incluye acentos y ñ), números, guion, punto, coma y apóstrofo.
 * Lista blanca: cualquier otro símbolo o espacio se rechaza. Debe coincidir con
 * `siglaFormato` del front (`frontend/src/utils/rules.js`).
 */
export const SIGLA_REGEX = /^[\p{L}0-9.,'-]*$/u;
export const SIGLA_FORMATO_MENSAJE =
  "La sigla solo puede contener letras, números, guiones, puntos, comas y apóstrofos (')";

export class UnidadDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Za-z0-9.-]+$/, {
    message: 'El código solo puede contener letras, números, puntos y guiones',
  })
  codigo: string;

  @ApiPropertyOptional({
    description:
      "Acrónimo de la unidad: letras, números, guion (-), punto (.), coma (,) y apóstrofo ('); cualquier otro símbolo o espacio responde `VALIDATION_FAILED`. Vacía, `-`, igual al código o solo numérica (ej. `1.2.3`) se ignora: en el alta se autogenera a partir del nombre y en la edición se conserva la actual. Se trunca a 32 caracteres y no es única.",
    pattern: SIGLA_REGEX.source,
    example: 'SEC.GRAL',
  })
  @IsOptional()
  @IsString()
  @Matches(SIGLA_REGEX, { message: SIGLA_FORMATO_MENSAJE })
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
  @ArrayMaxSize(MAX_RELACIONES)
  @Type(() => Number)
  dependenciasFuncionales?: number[];

  @ApiPropertyOptional({ description: 'Trámites atendidos por la unidad' })
  @IsOptional()
  @IsString()
  @Matches(/^[^@#$^*~{}[\]|\\<>`]*$/, {
    message:
      'Trámites atendidos contiene caracteres no permitidos (@, #, $, ^, *, ~, {, }, [, ], |, \\, <, >)',
  })
  tramitesAtendidos?: string;

  @ApiPropertyOptional({ description: 'Ejecución del POA de la unidad' })
  @IsOptional()
  @IsString()
  @Matches(/^[^@#$^*~{}[\]|\\<>`]*$/, {
    message:
      'Ejecución POA contiene caracteres no permitidos (@, #, $, ^, *, ~, {, }, [, ], |, \\, <, >)',
  })
  ejecucionPoa?: string;

  @ApiPropertyOptional({ description: 'Ejecución presupuestaria de la unidad' })
  @IsOptional()
  @IsString()
  @Matches(/^[^@#$^*~{}[\]|\\<>`]*$/, {
    message:
      'Ejecución presupuestaria contiene caracteres no permitidos (@, #, $, ^, *, ~, {, }, [, ], |, \\, <, >)',
  })
  ejecucionPresupuestaria?: string;

  @ApiPropertyOptional({ description: 'Carga horaria programada' })
  @IsOptional()
  @IsString()
  @Matches(/^[^@#$^*~{}[\]|\\<>`]*$/, {
    message:
      'Carga horaria programada contiene caracteres no permitidos (@, #, $, ^, *, ~, {, }, [, ], |, \\, <, >)',
  })
  cargaHorariaProgramada?: string;

  @ApiPropertyOptional({ description: 'Carga horaria ejecutada' })
  @IsOptional()
  @IsString()
  @Matches(/^[^@#$^*~{}[\]|\\<>`]*$/, {
    message:
      'Carga horaria ejecutada contiene caracteres no permitidos (@, #, $, ^, *, ~, {, }, [, ], |, \\, <, >)',
  })
  cargaHorariaEjecutada?: string;

  @ApiPropertyOptional({ description: 'Infraestructura física utilizada' })
  @IsOptional()
  @IsString()
  @Matches(/^[^@#$^*~{}[\]|\\<>`]*$/, {
    message:
      'Infraestructura física contiene caracteres no permitidos (@, #, $, ^, *, ~, {, }, [, ], |, \\, <, >)',
  })
  infraestructura?: string;

  @ApiPropertyOptional({ description: 'Ubicación física de la unidad' })
  @IsOptional()
  @IsString()
  @Matches(/^[^@#$^*~{}[\]|\\<>`]*$/, {
    message:
      'Ubicación física contiene caracteres no permitidos (@, #, $, ^, *, ~, {, }, [, ], |, \\, <, >)',
  })
  ubicacion?: string;

  @ApiPropertyOptional({
    description:
      'Switch del bloque Planificación Estratégica. Con `true`, `planificacionEstrategicaValor` y `planificacionEstrategica` son obligatorios (se aceptan los ya guardados si se omiten); con `false` se conservan pero el detalle los devuelve `null`. Si se omite, no se modifica (en alta: `false`).',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  planificacionEstrategicaAplica?: boolean;

  @ApiPropertyOptional({
    description:
      'Porcentaje de la Planificación Estratégica (0 a 100, hasta 2 decimales). Obligatorio si `planificacionEstrategicaAplica` es `true`. Si se omite, se conserva el valor guardado; `null` lo limpia.',
    type: 'number',
    format: 'float',
    minimum: 0,
    maximum: 100,
    nullable: true,
    example: 75.5,
  })
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false },
    {
      message:
        'El porcentaje de Planificación Estratégica debe ser un número con hasta 2 decimales',
    },
  )
  @Min(0, {
    message:
      'El porcentaje de Planificación Estratégica debe ser mayor o igual a 0',
  })
  @Max(100, {
    message:
      'El porcentaje de Planificación Estratégica debe ser menor o igual a 100',
  })
  planificacionEstrategicaValor?: number | null;

  @ApiPropertyOptional({
    description:
      'Descripción de la Planificación Estratégica. Obligatoria si `planificacionEstrategicaAplica` es `true`. Si se omite, se conserva el valor guardado; `null` o vacío la limpia.',
    nullable: true,
    example:
      'Plan Estratégico Institucional 2026–2030, eje 2: gestión académica',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @Matches(/^[^@#$^*~{}[\]|\\<>`]*$/, {
    message:
      'Planificación Estratégica contiene caracteres no permitidos (@, #, $, ^, *, ~, {, }, [, ], |, \\, <, >)',
  })
  planificacionEstrategica?: string | null;

  @ApiPropertyOptional({
    description:
      'Relaciones internas: ids de unidad o { relacionadaId, tipo }. Se ignoran repetidos, la propia unidad e ids inexistentes.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_RELACIONES)
  relacionesInternas?: (number | UnidadRelacionInternaDto)[];

  @ApiPropertyOptional({ description: 'Relaciones externas asociadas' })
  @IsOptional()
  @IsArray()
  relacionesExternas?: (string | UnidadRelacionExternaDto)[];

  @ApiPropertyOptional({
    type: () => [UnidadInventarioItemDto],
    description:
      'Inventario completo de la unidad. Filas con `id` se actualizan, filas sin `id` se crean y las vigentes que no se envían se dan de baja. Si se omite el campo, el inventario no se modifica.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_RELACIONES)
  @ValidateNested({ each: true })
  @Type(() => UnidadInventarioItemDto)
  inventarios?: UnidadInventarioItemDto[];

  @ApiPropertyOptional({
    type: () => [UnidadSiaItemDto],
    description:
      'Filas SIA de la unidad (solo unidades de tipo Carrera). Misma convención que `inventarios`: filas con `id` se actualizan, filas sin `id` se crean y las vigentes que no se envían se dan de baja. Si se omite el campo, no se modifica. Enviar filas en una unidad que no es Carrera responde `SIA_SOLO_CARRERA`; `[]` se ignora.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_RELACIONES)
  @ValidateNested({ each: true })
  @Type(() => UnidadSiaItemDto)
  sia?: UnidadSiaItemDto[];
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

const MAX_CANTIDAD = 2147483647;

export class UnidadInventarioDto {
  @ApiProperty({
    description: 'Descripción del ítem de inventario',
    example: 'Computadora de escritorio',
    maxLength: 1024,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty({ message: 'La descripción del inventario es obligatoria' })
  @MaxLength(1024)
  descripcion: string;

  @ApiProperty({ description: 'Cantidad de unidades', example: 3, minimum: 1 })
  @IsInt({ message: 'La cantidad debe ser un número entero' })
  @Min(1, { message: 'La cantidad debe ser mayor o igual a 1' })
  @Max(MAX_CANTIDAD)
  cantidad: number;
}

export class UnidadInventarioItemDto extends UnidadInventarioDto {
  @ApiPropertyOptional({
    description: 'ID del ítem existente; omitir para crear uno nuevo',
    example: 12,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  id?: number;
}

export class UnidadInventarioResponseDto {
  @ApiProperty({ example: 12 })
  id: number;

  @ApiProperty({ example: 'Computadora de escritorio' })
  descripcion: string;

  @ApiProperty({ example: 3 })
  cantidad: number;
}

export class UnidadContadoresResponseDto {
  @ApiProperty({
    description: 'Aperturas de la ficha técnica (panel lateral)',
    example: 12,
    minimum: 0,
    type: 'integer',
  })
  vistasCount: number;

  @ApiProperty({
    description: 'Descargas del reporte PDF de la unidad',
    example: 3,
    minimum: 0,
    type: 'integer',
  })
  descargasCount: number;
}

/**
 * Columnas de la tabla SIA. Para agregar una: columna en `UnidadSia` (+ migración),
 * propiedad en `UnidadSiaDto`/`UnidadSiaResponseDto` y su nombre aquí.
 */
export const SIA_CAMPOS = ['aprobados', 'reprobados', 'matriculados'] as const;
export type SiaCampo = (typeof SIA_CAMPOS)[number];

export class UnidadSiaDto {
  @ApiPropertyOptional({
    description: 'Cantidad de estudiantes aprobados',
    example: 120,
    minimum: 0,
    nullable: true,
    type: 'integer',
  })
  @IsOptional()
  @IsInt({ message: 'Aprobados debe ser un número entero' })
  @Min(0, { message: 'Aprobados debe ser mayor o igual a 0' })
  @Max(MAX_CANTIDAD)
  aprobados?: number | null;

  @ApiPropertyOptional({
    description: 'Cantidad de estudiantes reprobados',
    example: 30,
    minimum: 0,
    nullable: true,
    type: 'integer',
  })
  @IsOptional()
  @IsInt({ message: 'Reprobados debe ser un número entero' })
  @Min(0, { message: 'Reprobados debe ser mayor o igual a 0' })
  @Max(MAX_CANTIDAD)
  reprobados?: number | null;

  @ApiPropertyOptional({
    description: 'Cantidad de estudiantes matriculados',
    example: 150,
    minimum: 0,
    nullable: true,
    type: 'integer',
  })
  @IsOptional()
  @IsInt({ message: 'Matriculados debe ser un número entero' })
  @Min(0, { message: 'Matriculados debe ser mayor o igual a 0' })
  @Max(MAX_CANTIDAD)
  matriculados?: number | null;
}

export class UnidadSiaItemDto extends UnidadSiaDto {
  @ApiPropertyOptional({
    description: 'ID de la fila SIA existente; omitir para crear una nueva',
    example: 7,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  id?: number;
}

export class UnidadSiaResponseDto {
  @ApiProperty({ example: 7 })
  id: number;

  @ApiProperty({ example: 120, nullable: true, type: 'integer' })
  aprobados: number | null;

  @ApiProperty({ example: 30, nullable: true, type: 'integer' })
  reprobados: number | null;

  @ApiProperty({ example: 150, nullable: true, type: 'integer' })
  matriculados: number | null;
}
