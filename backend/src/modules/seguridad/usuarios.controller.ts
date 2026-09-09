import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ResultResponse } from '../../common/dto/result-response';
import { RestMessages } from '../../common/constants/rest-messages';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { PatchUsuarioEstadoDto } from './dto/patch-usuario-estado.dto';

@ApiTags('Seguridad - Usuarios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('seguridad/usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar usuarios' })
  async list() {
    return ResultResponse.ok(
      RestMessages.FIND_SUCCESSFULLY,
      await this.usuariosService.listar(),
    );
  }

  @Post()
  @ApiOperation({ summary: 'Crear usuario y asignar roles' })
  async create(@Body() dto: CreateUsuarioDto) {
    return ResultResponse.ok(
      RestMessages.PERSIST_SUCCESSFULLY,
      await this.usuariosService.crear(dto),
    );
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar usuario y roles' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUsuarioDto,
  ) {
    return ResultResponse.ok(
      RestMessages.UPDATE_SUCCESSFULLY,
      await this.usuariosService.actualizar(String(id), dto),
    );
  }

  @Patch(':id/estado')
  @ApiOperation({ summary: 'Activar o desactivar usuario' })
  async patchEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PatchUsuarioEstadoDto,
  ) {
    return ResultResponse.ok(
      RestMessages.UPDATE_SUCCESSFULLY,
      await this.usuariosService.actualizarEstado(String(id), dto.enabled),
    );
  }
}
