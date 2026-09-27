import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
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
  ApiBearerAuth,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { UnidadesService } from './unidades.service';
import { UnidadPdfService } from './unidad-pdf.service';
import {
  DependenciaFuncionalDto,
  SetParentDto,
  UnidadDto,
  UnidadFuncionDto,
  UnidadRelacionExternaDto,
  UnidadRelacionInternaDto,
} from './dto/unidad.dto';
import { UpdateMofConfigDto } from './dto/mof-config.dto';
import { ResultResponse } from '../../common/dto/result-response';
import { RestMessages } from '../../common/constants/rest-messages';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('MOF - Unidades')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/mof')
export class MofUnidadesController {
  constructor(
    private readonly unidadesService: UnidadesService,
    private readonly pdfService: UnidadPdfService,
  ) {}

  @Get('unidades')
  @ApiOperation({ summary: 'Listar unidades' })
  async list() {
    return ResultResponse.ok(
      RestMessages.FIND_SUCCESSFULLY,
      await this.unidadesService.lista(),
    );
  }

  @Get('config')
  @ApiOperation({ summary: 'Configuración global y reglas de negocio dinámicas del MOF' })
  async config() {
    return ResultResponse.ok(
      RestMessages.FIND_SUCCESSFULLY,
      await this.unidadesService.getConfig(),
    );
  }

  @Put('config')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Actualizar configuración MOF (defaults, reglas, paleta, política de contraseña)',
  })
  async updateConfig(@Body() dto: UpdateMofConfigDto) {
    return ResultResponse.ok(
      RestMessages.UPDATE_SUCCESSFULLY,
      await this.unidadesService.updateConfig(dto),
    );
  }

  @Get('dashboard/stats')
  @ApiOperation({ summary: 'Estadísticas agregadas para Dashboard y Organigrama' })
  async dashboardStats(
    @Query('clase') clase?: string,
    @Query('nivel') nivel?: string,
    @Query('tipo') tipo?: string,
    @Query('relacion') relacion?: string,
  ) {
    return ResultResponse.ok(
      RestMessages.FIND_SUCCESSFULLY,
      await this.unidadesService.getDashboardStats({ clase, nivel, tipo, relacion }),
    );
  }

  // PDF must be registered before :id to avoid conflict
  @Get('unidades/pdf/:id')
  @ApiOperation({ summary: 'PDF de unidad' })
  @ApiProduces('application/pdf')
  @Header('Content-Type', 'application/pdf')
  async pdf(
    @Param('id', ParseIntPipe) id: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    const detail = await this.unidadesService.findEntityForPdf(id);
    const buffer = await this.pdfService.buildUnidadPdf(detail);
    const safeCodigo = String(detail.codigo || id).replace(/[^\w.-]+/g, '_');
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="unidad-${safeCodigo}.pdf"`,
    });
    return new StreamableFile(buffer);
  }

  @Get('unidades/:id/descendientes-stats')
  @ApiOperation({ summary: 'Árbol y estadísticas de dependientes para Dashboard Facultativo' })
  async descendientesStats(@Param('id', ParseIntPipe) id: number) {
    return ResultResponse.ok(
      RestMessages.FIND_SUCCESSFULLY,
      await this.unidadesService.getDescendientesStats(id),
    );
  }

  @Get('unidades/:id')
  @ApiOperation({ summary: 'Obtener unidad por ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return ResultResponse.ok(
      RestMessages.FIND_SUCCESSFULLY,
      await this.unidadesService.findById(id),
    );
  }

  @Post('unidades')
  @Roles('ADMIN', 'OPERADOR')
  @ApiOperation({ summary: 'Registrar unidad' })
  async create(@Body() dto: UnidadDto) {
    return ResultResponse.ok(
      RestMessages.PERSIST_SUCCESSFULLY,
      await this.unidadesService.create(dto),
    );
  }

  @Put('unidades/:id')
  @Roles('ADMIN', 'OPERADOR')
  @ApiOperation({ summary: 'Actualizar unidad' })
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
}
