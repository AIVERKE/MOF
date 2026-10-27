import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { UnidadesService } from './unidades.service';
import { UnidadPdfService } from './unidad-pdf.service';
import {
  DependenciaFuncionalDto,
  ProyectoDto,
  ProyectoGrupoResponseDto,
  ProyectoResponseDto,
  ProyectoTipoResponseDto,
  ProyectoUnidadRefDto,
  SetParentDto,
  UnidadContadoresResponseDto,
  UnidadDto,
  UnidadFuncionDto,
  UnidadInventarioDto,
  UnidadInventarioResponseDto,
  UnidadRelacionExternaDto,
  UnidadRelacionInternaDto,
  UnidadSiaDto,
  UnidadSiaResponseDto,
} from './dto/unidad.dto';
import { UpdateMofConfigDto } from './dto/mof-config.dto';
import { ResultResponse } from '../../common/dto/result-response';
import { RestMessages } from '../../common/constants/rest-messages';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

/** Esquema Swagger de `ResultResponse` con `data` tipado. */
function resultSchema(data: Record<string, unknown>) {
  return {
    allOf: [{ $ref: getSchemaPath(ResultResponse) }, { properties: { data } }],
  };
}

const inventarioSchema = { $ref: getSchemaPath(UnidadInventarioResponseDto) };
const siaSchema = { $ref: getSchemaPath(UnidadSiaResponseDto) };
const proyectoSchema = { $ref: getSchemaPath(ProyectoResponseDto) };
const proyectoTipoSchema = { $ref: getSchemaPath(ProyectoTipoResponseDto) };
const contadoresSchema = {
  $ref: getSchemaPath(UnidadContadoresResponseDto),
};

const PLANIFICACION_DESCRIPTION =
  'Bloque Planificación Estratégica: `planificacionEstrategicaAplica` (switch), `planificacionEstrategicaValor` (porcentaje 0–100, hasta 2 decimales) y `planificacionEstrategica` (texto). Con el switch en `true` el porcentaje y el texto son obligatorios (se aceptan los ya guardados si se omiten); con `false` se conservan pero no se exponen en el detalle.';

const COLOR_DESCRIPTION =
  'Color del nodo: `color` (`#RRGGBB`) es el color propio de la unidad; `null` o vacío vuelve a heredar el de la Clase y, si se omite, se conserva. Un color igual al de la Clase se guarda como `null`. Las lecturas devuelven `colorPropio` (guardado en la unidad), `colorClase` (`tipo_unidad.color`) y `color` (el efectivo: propio o, si no hay, el de la Clase).';

const UNIDAD_BAD_REQUEST =
  'Error de validación (`VALIDATION_FAILED`, p. ej. sigla con caracteres no permitidos como `@ # $ ^ * ~ { } [ ] | \\ < >` o espacios, porcentaje fuera de 0–100 o con más de 2 decimales, color que no es `#RRGGBB`), `UNIDAD_CODIGO_DUPLICADO`, `CATALOG_REF_NOT_FOUND`, `SIA_SOLO_CARRERA`, `PLANIFICACION_ESTRATEGICA_INCOMPLETA` (el switch está activo y falta el porcentaje o la descripción) o, en `proyectos`, `PROYECTOS_NO_APLICA`, `PROYECTO_UNIDAD_NO_APLICA`, `PROYECTO_NO_PERTENECE_UNIDAD` y `PROYECTO_ID_DUPLICADO`';

const PROYECTO_BAD_REQUEST =
  'Error de validación (`VALIDATION_FAILED`: `tipo` o `detalle` vacíos o demasiado largos, `unidadIds` con valores no enteros), `PROYECTOS_NO_APLICA` (la unidad no es un Decanato ni depende de uno) o `PROYECTO_UNIDAD_NO_APLICA` (una unidad de `unidadIds` no existe o no aplica)';

const SIA_BAD_REQUEST =
  'Error de validación, `SIA_SOLO_CARRERA` (la unidad no es de tipo Carrera) o `SIA_FILA_VACIA` (la fila no tiene ningún valor)';

@ApiTags('MOF - Unidades')
@ApiExtraModels(
  ResultResponse,
  UnidadInventarioResponseDto,
  UnidadSiaResponseDto,
  UnidadContadoresResponseDto,
  ProyectoUnidadRefDto,
  ProyectoResponseDto,
  ProyectoGrupoResponseDto,
  ProyectoTipoResponseDto,
)
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/mof')
export class MofUnidadesController {
  private readonly log = new Logger(MofUnidadesController.name);

