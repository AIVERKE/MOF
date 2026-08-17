import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogoTipo } from './entities/catalogo-tipo.entity';
import { CatalogoNivel } from './entities/catalogo-nivel.entity';
import { CatalogoRelacion } from './entities/catalogo-relacion.entity';
import { TipoUnidad } from './entities/tipo-unidad.entity';
import { CatalogosService } from './catalogos.service';
import { CatalogosController } from './catalogos.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CatalogoTipo,
      CatalogoNivel,
      CatalogoRelacion,
      TipoUnidad,
    ]),
  ],
  controllers: [CatalogosController],
  providers: [CatalogosService],
  exports: [TypeOrmModule, CatalogosService],
})
export class CatalogosModule {}
