import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';
import { CatalogoTipo } from '../../modules/catalogos/entities/catalogo-tipo.entity';
import { CatalogoNivel } from '../../modules/catalogos/entities/catalogo-nivel.entity';
import { CatalogoRelacion } from '../../modules/catalogos/entities/catalogo-relacion.entity';
import { TipoUnidad } from '../../modules/catalogos/entities/tipo-unidad.entity';

export default class CatalogosSeeder implements Seeder {
  public async run(dataSource: DataSource): Promise<void> {
    const tipoRepo = dataSource.getRepository(CatalogoTipo);
    const nivelRepo = dataSource.getRepository(CatalogoNivel);
    const relacionRepo = dataSource.getRepository(CatalogoRelacion);
    const claseRepo = dataSource.getRepository(TipoUnidad);

    if ((await tipoRepo.count()) === 0) {
      await tipoRepo.save([
        tipoRepo.create({
          codigo: 'A',
          descripcion: 'Administrativo',
          activo: true,
        }),
        tipoRepo.create({
          codigo: 'B',
          descripcion: 'Sustantivo (Académico)',
          activo: true,
        }),
        tipoRepo.create({
          codigo: 'C',
          descripcion: 'Asesoramiento',
          activo: true,
        }),
      ]);
    }

    if ((await nivelRepo.count()) === 0) {
      await nivelRepo.save([
        nivelRepo.create({
          codigo: 'D',
          descripcion: 'Directorio',
          activo: true,
        }),
        nivelRepo.create({
          codigo: 'E',
          descripcion: 'Ejecutivo',
          activo: true,
        }),
        nivelRepo.create({
          codigo: 'O',
          descripcion: 'Operativo',
          activo: true,
        }),
      ]);
    }

    if ((await relacionRepo.count()) === 0) {
      await relacionRepo.save([
        relacionRepo.create({
          codigo: 'L',
          descripcion: 'Lineal',
          activo: true,
        }),
        relacionRepo.create({
          codigo: 'S',
          descripcion: 'Staff',
          activo: true,
        }),
      ]);
    }

    if ((await claseRepo.count()) === 0) {
      await claseRepo.save([
        claseRepo.create({
          codigo: 'DIR',
          descripcion: 'Dirección',
          peso: 1,
          color: '#1976D2',
          activo: true,
        }),
        claseRepo.create({
          codigo: 'JEF',
          descripcion: 'Jefatura',
          peso: 2,
          color: '#388E3C',
          activo: true,
        }),
        claseRepo.create({
          codigo: 'UNI',
          descripcion: 'Unidad',
          peso: 3,
          color: '#F57C00',
          activo: true,
        }),
      ]);
    }
  }
}