  constructor(
    private readonly unidadesService: UnidadesService,
    private readonly pdfService: UnidadPdfService,
  ) {}

  @Get('unidades')
  @ApiOperation({
    summary: 'Listar unidades',
    description: `${COLOR_DESCRIPTION} Cada unidad trae \`aplicaProyectos\` (es un Decanato o depende de uno) y \`proyectosCount\` (proyectos en los que participa, incluidos los conjuntos; \`0\` si no aplica).`,
  })
  async list() {
    return ResultResponse.ok(
      RestMessages.FIND_SUCCESSFULLY,
      await this.unidadesService.lista(),
    );
  }

  @Get('config')
  @ApiOperation({
    summary: 'Configuración global y reglas de negocio dinámicas del MOF',
    description:
      '`paleta` es la grilla de swatches de los selectores de color. `paletaNodos` son los colores de nodo del organigrama, asignados por posición de la Clase cuando ni la unidad ni su Clase tienen color.',
  })
  async config() {
    return ResultResponse.ok(
      RestMessages.FIND_SUCCESSFULLY,
      await this.unidadesService.getConfig(),
    );
  }

  @Put('config')
  @Roles('ADMIN')
  @ApiOperation({
    summary:
      'Actualizar configuración MOF (defaults, reglas, paleta, paleta de nodos, política de contraseña)',
    description:
      '`defaults` y `reglas` se fusionan; `paleta` y `paletaNodos` se reemplazan completas. Todos los colores deben ser `#RRGGBB`; `paletaNodos` admite de 1 a 24 y se guarda en mayúsculas. Solo ADMIN.',
  })
  @ApiBadRequestResponse({
    description:
      'Error de validación (`VALIDATION_FAILED`, p. ej. un color de `paletaNodos` que no es `#RRGGBB`) o swatch de `paleta` no hexadecimal',
  })
  async updateConfig(@Body() dto: UpdateMofConfigDto) {
    return ResultResponse.ok(
      RestMessages.UPDATE_SUCCESSFULLY,
      await this.unidadesService.updateConfig(dto),
    );
  }

  @Get('dashboard/stats')
  @ApiOperation({
    summary: 'Estadísticas agregadas para Dashboard y Organigrama',
  })
  async dashboardStats(
    @Query('clase') clase?: string,
    @Query('nivel') nivel?: string,
    @Query('tipo') tipo?: string,
    @Query('relacion') relacion?: string,
  ) {
    return ResultResponse.ok(
      RestMessages.FIND_SUCCESSFULLY,
      await this.unidadesService.getDashboardStats({
        clase,
        nivel,
        tipo,
        relacion,
      }),
    );
  }

