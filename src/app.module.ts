import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { VersionesModule } from './modules/versiones/versiones.module';
import { PersonasModule } from './modules/personas/personas.module';
import { CatalogosModule } from './modules/catalogos/catalogos.module';
import { UnidadesModule } from './modules/unidades/unidades.module';
import { CargosModule } from './modules/cargos/cargos.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', 'postgres'),
        database: configService.get<string>('DB_DATABASE', 'mof_db'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false,
      }),
      inject: [ConfigService],
      imports: [ConfigModule],
    }),
    AuthModule,
    PersonasModule,
    CatalogosModule,
    UnidadesModule,
    CargosModule,
    VersionesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
