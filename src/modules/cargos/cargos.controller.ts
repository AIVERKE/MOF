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
import { CargosService } from './cargos.service';
import { CargoDto, SetCargoDto } from './dto/cargo.dto';
import { ResultResponse } from '../../common/dto/result-response';
import { RestMessages } from '../../common/constants/rest-messages';

@ApiTags('MOF - Cargos y personal')
@Controller('api/v1/unidades')
export class CargosController {
  constructor(private readonly cargosService: CargosService) {}

  @Get('cargos')
  @ApiOperation({ summary: 'Listar cargos' })
  async list() {
    return ResultResponse.ok(
      RestMessages.FIND_SUCCESSFULLY,
      await this.cargosService.list(),
    );
  }

  @Post('cargos')
  @ApiOperation({ summary: 'Crear cargo' })
  async create(@Body() dto: CargoDto) {
    return ResultResponse.ok(
      RestMessages.PERSIST_SUCCESSFULLY,
      await this.cargosService.create(dto),
    );
  }

  @Get('cargos/:id')
  @ApiOperation({ summary: 'Obtener cargo por ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return ResultResponse.ok(
      RestMessages.FIND_SUCCESSFULLY,
      await this.cargosService.findOne(id),
    );
  }

  @Put('cargos/:id')
  @ApiOperation({ summary: 'Actualizar cargo' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CargoDto,
  ) {
    return ResultResponse.ok(
      RestMessages.FIND_SUCCESSFULLY,
      await this.cargosService.update(id, dto),
    );
  }

  @Get(':id/personal')
  @ApiOperation({ summary: 'Listar personal/cargos asignados a la unidad' })
  async personal(@Param('id', ParseIntPipe) id: number) {
    return ResultResponse.ok(
      RestMessages.FIND_SUCCESSFULLY,
      await this.cargosService.personal(id),
    );
  }

  @Post(':id/personal')
  @ApiOperation({ summary: 'Asignar cargo a la unidad' })
  async asignar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetCargoDto,
  ) {
    return ResultResponse.ok(
      RestMessages.FIND_SUCCESSFULLY,
      await this.cargosService.asignar(id, dto),
    );
  }

  @Delete(':id/personal/:assignmentId')
  @ApiOperation({ summary: 'Quitar asignación de cargo en la unidad' })
  async remover(
    @Param('id', ParseIntPipe) id: number,
    @Param('assignmentId', ParseIntPipe) assignmentId: number,
  ) {
    return ResultResponse.ok(
      RestMessages.UPDATE_SUCCESSFULLY,
      await this.cargosService.removerAsignacion(id, assignmentId),
    );
  }
}
