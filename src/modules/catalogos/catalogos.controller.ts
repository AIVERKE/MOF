import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CatalogosService } from './catalogos.service';
import { CatalogoItemDto, ClaseDto } from './dto/catalogo.dto';
import { ResultResponse } from '../../common/dto/result-response';
import { RestMessages } from '../../common/constants/rest-messages';

@ApiTags('MOF - Catálogos')
@Controller('api/v1/mof')
export class CatalogosController {
  constructor(private readonly catalogosService: CatalogosService) {}

  // ---- Tipos ----
  @Get('tipos')
  @ApiOperation({ summary: 'Listar tipos de unidad' })
  async listTipos() {
    return ResultResponse.ok(
      RestMessages.FIND_SUCCESSFULLY,
      await this.catalogosService.listTipos(),
    );
  }

  @Post('tipos')
  @ApiOperation({ summary: 'Crear tipo' })
  async createTipo(@Body() dto: CatalogoItemDto) {
    return ResultResponse.ok(
      RestMessages.PERSIST_SUCCESSFULLY,
      await this.catalogosService.createTipo(dto),
    );
  }

  @Put('tipos/:id')
  @ApiOperation({ summary: 'Actualizar tipo' })
  async updateTipo(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CatalogoItemDto,
  ) {
    return ResultResponse.ok(
      RestMessages.UPDATE_SUCCESSFULLY,
      await this.catalogosService.updateTipo(id, dto),
    );
  }

  @Delete('tipos/:id')
  @ApiOperation({ summary: 'Eliminar tipo (borrado lógico)' })
  async deleteTipo(@Param('id', ParseIntPipe) id: number) {
    return ResultResponse.ok(
      RestMessages.UPDATE_SUCCESSFULLY,
      await this.catalogosService.deleteTipo(id),
    );
  }

  // ---- Niveles ----
  @Get('niveles')
  @ApiOperation({ summary: 'Listar niveles' })
  async listNiveles() {
    return ResultResponse.ok(
      RestMessages.FIND_SUCCESSFULLY,
      await this.catalogosService.listNiveles(),
    );
  }

  @Post('niveles')
  @ApiOperation({ summary: 'Crear nivel' })
  async createNivel(@Body() dto: CatalogoItemDto) {
    return ResultResponse.ok(
      RestMessages.PERSIST_SUCCESSFULLY,
      await this.catalogosService.createNivel(dto),
    );
  }

  @Put('niveles/:id')
  @ApiOperation({ summary: 'Actualizar nivel' })
  async updateNivel(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CatalogoItemDto,
  ) {
    return ResultResponse.ok(
      RestMessages.UPDATE_SUCCESSFULLY,
      await this.catalogosService.updateNivel(id, dto),
    );
  }

  @Delete('niveles/:id')
  @ApiOperation({ summary: 'Eliminar nivel (borrado lógico)' })
  async deleteNivel(@Param('id', ParseIntPipe) id: number) {
    return ResultResponse.ok(
      RestMessages.UPDATE_SUCCESSFULLY,
      await this.catalogosService.deleteNivel(id),
    );
  }

  // ---- Relaciones ----
  @Get('relaciones')
  @ApiOperation({ summary: 'Listar relaciones' })
  async listRelaciones() {
    return ResultResponse.ok(
      RestMessages.FIND_SUCCESSFULLY,
      await this.catalogosService.listRelaciones(),
    );
  }

  @Post('relaciones')
  @ApiOperation({ summary: 'Crear relación' })
  async createRelacion(@Body() dto: CatalogoItemDto) {
    return ResultResponse.ok(
      RestMessages.PERSIST_SUCCESSFULLY,
      await this.catalogosService.createRelacion(dto),
    );
  }

  @Put('relaciones/:id')
  @ApiOperation({ summary: 'Actualizar relación' })
  async updateRelacion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CatalogoItemDto,
  ) {
    return ResultResponse.ok(
      RestMessages.UPDATE_SUCCESSFULLY,
      await this.catalogosService.updateRelacion(id, dto),
    );
  }

  @Delete('relaciones/:id')
  @ApiOperation({ summary: 'Eliminar relación (borrado lógico)' })
  async deleteRelacion(@Param('id', ParseIntPipe) id: number) {
    return ResultResponse.ok(
      RestMessages.UPDATE_SUCCESSFULLY,
      await this.catalogosService.deleteRelacion(id),
    );
  }

  // ---- Clases ----
  @Get('clases')
  @ApiOperation({ summary: 'Listar clases (tipo_unidad)' })
  async listClases() {
    return ResultResponse.ok(
      RestMessages.FIND_SUCCESSFULLY,
      await this.catalogosService.listClases(),
    );
  }

  @Post('clases')
  @ApiOperation({ summary: 'Crear clase' })
  async createClase(@Body() dto: ClaseDto) {
    return ResultResponse.ok(
      RestMessages.PERSIST_SUCCESSFULLY,
      await this.catalogosService.createClase(dto),
    );
  }

  @Put('clases/:id')
  @ApiOperation({ summary: 'Actualizar clase' })
  async updateClase(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ClaseDto,
  ) {
    return ResultResponse.ok(
      RestMessages.UPDATE_SUCCESSFULLY,
      await this.catalogosService.updateClase(id, dto),
    );
  }

  @Delete('clases/:id')
  @ApiOperation({ summary: 'Eliminar clase (borrado lógico)' })
  async deleteClase(@Param('id', ParseIntPipe) id: number) {
    return ResultResponse.ok(
      RestMessages.UPDATE_SUCCESSFULLY,
      await this.catalogosService.deleteClase(id),
    );
  }

  @Put('clases/:id/subir')
  @ApiOperation({ summary: 'Subir clase en el orden (peso)' })
  async subirClase(@Param('id', ParseIntPipe) id: number) {
    return ResultResponse.ok(
      RestMessages.UPDATE_SUCCESSFULLY,
      await this.catalogosService.subirClase(id),
    );
  }

  @Put('clases/:id/bajar')
  @ApiOperation({ summary: 'Bajar clase en el orden (peso)' })
  async bajarClase(@Param('id', ParseIntPipe) id: number) {
    return ResultResponse.ok(
      RestMessages.UPDATE_SUCCESSFULLY,
      await this.catalogosService.bajarClase(id),
    );
  }
}
