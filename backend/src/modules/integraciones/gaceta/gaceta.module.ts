import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VersionesModule } from '../../versiones/versiones.module';
import { GacetaSyncService } from './gaceta-sync.service';
import { OrganigramaSubscriber } from './organigrama.subscriber';

/**
 * Propagación del organigrama hacia la Gaceta IA.
 *
 * Se activa con GACETA_URL. Sin esa variable el módulo se carga igual pero no
 * envía nada: los eventos quedan anotados en `auditoria_cambio` y se entregan
 * en cuanto se configure el destino.
 */
@Module({
  imports: [ConfigModule, VersionesModule],
  providers: [GacetaSyncService, OrganigramaSubscriber],
  exports: [GacetaSyncService],
})
export class GacetaModule {}
