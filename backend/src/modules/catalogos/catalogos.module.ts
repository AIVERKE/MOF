import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogoTipo } from './entities/catalogo-tipo.entity';
import { CatalogoNivel } from './entities/catalogo-nivel.entity';
import { CatalogoRelacion } from './entities/catalogo-relacion.entity';
import { TipoUnidad } from './entities/tipo-unidad.entity';
import { CatalogosService } from './catalogos.service';
import { CatalogosController } from './catalogos.controller';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      CatalogoTipo,
      CatalogoNivel,
      CatalogoRelacion,
      TipoUnidad,
    ]),
  ],
  controllers: [CatalogosController],
  providers: [CatalogosService, RolesGuard],
  exports: [TypeOrmModule, CatalogosService],
})
export class CatalogosModule {}
