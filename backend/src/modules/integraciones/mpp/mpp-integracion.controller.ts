import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { ResultResponse } from '../../../common/dto/result-response';
import { RestMessages } from '../../../common/constants/rest-messages';
import { UnidadesService } from '../../unidades/unidades.service';
import { CargosService } from '../../cargos/cargos.service';
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
    private readonly cargosService: CargosService,
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
}
