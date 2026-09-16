import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CargoNivel } from './entities/cargo-nivel.entity';
import { Cargo } from './entities/cargo.entity';
import { CargoUnidad } from './entities/cargo-unidad.entity';
import { AsignacionCargo } from './entities/asignacion-cargo.entity';
import { CargoJerarquiaHist } from './entities/cargo-jerarquia-hist.entity';
import { AsignacionCargoHist } from './entities/asignacion-cargo-hist.entity';
import { Unidad } from '../unidades/entities/unidad.entity';
import { CargosService } from './cargos.service';
import { CargosController } from './cargos.controller';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      CargoNivel,
      Cargo,
      CargoUnidad,
      AsignacionCargo,
      CargoJerarquiaHist,
      AsignacionCargoHist,
      Unidad,
    ]),
  ],
  controllers: [CargosController],
  providers: [CargosService, RolesGuard],
  exports: [TypeOrmModule, CargosService],
})
export class CargosModule {}
