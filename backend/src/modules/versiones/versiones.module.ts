import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditoriaService } from './auditoria.service';
import { VersionesController } from './versiones.controller';
import { AuthModule } from '../auth/auth.module';
import { VersionesService } from './versiones.service';
import { AuditoriaCambio } from './entities/auditoria-cambio.entity';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([AuditoriaCambio])],
  controllers: [VersionesController],
  providers: [AuditoriaService, VersionesService],
  exports: [AuditoriaService, VersionesService, TypeOrmModule],
})
export class VersionesModule {}
