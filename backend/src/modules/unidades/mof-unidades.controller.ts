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
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { UnidadesService } from './unidades.service';
import { UnidadPdfService } from './unidad-pdf.service';
import {
  DependenciaFuncionalDto,
  SetParentDto,
  UnidadDto,
  UnidadFuncionDto,
} from './dto/unidad.dto';
import { ResultResponse } from '../../common/dto/result-response';
import { RestMessages } from '../../common/constants/rest-messages';

@ApiTags('MOF - Unidades')
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

  // PDF must be registered before :id to avoid conflict
  @Get('unidades/pdf/:id')
  @ApiOperation({ summary: 'PDF de unidad' })
  @ApiProduces('application/pdf')
  @Header('Content-Type', 'application/pdf')
  async pdf(
    @Param('id', ParseIntPipe) id: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { unidad, funciones } =
      await this.unidadesService.findEntityForPdf(id);
    const buffer = await this.pdfService.buildUnidadPdf(unidad, funciones);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="signed-document.pdf"',
    });
    return new StreamableFile(buffer);
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
  @ApiOperation({ summary: 'Registrar unidad' })
  async create(@Body() dto: UnidadDto) {
    return ResultResponse.ok(
      RestMessages.PERSIST_SUCCESSFULLY,
      await this.unidadesService.create(dto),
    );
  }

  @Put('unidades/:id')
  @ApiOperation({ summary: 'Actualizar unidad' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UnidadDto,
  ) {
    return ResultResponse.ok(
      RestMessages.UPDATE_SUCCESSFULLY,
      await this.unidadesService.update(id, dto),
    );
  }

  @Delete('unidades/:id')
  @ApiOperation({ summary: 'Eliminar unidad (borrado lógico)' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return ResultResponse.ok(
      RestMessages.UPDATE_SUCCESSFULLY,
      await this.unidadesService.remove(id),
    );
  }

  @Put('unidades/:id/setparent')
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

  @Post('unidades/:id/dependencias-funcionales')
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
}
