import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ResultResponse } from '../../../common/dto/result-response';
import { RestMessages } from '../../../common/constants/rest-messages';
import { UnidadesService } from '../../unidades/unidades.service';
import { ServiceTokenGuard } from './service-token.guard';

@ApiTags('Integraciones - MPP')
@ApiSecurity('api-key')
@UseGuards(ServiceTokenGuard)
@Controller('api/v1/integraciones/mpp')
export class MppIntegracionController {
  constructor(private readonly unidadesService: UnidadesService) {}

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
}
