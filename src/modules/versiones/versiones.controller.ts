import {
  Controller,
  Get,
  Query,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuditoriaService } from './auditoria.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuditoriaCambiosResponseDto } from './dto/auditoria-cambios-response.dto';
import { PaginatedAuditoriaResponseDto } from './dto/paginated-auditoria.dto';

@ApiTags('Auditoría de Cambios')
@Controller('versiones')
export class VersionesController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Listar registros de auditoría',
    description: 'Devuelve registros paginados con filtros opcionales.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({
    name: 'tabla_afectada',
    required: false,
    type: String,
    example: 'Procedimiento',
  })
  @ApiQuery({
    name: 'accion',
    required: false,
    enum: ['CREATE', 'UPDATE', 'DELETE', 'VERSION'],
  })
  @ApiQuery({
    name: 'fecha_desde',
    required: false,
    type: String,
    example: '2024-01-01',
  })
  @ApiQuery({
    name: 'fecha_hasta',
    required: false,
    type: String,
    example: '2024-12-31',
  })
  @ApiQuery({ name: 'id_usuario', required: false, type: Number })
  @ApiQuery({
    name: 'id_registro_original',
    required: false,
    type: Number,
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de registros.',
    type: PaginatedAuditoriaResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Parámetros de consulta inválidos.',
  })
  async findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('tabla_afectada') tablaAfectada?: string,
    @Query('accion') accion?: string,
    @Query('fecha_desde') fechaDesde?: string,
    @Query('fecha_hasta') fechaHasta?: string,
    @Query('id_usuario', new ParseIntPipe({ optional: true }))
    idUsuario?: number,
    @Query('id_registro_original', new ParseIntPipe({ optional: true }))
    idRegistroOriginal?: number,
  ) {
    return this.auditoriaService.findAll({
      page,
      limit,
      tablaAfectada,
      accion,
      fechaDesde,
      fechaHasta,
      idUsuario,
      idRegistroOriginal,
    });
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Obtener un registro de auditoría por ID' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID del registro de auditoría',
  })
  @ApiResponse({
    status: 200,
    description: 'Registro encontrado.',
    type: AuditoriaCambiosResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Registro de auditoría con ID {id} no encontrado.',
  })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.auditoriaService.findOne(id);
  }
}
