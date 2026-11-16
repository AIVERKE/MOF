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
  Min,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { IsFecCreacionInRange } from '../../../common/validators/fec-creacion-range.validator';

const MAX_RELACIONES = 1000;

/** Color hexadecimal de 6 dígitos (`#RRGGBB`), sin alfa ni forma corta. */
export const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

export class UnidadDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  codigo: string;

  @ApiPropertyOptional({
    description:
      'Acrónimo de la unidad en texto libre: admite espacios y cualquier signo, sin límite de longitud. Se guarda recortada (`trim`) y no es única. Vacía, `-`, igual al código o solo numérica (ej. `1.2.3`) se ignora: en el alta se autogenera a partir del nombre y en la edición se conserva la actual.',
    example: 'SEC. GRAL',
  })
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

  @ApiPropertyOptional({
    description:
      'Color propio del nodo en el organigrama (`#RRGGBB`). `null` o vacío vuelve a heredar el color de la Clase; si se omite, se conserva el guardado. Un color igual al de la Clase se guarda como `null`.',
    nullable: true,
    example: '#00897B',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() === '' ? null : value,
  )
  @IsOptional()
  @Matches(HEX_COLOR_REGEX, {
    message: 'El color debe tener el formato hexadecimal #RRGGBB',
  })
  color?: string | null;

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
  tramitesAtendidos?: string;

  @ApiPropertyOptional({ description: 'Ejecución del POA de la unidad' })
  @IsOptional()
  @IsString()
  ejecucionPoa?: string;

  @ApiPropertyOptional({ description: 'Ejecución presupuestaria de la unidad' })
  @IsOptional()
  @IsString()
  ejecucionPresupuestaria?: string;

  @ApiPropertyOptional({ description: 'Carga horaria programada' })
  @IsOptional()
  @IsString()
  cargaHorariaProgramada?: string;

  @ApiPropertyOptional({ description: 'Carga horaria ejecutada' })
  @IsOptional()
  @IsString()
  cargaHorariaEjecutada?: string;

  @ApiPropertyOptional({ description: 'Infraestructura física utilizada' })
  @IsOptional()
  @IsString()
  infraestructura?: string;

  @ApiPropertyOptional({ description: 'Ubicación física de la unidad' })
  @IsOptional()
  @IsString()
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
  planificacionEstrategica?: string | null;

  @ApiPropertyOptional({
    description:
      'Relaciones internas: ids de unidad o { relacionadaId, tipo }. Se ignoran repetidos, la propia unidad e ids inexistentes.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_RELACIONES)
  relacionesInternas?: (number | UnidadRelacionInternaDto)[];

  @ApiPropertyOptional({
    description:
      'Coordinación interna en texto libre (ej. "Unidades Organizacionales de la Facultad"). Se aceptan strings o `{ descripcion }`. Reemplaza la lista completa en el orden enviado: se recortan los textos, se descartan vacíos y repetidos. `[]` la vacía; si se omite, no se modifica. Independiente de `relacionesInternas`.',
    type: [String],
    example: [
      'Unidades Organizacionales de la Facultad',
      'Departamento de Planificación y Coordinación',
    ],
  })
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value)
      ? value.map((item: unknown) =>
          item && typeof item === 'object'
            ? (item as { descripcion?: unknown }).descripcion
            : item,
        )
      : value,
  )
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_RELACIONES)
  @IsString({
    each: true,
    message: 'Cada coordinación interna debe ser un texto',
  })
  coordinacionesInternas?: string[];

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

  @ApiPropertyOptional({
    type: () => [ProgramaItemDto],
    description:
      'Programas de la unidad (solo Decanatos y unidades que dependen de uno). Misma convención que `inventarios`: filas con `id` se actualizan, filas sin `id` se crean y los programas vigentes que no se envían se desvinculan de la unidad (si quedan sin unidades, se dan de baja). Si se omite el campo, no se modifica. Enviar filas en una unidad que no aplica responde `PROGRAMAS_NO_APLICA`; `[]` se ignora.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_RELACIONES)
  @ValidateNested({ each: true })
  @Type(() => ProgramaItemDto)
  programas?: ProgramaItemDto[];
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

export class UnidadCoordinacionInternaDto {
  @ApiProperty({
    description: 'Texto libre de coordinación interna (sin límite de longitud)',
    example: 'Unidades Organizacionales de la Facultad',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty({ message: 'La descripción de la coordinación es obligatoria' })
  descripcion: string;
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
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty({ message: 'La descripción del inventario es obligatoria' })
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

export class UnidadCoordinacionInternaResponseDto {
  @ApiProperty({ example: 4 })
  id: number;

  @ApiProperty({ example: 'Unidades Organizacionales de la Facultad' })
  descripcion: string;
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

/** Recorta y colapsa espacios: "  Interacción   social " → "Interacción social". */
const normalizarTexto = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;

export class ProgramaDto {
  @ApiProperty({
    description:
      'ID del tipo de programa (catálogo `GET /mof/programas/tipos`). Debe existir y estar activo (`TIPO_PROGRAMA_NO_EXISTE`).',
    example: 3,
  })
  @IsInt({ message: 'El tipo de programa es obligatorio' })
  @IsPositive({ message: 'El tipo de programa es obligatorio' })
  tipoId: number;

  @ApiProperty({
    description: 'Nombre que identifica al programa',
    example: 'Brigadas de Salud Comunitaria',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'El nombre del programa es obligatorio' })
  @IsNotEmpty({ message: 'El nombre del programa es obligatorio' })
  nombre: string;

  @ApiProperty({
    description: 'Detalle descriptivo del programa',
    example: 'Brigadas de salud comunitaria en municipios rurales de La Paz',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty({ message: 'El detalle del programa es obligatorio' })
  detalle: string;

  @ApiPropertyOptional({
    description:
      'Resolución que respalda el programa (texto libre). Vacío o `null` la deja sin resolución; al actualizar, omitirla también la borra.',
    example: 'Res. HCF N° 123/2026',
    nullable: true,
    type: String,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || null : value,
  )
  @IsOptional()
  @IsString()
  resolucion?: string | null;

  @ApiPropertyOptional({
    description:
      'Otras unidades que participan en el programa (programa conjunto). La unidad de la ruta siempre participa: no hace falta incluirla y se ignoran repetidos. Si se envía, reemplaza la lista de participantes; si se omite al actualizar, se conserva. Puede ser cualquier unidad vigente (`PROGRAMA_UNIDAD_NO_EXISTE` si no existe); las que no son Decanato ni dependen de uno ven el programa en solo lectura.',
    example: [42],
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_RELACIONES)
  @IsInt({
    each: true,
    message: 'Cada unidad participante debe ser un id entero',
  })
  @IsPositive({ each: true })
  unidadIds?: number[];
}

export class ProgramaItemDto extends ProgramaDto {
  @ApiPropertyOptional({
    description: 'ID del programa existente; omitir para crear uno nuevo',
    example: 5,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  id?: number;
}

export class ProgramaUnidadRefDto {
  @ApiProperty({ example: 42 })
  id: number;

  @ApiProperty({ example: '1.1.0.0.0.0.0.25.1.8.11.0.0.0' })
  codigo: string;

  @ApiProperty({ example: 'FCS-DEC' })
  sigla: string;

  @ApiProperty({ example: 'FACULTAD DE CIENCIAS SOCIALES - DECANATO' })
  nombre: string;
}

export class ProgramaResponseDto {
  @ApiProperty({ example: 5 })
  id: number;

  @ApiProperty({ example: 3, description: 'ID del tipo de programa' })
  tipoId: number;

  @ApiProperty({
    example: 'Programa Interacción Social y Extensión Universitaria',
    description: 'Descripción del tipo de programa',
  })
  tipo: string;

  @ApiProperty({ example: 'Brigadas de Salud Comunitaria' })
  nombre: string;

  @ApiProperty({
    example: 'Brigadas de salud comunitaria en municipios rurales de La Paz',
  })
  detalle: string;

  @ApiProperty({
    example: 'Res. HCF N° 123/2026',
    nullable: true,
    type: String,
  })
  resolucion: string | null;

  @ApiProperty({
    type: () => [ProgramaUnidadRefDto],
    description:
      'Todas las unidades vigentes que participan, incluida la consultada. Más de una indica un programa conjunto.',
  })
  unidades: ProgramaUnidadRefDto[];
}

export class ProgramaGrupoResponseDto {
  @ApiProperty({
    example: 'Programa Investigación',
    description: 'Descripción del tipo de programa',
  })
  tipo: string;

  @ApiProperty({ example: 2, description: 'Programas del grupo' })
  cantidad: number;

  @ApiProperty({ type: () => [ProgramaResponseDto] })
  programas: ProgramaResponseDto[];
}

export class CrearTipoProgramaDto {
  @ApiProperty({
    description:
      'Descripción del tipo nuevo. Si ya existe uno igual (sin distinguir mayúsculas, acentos ni espacios repetidos), se devuelve ese.',
    example: 'Programa de Posgrado',
  })
  @Transform(normalizarTexto)
  @IsString()
  @IsNotEmpty({ message: 'El tipo de programa es obligatorio' })
  tipo: string;
}

export class ProgramaTipoResponseDto {
  @ApiProperty({ example: 2 })
  id: number;

  @ApiProperty({ example: 'Programa Investigación' })
  tipo: string;

  @ApiProperty({
    example: 7,
    description: 'Programas vigentes registrados con ese tipo',
  })
  cantidad: number;
}
