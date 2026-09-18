import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Unidad } from './entities/unidad.entity';
import { UnidadFuncion } from './entities/unidad-funcion.entity';
import { UnidadRelacionExterna } from './entities/unidad-relacion-externa.entity';
import { UnidadRelacionInterna } from './entities/unidad-relacion-interna.entity';
import { UnidadDependenciaFuncional } from './entities/unidad-dependencia-funcional.entity';
import { UnidadJerarquiaHist } from './entities/unidad-jerarquia-hist.entity';
import { CatalogosModule } from '../catalogos/catalogos.module';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UnidadesService } from './unidades.service';
import { UnidadPdfService } from './unidad-pdf.service';
import { MofUnidadesController } from './mof-unidades.controller';
import { CatalogoTipo } from '../catalogos/entities/catalogo-tipo.entity';
import { CatalogoNivel } from '../catalogos/entities/catalogo-nivel.entity';
import { CatalogoRelacion } from '../catalogos/entities/catalogo-relacion.entity';
import { TipoUnidad } from '../catalogos/entities/tipo-unidad.entity';
import { MofConfig } from './entities/mof-config.entity';

@Module({
  imports: [
    AuthModule,
    CatalogosModule,
    TypeOrmModule.forFeature([
      Unidad,
      UnidadFuncion,
      UnidadRelacionExterna,
      UnidadRelacionInterna,
      UnidadDependenciaFuncional,
      UnidadJerarquiaHist,
      CatalogoTipo,
      CatalogoNivel,
      CatalogoRelacion,
      TipoUnidad,
      MofConfig,
    ]),
  ],
  controllers: [MofUnidadesController],
  providers: [UnidadesService, UnidadPdfService, RolesGuard],
  exports: [TypeOrmModule, UnidadesService],
})
export class UnidadesModule {}
