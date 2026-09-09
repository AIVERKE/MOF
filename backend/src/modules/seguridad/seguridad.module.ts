import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Usuario } from '../auth/entities/usuario.entity';
import { Rol } from '../auth/entities/rol.entity';
import { UsuarioRol } from '../auth/entities/usuario-rol.entity';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([Usuario, Rol, UsuarioRol]),
  ],
  controllers: [UsuariosController],
  providers: [UsuariosService, RolesGuard],
  exports: [UsuariosService],
})
export class SeguridadModule {}
