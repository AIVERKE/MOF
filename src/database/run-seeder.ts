import { DataSource, DataSourceOptions } from 'typeorm';
import { runSeeders, SeederOptions } from 'typeorm-extension';
import { config } from 'dotenv';
import { join } from 'path';

config();

async function run() {
  const seederPath = process.argv[2];

  if (!seederPath) {
    console.error(
      'Error: Debes proporcionar la ruta del seeder. Ejemplo: src/database/seed-1/initial.seeder.ts',
    );
    process.exit(1);
  }

  const options: DataSourceOptions & SeederOptions = {
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    entities: [join(__dirname, '../**/*.entity.ts')],
    synchronize: false,
    seeds: [seederPath],
  };

  const dataSource = new DataSource(options);

  try {
    await dataSource.initialize();
    console.log('DataSource inicializado correctamente.');

    await runSeeders(dataSource);
    console.log('Seed ejecutado con éxito.');

    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('Error al ejecutar el seed:', error);
    process.exit(1);
  }
}

run();