  // PDF must be registered before :id to avoid conflict
  @Get('unidades/pdf/:id')
  @ApiOperation({
    summary: 'PDF de unidad',
    description:
      'Cada PDF generado con éxito suma 1 a `descargasCount` de la unidad (no suma vistas). Si la generación falla no se cuenta; si falla el conteo, el PDF se entrega igual.',
  })
  @ApiParam({ name: 'id', description: 'ID de la unidad' })
  @ApiProduces('application/pdf')
  @ApiNotFoundResponse({ description: 'Unidad no encontrada' })
  @Header('Content-Type', 'application/pdf')
  async pdf(
    @Param('id', ParseIntPipe) id: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    const detail = await this.unidadesService.findEntityForPdf(id);
    const buffer = await this.pdfService.buildUnidadPdf(detail);
    // Una métrica no puede impedir la descarga: si falla, se registra y sigue.
    await this.unidadesService.registrarDescarga(id).catch((e: unknown) => {
      this.log.error(
        `no se pudo contar la descarga del PDF de la unidad ${id}: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
    });
    const safeCodigo = String(detail.codigo || id).replace(/[^\w.-]+/g, '_');
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="unidad-${safeCodigo}.pdf"`,
    });
    return new StreamableFile(buffer);
  }

  @Post('unidades/:id/vistas')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Registrar apertura de la ficha técnica',
    description:
      'Suma 1 a `vistasCount` de la unidad y devuelve ambos totales ya actualizados. Llamarlo solo al abrir el panel lateral de detalle: `GET /unidades/:id` no cuenta vistas porque también lo usan el formulario de edición y el organigrama. Disponible para cualquier usuario autenticado.',
  })
  @ApiParam({ name: 'id', description: 'ID de la unidad' })
  @ApiOkResponse({ schema: resultSchema(contadoresSchema) })
  @ApiNotFoundResponse({ description: 'Unidad no encontrada o dada de baja' })
  async registrarVista(@Param('id', ParseIntPipe) id: number) {
    return ResultResponse.ok(
      RestMessages.PERSIST_SUCCESSFULLY,
      await this.unidadesService.registrarVista(id),
    );
  }

  @Get('unidades/:id/descendientes-stats')
  @ApiOperation({
    summary: 'Árbol y estadísticas de dependientes para Dashboard Facultativo',
  })
  async descendientesStats(@Param('id', ParseIntPipe) id: number) {
    return ResultResponse.ok(
      RestMessages.FIND_SUCCESSFULLY,
      await this.unidadesService.getDescendientesStats(id),
    );
  }

  @Get('unidades/:id')
  @ApiOperation({
    summary: 'Obtener unidad por ID',
    description:
      'Incluye `esCarrera` (la clase de la unidad es Carrera) y `sia: [{ id, aprobados, reprobados, matriculados }]`; `sia` es `[]` cuando la unidad no es Carrera. Incluye `planificacionEstrategicaAplica`, `planificacionEstrategicaValor` y `planificacionEstrategica`; los dos últimos son `null` cuando el switch está apagado. Incluye `vistasCount` y `descargasCount` (métricas de uso); consultar este endpoint no los incrementa. Incluye `color`, `colorPropio` y `colorClase` (ver `GET /unidades`). Incluye `aplicaProyectos`, `proyectosCount`, `proyectos: [{ id, tipo, detalle, unidades }]` (orden de alta; `unidades` son todas las participantes) y `proyectosPorTipo: [{ tipo, cantidad, proyectos }]` (agrupados sin distinguir mayúsculas ni acentos, orden alfabético); ambos `[]` si la unidad no aplica.',
  })
  @ApiNotFoundResponse({ description: 'Unidad no encontrada' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return ResultResponse.ok(
      RestMessages.FIND_SUCCESSFULLY,
      await this.unidadesService.findById(id),
    );
  }

  @Post('unidades')
  @Roles('ADMIN', 'OPERADOR')
  @ApiOperation({
    summary: 'Registrar unidad',
    description: `${PLANIFICACION_DESCRIPTION} ${COLOR_DESCRIPTION}`,
  })
  @ApiBody({ type: UnidadDto })
  @ApiBadRequestResponse({ description: UNIDAD_BAD_REQUEST })
  async create(@Body() dto: UnidadDto) {
    return ResultResponse.ok(
      RestMessages.PERSIST_SUCCESSFULLY,
      await this.unidadesService.create(dto),
    );
  }

  @Put('unidades/:id')
  @Roles('ADMIN', 'OPERADOR')
  @ApiOperation({
    summary: 'Actualizar unidad',
    description: `${PLANIFICACION_DESCRIPTION} ${COLOR_DESCRIPTION} Los campos omitidos no se modifican; la validación se hace sobre el estado final de la unidad.`,
  })
  @ApiParam({ name: 'id', description: 'ID de la unidad' })
  @ApiBody({ type: UnidadDto })
  @ApiBadRequestResponse({ description: UNIDAD_BAD_REQUEST })
  @ApiNotFoundResponse({ description: 'Unidad no encontrada' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UnidadDto) {
    return ResultResponse.ok(
      RestMessages.UPDATE_SUCCESSFULLY,
      await this.unidadesService.update(id, dto),
    );
  }

  @Delete('unidades/:id')
  @Roles('ADMIN', 'OPERADOR')
  @ApiOperation({ summary: 'Eliminar unidad (borrado lógico)' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return ResultResponse.ok(
      RestMessages.UPDATE_SUCCESSFULLY,
      await this.unidadesService.remove(id),
    );
  }

  @Put('unidades/:id/setparent')
  @Roles('ADMIN', 'OPERADOR')
  @ApiOperation({ summary: 'Cambiar padre de la unidad' })
  async setParent(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetParentDto,
  ) {
    return ResultResponse.ok(
      RestMessages.FIND_SUCCESSFULLY,
      await this.unidadesService.setParent(id, dto),
    );
  }

  @Get('unidades/:id/funciones')
  @ApiOperation({ summary: 'Listar funciones de la unidad' })
  async listFunciones(@Param('id', ParseIntPipe) id: number) {
    return ResultResponse.ok(
      RestMessages.FIND_SUCCESSFULLY,
      await this.unidadesService.funciones(id),
    );
  }

  @Post('unidades/:id/funciones')
  @Roles('ADMIN', 'OPERADOR')
  @ApiOperation({ summary: 'Agregar función' })
  async addFuncion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UnidadFuncionDto,
  ) {
    return ResultResponse.ok(
      RestMessages.PERSIST_SUCCESSFULLY,
      await this.unidadesService.addFuncion(id, dto),
    );
  }

  @Get('unidades/:id/funciones/:funcionId')
  @ApiOperation({ summary: 'Obtener función' })
  async getFuncion(
    @Param('id', ParseIntPipe) id: number,
    @Param('funcionId', ParseIntPipe) funcionId: number,
  ) {
    return ResultResponse.ok(
      RestMessages.FIND_SUCCESSFULLY,
      await this.unidadesService.getFuncion(id, funcionId),
    );
  }

  @Put('unidades/:id/funciones/:funcionId')
  @Roles('ADMIN', 'OPERADOR')
  @ApiOperation({ summary: 'Actualizar función' })
  async updateFuncion(
    @Param('id', ParseIntPipe) id: number,
    @Param('funcionId', ParseIntPipe) funcionId: number,
    @Body() dto: UnidadFuncionDto,
  ) {
    return ResultResponse.ok(
      RestMessages.PERSIST_SUCCESSFULLY,
      await this.unidadesService.updateFuncion(id, funcionId, dto),
    );
  }

  @Delete('unidades/:id/funciones/:funcionId')
  @Roles('ADMIN', 'OPERADOR')
  @ApiOperation({ summary: 'Eliminar función' })
  async deleteFuncion(
    @Param('id', ParseIntPipe) id: number,
    @Param('funcionId', ParseIntPipe) funcionId: number,
  ) {
    return ResultResponse.ok(
      RestMessages.PERSIST_SUCCESSFULLY,
      await this.unidadesService.deleteFuncion(id, funcionId),
    );
  }

  @Put('unidades/:id/funciones/:funcionId/subir')
  @Roles('ADMIN', 'OPERADOR')
  @ApiOperation({ summary: 'Subir función en el orden' })
  async subirFuncion(
    @Param('id', ParseIntPipe) id: number,
    @Param('funcionId', ParseIntPipe) funcionId: number,
  ) {
    return ResultResponse.ok(
      RestMessages.PERSIST_SUCCESSFULLY,
      await this.unidadesService.subirFuncion(id, funcionId),
    );
  }

  @Put('unidades/:id/funciones/:funcionId/bajar')
  @Roles('ADMIN', 'OPERADOR')
  @ApiOperation({ summary: 'Bajar función en el orden' })
  async bajarFuncion(
    @Param('id', ParseIntPipe) id: number,
    @Param('funcionId', ParseIntPipe) funcionId: number,
  ) {
    return ResultResponse.ok(
      RestMessages.PERSIST_SUCCESSFULLY,
      await this.unidadesService.bajarFuncion(id, funcionId),
    );
  }

  @Post('unidades/:id/dependencias-funcionales')
  @Roles('ADMIN', 'OPERADOR')
  @ApiOperation({ summary: 'Agregar dependencia funcional' })
  async addDependencia(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DependenciaFuncionalDto,
  ) {
    return ResultResponse.ok(
      RestMessages.PERSIST_SUCCESSFULLY,
      await this.unidadesService.addDependencia(id, dto),
    );
  }

  @Delete('unidades/:id/dependencias-funcionales/:dependenciaId')
  @Roles('ADMIN', 'OPERADOR')
  @ApiOperation({ summary: 'Eliminar dependencia funcional' })
  async removeDependencia(
    @Param('id', ParseIntPipe) id: number,
    @Param('dependenciaId', ParseIntPipe) dependenciaId: number,
  ) {
    return ResultResponse.ok(
      RestMessages.UPDATE_SUCCESSFULLY,
      await this.unidadesService.removeDependencia(id, dependenciaId),
    );
  }

  // --- RELACIONES INTERNAS ---
  @Get('unidades/:id/relaciones-internas')
  @ApiOperation({ summary: 'Listar relaciones internas de la unidad' })
  async listRelacionesInternas(@Param('id', ParseIntPipe) id: number) {
    return ResultResponse.ok(
      RestMessages.FIND_SUCCESSFULLY,
      await this.unidadesService.listRelacionesInternas(id),
    );
  }

  @Post('unidades/:id/relaciones-internas')
  @Roles('ADMIN', 'OPERADOR')
  @ApiOperation({ summary: 'Agregar relación interna' })
  async addRelacionInterna(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UnidadRelacionInternaDto,
  ) {
    return ResultResponse.ok(
      RestMessages.PERSIST_SUCCESSFULLY,
      await this.unidadesService.addRelacionInterna(id, dto),
    );
  }

  @Delete('unidades/:id/relaciones-internas/:relacionId')
  @Roles('ADMIN', 'OPERADOR')
  @ApiOperation({ summary: 'Eliminar relación interna' })
  async removeRelacionInterna(
    @Param('id', ParseIntPipe) id: number,
    @Param('relacionId', ParseIntPipe) relacionId: number,
  ) {
    return ResultResponse.ok(
      RestMessages.UPDATE_SUCCESSFULLY,
      await this.unidadesService.removeRelacionInterna(id, relacionId),
    );
  }

  // --- RELACIONES EXTERNAS ---
  @Get('unidades/:id/relaciones-externas')
  @ApiOperation({ summary: 'Listar relaciones externas de la unidad' })
  async listRelacionesExternas(@Param('id', ParseIntPipe) id: number) {
    return ResultResponse.ok(
      RestMessages.FIND_SUCCESSFULLY,
      await this.unidadesService.listRelacionesExternas(id),
    );
  }

  @Post('unidades/:id/relaciones-externas')
  @Roles('ADMIN', 'OPERADOR')
  @ApiOperation({ summary: 'Agregar relación externa' })
  async addRelacionExterna(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UnidadRelacionExternaDto,
  ) {
    return ResultResponse.ok(
      RestMessages.PERSIST_SUCCESSFULLY,
      await this.unidadesService.addRelacionExterna(id, dto),
    );
  }

  @Put('unidades/:id/relaciones-externas/:relacionId')
  @Roles('ADMIN', 'OPERADOR')
  @ApiOperation({ summary: 'Actualizar relación externa' })
  async updateRelacionExterna(
    @Param('id', ParseIntPipe) id: number,
    @Param('relacionId', ParseIntPipe) relacionId: number,
    @Body() dto: UnidadRelacionExternaDto,
  ) {
    return ResultResponse.ok(
      RestMessages.PERSIST_SUCCESSFULLY,
      await this.unidadesService.updateRelacionExterna(id, relacionId, dto),
    );
  }

  @Delete('unidades/:id/relaciones-externas/:relacionId')
  @Roles('ADMIN', 'OPERADOR')
  @ApiOperation({ summary: 'Eliminar relación externa' })
  async removeRelacionExterna(
    @Param('id', ParseIntPipe) id: number,
    @Param('relacionId', ParseIntPipe) relacionId: number,
  ) {
    return ResultResponse.ok(
      RestMessages.UPDATE_SUCCESSFULLY,
      await this.unidadesService.removeRelacionExterna(id, relacionId),
    );
  }

  // --- INVENTARIOS ---
  @Get('unidades/:id/inventarios')
  @ApiOperation({ summary: 'Listar inventario de la unidad' })
  @ApiParam({ name: 'id', description: 'ID de la unidad' })
  @ApiOkResponse({
    schema: resultSchema({ type: 'array', items: inventarioSchema }),
  })
  @ApiNotFoundResponse({ description: 'Unidad no encontrada' })
  async listInventarios(@Param('id', ParseIntPipe) id: number) {
    return ResultResponse.ok(
      RestMessages.FIND_SUCCESSFULLY,
      await this.unidadesService.listInventarios(id),
    );
  }

  @Get('unidades/:id/inventarios/:inventarioId')
  @ApiOperation({ summary: 'Obtener ítem de inventario de la unidad' })
  @ApiParam({ name: 'id', description: 'ID de la unidad' })
  @ApiParam({ name: 'inventarioId', description: 'ID del ítem de inventario' })
  @ApiOkResponse({ schema: resultSchema(inventarioSchema) })
  @ApiNotFoundResponse({
    description: 'Unidad no encontrada o el ítem no pertenece a la unidad',
  })
  async getInventario(
    @Param('id', ParseIntPipe) id: number,
    @Param('inventarioId', ParseIntPipe) inventarioId: number,
  ) {
    return ResultResponse.ok(
      RestMessages.FIND_SUCCESSFULLY,
      await this.unidadesService.getInventario(id, inventarioId),
    );
  }

  @Post('unidades/:id/inventarios')
  @Roles('ADMIN', 'OPERADOR')
  @ApiOperation({ summary: 'Agregar ítem de inventario a la unidad' })
  @ApiParam({ name: 'id', description: 'ID de la unidad' })
  @ApiBody({ type: UnidadInventarioDto })
  @ApiCreatedResponse({ schema: resultSchema(inventarioSchema) })
  @ApiBadRequestResponse({ description: 'Error de validación' })
  @ApiForbiddenResponse({ description: 'Requiere rol ADMIN u OPERADOR' })
  @ApiNotFoundResponse({ description: 'Unidad no encontrada' })
  async addInventario(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UnidadInventarioDto,
  ) {
    return ResultResponse.ok(
      RestMessages.PERSIST_SUCCESSFULLY,
      await this.unidadesService.addInventario(id, dto),
    );
  }

  @Put('unidades/:id/inventarios/:inventarioId')
  @Roles('ADMIN', 'OPERADOR')
  @ApiOperation({ summary: 'Actualizar ítem de inventario de la unidad' })
  @ApiParam({ name: 'id', description: 'ID de la unidad' })
  @ApiParam({ name: 'inventarioId', description: 'ID del ítem de inventario' })
  @ApiBody({ type: UnidadInventarioDto })
  @ApiOkResponse({ schema: resultSchema(inventarioSchema) })
  @ApiBadRequestResponse({ description: 'Error de validación' })
  @ApiForbiddenResponse({ description: 'Requiere rol ADMIN u OPERADOR' })
  @ApiNotFoundResponse({
    description: 'Unidad no encontrada o el ítem no pertenece a la unidad',
  })
  async updateInventario(
    @Param('id', ParseIntPipe) id: number,
    @Param('inventarioId', ParseIntPipe) inventarioId: number,
    @Body() dto: UnidadInventarioDto,
  ) {
    return ResultResponse.ok(
      RestMessages.UPDATE_SUCCESSFULLY,
      await this.unidadesService.updateInventario(id, inventarioId, dto),
    );
  }

  @Delete('unidades/:id/inventarios/:inventarioId')
  @Roles('ADMIN', 'OPERADOR')
  @ApiOperation({ summary: 'Eliminar ítem de inventario (borrado lógico)' })
  @ApiParam({ name: 'id', description: 'ID de la unidad' })
  @ApiParam({ name: 'inventarioId', description: 'ID del ítem de inventario' })
  @ApiOkResponse({ schema: resultSchema({ type: 'boolean', example: true }) })
  @ApiForbiddenResponse({ description: 'Requiere rol ADMIN u OPERADOR' })
  @ApiNotFoundResponse({
    description: 'Unidad no encontrada o el ítem no pertenece a la unidad',
  })
  async removeInventario(
    @Param('id', ParseIntPipe) id: number,
    @Param('inventarioId', ParseIntPipe) inventarioId: number,
  ) {
    return ResultResponse.ok(
      RestMessages.UPDATE_SUCCESSFULLY,
      await this.unidadesService.removeInventario(id, inventarioId),
    );
  }

  // --- SIA (solo Carreras) ---
  @Get('unidades/:id/sia')
  @ApiOperation({
    summary: 'Listar filas SIA de la unidad',
    description: 'Devuelve `[]` si la unidad no es de tipo Carrera.',
  })
  @ApiParam({ name: 'id', description: 'ID de la unidad' })
  @ApiOkResponse({ schema: resultSchema({ type: 'array', items: siaSchema }) })
  @ApiNotFoundResponse({ description: 'Unidad no encontrada' })
  async listSia(@Param('id', ParseIntPipe) id: number) {
    return ResultResponse.ok(
      RestMessages.FIND_SUCCESSFULLY,
      await this.unidadesService.listSia(id),
    );
  }

  @Get('unidades/:id/sia/:siaId')
  @ApiOperation({ summary: 'Obtener fila SIA de la unidad' })
  @ApiParam({ name: 'id', description: 'ID de la unidad' })
  @ApiParam({ name: 'siaId', description: 'ID de la fila SIA' })
  @ApiOkResponse({ schema: resultSchema(siaSchema) })
  @ApiNotFoundResponse({
    description:
      'Unidad no encontrada, la unidad no es Carrera o la fila no pertenece a la unidad',
  })
  async getSia(
    @Param('id', ParseIntPipe) id: number,
    @Param('siaId', ParseIntPipe) siaId: number,
  ) {
    return ResultResponse.ok(
      RestMessages.FIND_SUCCESSFULLY,
      await this.unidadesService.getSia(id, siaId),
    );
  }

  @Post('unidades/:id/sia')
  @Roles('ADMIN', 'OPERADOR')
  @ApiOperation({ summary: 'Agregar fila SIA a una Carrera' })
  @ApiParam({ name: 'id', description: 'ID de la unidad' })
  @ApiBody({ type: UnidadSiaDto })
  @ApiCreatedResponse({ schema: resultSchema(siaSchema) })
  @ApiBadRequestResponse({ description: SIA_BAD_REQUEST })
  @ApiForbiddenResponse({ description: 'Requiere rol ADMIN u OPERADOR' })
  @ApiNotFoundResponse({ description: 'Unidad no encontrada' })
  async addSia(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UnidadSiaDto,
  ) {
    return ResultResponse.ok(
      RestMessages.PERSIST_SUCCESSFULLY,
      await this.unidadesService.addSia(id, dto),
    );
  }

  @Put('unidades/:id/sia/:siaId')
  @Roles('ADMIN', 'OPERADOR')
  @ApiOperation({
    summary: 'Actualizar fila SIA de una Carrera',
    description:
      'Reemplaza la fila completa: las columnas omitidas quedan en `null`.',
  })
  @ApiParam({ name: 'id', description: 'ID de la unidad' })
  @ApiParam({ name: 'siaId', description: 'ID de la fila SIA' })
  @ApiBody({ type: UnidadSiaDto })
  @ApiOkResponse({ schema: resultSchema(siaSchema) })
  @ApiBadRequestResponse({ description: SIA_BAD_REQUEST })
  @ApiForbiddenResponse({ description: 'Requiere rol ADMIN u OPERADOR' })
  @ApiNotFoundResponse({
    description: 'Unidad no encontrada o la fila no pertenece a la unidad',
  })
  async updateSia(
    @Param('id', ParseIntPipe) id: number,
    @Param('siaId', ParseIntPipe) siaId: number,
    @Body() dto: UnidadSiaDto,
  ) {
    return ResultResponse.ok(
      RestMessages.UPDATE_SUCCESSFULLY,
      await this.unidadesService.updateSia(id, siaId, dto),
    );
  }

  @Delete('unidades/:id/sia/:siaId')
  @Roles('ADMIN', 'OPERADOR')
  @ApiOperation({ summary: 'Eliminar fila SIA (borrado lógico)' })
  @ApiParam({ name: 'id', description: 'ID de la unidad' })
  @ApiParam({ name: 'siaId', description: 'ID de la fila SIA' })
  @ApiOkResponse({ schema: resultSchema({ type: 'boolean', example: true }) })
  @ApiBadRequestResponse({
    description: '`SIA_SOLO_CARRERA`: la unidad no es de tipo Carrera',
  })
  @ApiForbiddenResponse({ description: 'Requiere rol ADMIN u OPERADOR' })
  @ApiNotFoundResponse({
    description: 'Unidad no encontrada o la fila no pertenece a la unidad',
  })
  async removeSia(
    @Param('id', ParseIntPipe) id: number,
    @Param('siaId', ParseIntPipe) siaId: number,
  ) {
    return ResultResponse.ok(
      RestMessages.UPDATE_SUCCESSFULLY,
      await this.unidadesService.removeSia(id, siaId),
    );
  }

  // --- PROYECTOS (Decanato hacia abajo) ---
  @Get('proyectos/tipos')
  @ApiOperation({
    summary: 'Tipos de proyecto ya usados',
    description:
      'Sugerencias para el autocompletado del campo `tipo`, de más a menos usados. No restringe: el tipo es texto libre. Tipos que solo difieren en mayúsculas o acentos se cuentan juntos.',
  })
  @ApiOkResponse({
    schema: resultSchema({ type: 'array', items: proyectoTipoSchema }),
  })
  async tiposProyecto() {
    return ResultResponse.ok(
      RestMessages.FIND_SUCCESSFULLY,
      await this.unidadesService.tiposProyecto(),
    );
  }

  @Get('unidades/:id/proyectos')
  @ApiOperation({
    summary: 'Listar proyectos de la unidad',
    description:
      'Incluye los proyectos conjuntos en los que participa. Devuelve `[]` si la unidad no es un Decanato ni depende de uno.',
  })
  @ApiParam({ name: 'id', description: 'ID de la unidad' })
  @ApiOkResponse({
    schema: resultSchema({ type: 'array', items: proyectoSchema }),
  })
  @ApiNotFoundResponse({ description: 'Unidad no encontrada' })
  async listProyectos(@Param('id', ParseIntPipe) id: number) {
    return ResultResponse.ok(
      RestMessages.FIND_SUCCESSFULLY,
      await this.unidadesService.listProyectos(id),
    );
  }

  @Get('unidades/:id/proyectos/:proyectoId')
  @ApiOperation({ summary: 'Obtener proyecto de la unidad' })
  @ApiParam({ name: 'id', description: 'ID de la unidad' })
  @ApiParam({ name: 'proyectoId', description: 'ID del proyecto' })
  @ApiOkResponse({ schema: resultSchema(proyectoSchema) })
  @ApiNotFoundResponse({
    description:
      'Unidad no encontrada, la unidad no aplica o no participa en el proyecto',
  })
  async getProyecto(
    @Param('id', ParseIntPipe) id: number,
    @Param('proyectoId', ParseIntPipe) proyectoId: number,
  ) {
    return ResultResponse.ok(
      RestMessages.FIND_SUCCESSFULLY,
      await this.unidadesService.getProyecto(id, proyectoId),
    );
  }

  @Post('unidades/:id/proyectos')
  @Roles('ADMIN', 'OPERADOR')
  @ApiOperation({
    summary: 'Registrar proyecto en la unidad',
    description:
      'La unidad de la ruta participa siempre. `unidadIds` agrega otras unidades (proyecto conjunto): cada una suma el proyecto en su contador.',
  })
  @ApiParam({ name: 'id', description: 'ID de la unidad' })
  @ApiBody({ type: ProyectoDto })
  @ApiCreatedResponse({ schema: resultSchema(proyectoSchema) })
  @ApiBadRequestResponse({ description: PROYECTO_BAD_REQUEST })
  @ApiForbiddenResponse({ description: 'Requiere rol ADMIN u OPERADOR' })
  @ApiNotFoundResponse({ description: 'Unidad no encontrada' })
  async addProyecto(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ProyectoDto,
  ) {
    return ResultResponse.ok(
      RestMessages.PERSIST_SUCCESSFULLY,
      await this.unidadesService.addProyecto(id, dto),
    );
  }

  @Put('unidades/:id/proyectos/:proyectoId')
  @Roles('ADMIN', 'OPERADOR')
  @ApiOperation({
    summary: 'Actualizar proyecto de la unidad',
    description:
      'Reemplaza `tipo` y `detalle`. Si se envía `unidadIds`, reemplaza las otras unidades participantes (la de la ruta se conserva); si se omite, no cambian.',
  })
  @ApiParam({ name: 'id', description: 'ID de la unidad' })
  @ApiParam({ name: 'proyectoId', description: 'ID del proyecto' })
  @ApiBody({ type: ProyectoDto })
  @ApiOkResponse({ schema: resultSchema(proyectoSchema) })
  @ApiBadRequestResponse({ description: PROYECTO_BAD_REQUEST })
  @ApiForbiddenResponse({ description: 'Requiere rol ADMIN u OPERADOR' })
  @ApiNotFoundResponse({
    description: 'Unidad no encontrada o no participa en el proyecto',
  })
  async updateProyecto(
    @Param('id', ParseIntPipe) id: number,
    @Param('proyectoId', ParseIntPipe) proyectoId: number,
    @Body() dto: ProyectoDto,
  ) {
    return ResultResponse.ok(
      RestMessages.UPDATE_SUCCESSFULLY,
      await this.unidadesService.updateProyecto(id, proyectoId, dto),
    );
  }

  @Delete('unidades/:id/proyectos/:proyectoId')
  @Roles('ADMIN', 'OPERADOR')
  @ApiOperation({
    summary: 'Quitar proyecto de la unidad',
    description:
      'Desvincula la unidad del proyecto. Las demás unidades participantes lo conservan; si no queda ninguna, el proyecto se da de baja (borrado lógico).',
  })
  @ApiParam({ name: 'id', description: 'ID de la unidad' })
  @ApiParam({ name: 'proyectoId', description: 'ID del proyecto' })
  @ApiOkResponse({ schema: resultSchema({ type: 'boolean', example: true }) })
  @ApiBadRequestResponse({
    description:
      '`PROYECTOS_NO_APLICA`: la unidad no es un Decanato ni depende de uno',
  })
  @ApiForbiddenResponse({ description: 'Requiere rol ADMIN u OPERADOR' })
  @ApiNotFoundResponse({
    description: 'Unidad no encontrada o no participa en el proyecto',
  })
  async removeProyecto(
    @Param('id', ParseIntPipe) id: number,
    @Param('proyectoId', ParseIntPipe) proyectoId: number,
  ) {
    return ResultResponse.ok(
      RestMessages.UPDATE_SUCCESSFULLY,
      await this.unidadesService.removeProyecto(id, proyectoId),
    );
  }
}
