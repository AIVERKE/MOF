import {
  Controller,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiProduces,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { ResultResponse } from '../../../common/dto/result-response';
import { RestMessages } from '../../../common/constants/rest-messages';
import { UnidadesService } from '../../unidades/unidades.service';
import { UnidadPdfService } from '../../unidades/unidad-pdf.service';
import { CargosService } from '../../cargos/cargos.service';
import { CatalogosService } from '../../catalogos/catalogos.service';
import { ServiceTokenGuard } from './service-token.guard';
import { toMppPersonal } from './mpp-personal.mapper';

@ApiTags('Integraciones - MPP')
@ApiSecurity('api-key')
// MPP sincroniza cargos pidiendo el personal de cada unidad (cientos de
// peticiones seguidas); un 429 a mitad haría que MPP diera de baja cargos válidos.
@SkipThrottle()
@UseGuards(ServiceTokenGuard)
@Controller('api/v1/integraciones/mpp')
export class MppIntegracionController {
  constructor(
    private readonly unidadesService: UnidadesService,
    private readonly pdfService: UnidadPdfService,
    private readonly cargosService: CargosService,
    private readonly catalogosService: CatalogosService,
  ) {}

  @Get('unidades')
  @ApiOperation({
    summary:
      'Unidades del organigrama para MPP (solo lectura, header X-Api-Key)',
  })
  async unidades() {
    return ResultResponse.ok(
      RestMessages.FIND_SUCCESSFULLY,
      await this.unidadesService.lista(),
    );
  }

  @Get('unidades/:id/pdf')
  @ApiOperation({ summary: 'PDF de una unidad para MPP (header X-Api-Key)' })
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

  @Get('unidades/:id/personal')
  @ApiOperation({
    summary: 'Cargos de una unidad en formato MPP (header X-Api-Key)',
  })
  async personal(@Param('id', ParseIntPipe) id: number) {
    const rows = await this.cargosService.personal(id);
    return ResultResponse.ok(
      RestMessages.FIND_SUCCESSFULLY,
      toMppPersonal(rows),
    );
  }

  @Get('unidades/:id')
  @ApiOperation({
    summary: 'Detalle de una unidad para MPP (header X-Api-Key)',
  })
  async unidad(@Param('id', ParseIntPipe) id: number) {
    return ResultResponse.ok(
      RestMessages.FIND_SUCCESSFULLY,
      await this.unidadesService.findById(id),
    );
  }

  @Get('cargos')
  @ApiOperation({ summary: 'Catálogo de cargos para MPP (header X-Api-Key)' })
  async cargos() {
    return ResultResponse.ok(
      RestMessages.FIND_SUCCESSFULLY,
      await this.cargosService.list(),
    );
  }

  @Get('catalogos/tipos')
  @ApiOperation({ summary: 'Catálogo de tipos para MPP (header X-Api-Key)' })
  async tipos() {
    return ResultResponse.ok(
      RestMessages.FIND_SUCCESSFULLY,
      await this.catalogosService.listTipos(),
    );
  }

  @Get('catalogos/niveles')
  @ApiOperation({ summary: 'Catálogo de niveles para MPP (header X-Api-Key)' })
  async niveles() {
    return ResultResponse.ok(
      RestMessages.FIND_SUCCESSFULLY,
      await this.catalogosService.listNiveles(),
    );
  }

  @Get('catalogos/relaciones')
  @ApiOperation({
    summary: 'Catálogo de relaciones para MPP (header X-Api-Key)',
  })
  async relaciones() {
    return ResultResponse.ok(
      RestMessages.FIND_SUCCESSFULLY,
      await this.catalogosService.listRelaciones(),
    );
  }

  @Get('catalogos/clases')
  @ApiOperation({ summary: 'Catálogo de clases para MPP (header X-Api-Key)' })
  async clases() {
    return ResultResponse.ok(
      RestMessages.FIND_SUCCESSFULLY,
      await this.catalogosService.listClases(),
    );
  }
}
