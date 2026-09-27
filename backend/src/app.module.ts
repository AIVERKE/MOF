import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { VersionesModule } from './modules/versiones/versiones.module';
import { PersonasModule } from './modules/personas/personas.module';
import { CatalogosModule } from './modules/catalogos/catalogos.module';
import { UnidadesModule } from './modules/unidades/unidades.module';
import { CargosModule } from './modules/cargos/cargos.module';
import { SeguridadModule } from './modules/seguridad/seguridad.module';
import { GacetaModule } from './modules/integraciones/gaceta/gaceta.module';
import { ErrorCodes, getErrorDefinition } from './common/errors';
import { throttleConfig } from './common/throttle.util';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: () => {
        const { ttlMs, limit } = throttleConfig();
        return {
          throttlers: [{ name: 'default', ttl: ttlMs, limit }],
          errorMessage: getErrorDefinition(ErrorCodes.TOO_MANY_REQUESTS)
            .message,
        };
      },
    }),
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
    SeguridadModule,
    GacetaModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
