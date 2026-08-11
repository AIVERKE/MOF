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

@Module({
  imports: [
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
  providers: [CargosService],
  exports: [TypeOrmModule, CargosService],
})
export class CargosModule {}
