import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UnidadesModule } from '../../unidades/unidades.module';
import { CargosModule } from '../../cargos/cargos.module';
import { MppIntegracionController } from './mpp-integracion.controller';
import { ServiceTokenGuard } from './service-token.guard';

/**
 * Lectura del organigrama para el backend de MPP con un token fijo
 * (MPP_SERVICE_TOKEN). Sin esa variable toda petición recibe 401.
 */
@Module({
  imports: [ConfigModule, UnidadesModule, CargosModule],
  controllers: [MppIntegracionController],
  providers: [ServiceTokenGuard],
})
export class MppIntegracionModule {}
