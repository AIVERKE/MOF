import { Module } from '@nestjs/common';
import { AuditoriaService } from './auditoria.service';
import { VersionesController } from './versiones.controller';
import { AuthModule } from '../auth/auth.module';
import { VersionesService } from './versiones.service';

@Module({
  imports: [AuthModule],
  controllers: [VersionesController],
  providers: [AuditoriaService, VersionesService],
  exports: [AuditoriaService, VersionesService],
})
export class VersionesModule {}
