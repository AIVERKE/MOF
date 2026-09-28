import { NestFactory } from '@nestjs/core';
import {
  BadRequestException,
  ValidationPipe,
  ValidationError,
} from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ResultExceptionFilter } from './common/filters/result-exception.filter';
import { ErrorCodes } from './common/errors';
import { resolveCorsOrigins } from './common/cors.util';
import { resolveTrustProxy } from './common/throttle.util';
import { resolveHttpsOptions } from './common/https.util';
import type { NestExpressApplication } from '@nestjs/platform-express';

function flattenValidationErrors(errors: ValidationError[]): string[] {
  const messages: string[] = [];
  for (const err of errors) {
    if (err.constraints) {
      messages.push(...Object.values(err.constraints));
    }
    if (err.children?.length) {
      messages.push(...flattenValidationErrors(err.children));
    }
  }
  return messages;
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    httpsOptions: resolveHttpsOptions(),
  });
  // Con Apache delante (1 hop), req.ip = IP del cliente, no 127.0.0.1.
  // Expuesto directo (HTTPS_KEY_PATH/HTTPS_CERT_PATH), TRUST_PROXY debe ser 0.
  const trustProxyHops = resolveTrustProxy();
  if (trustProxyHops > 0) {
    app.set('trust proxy', trustProxyHops);
  }
  app.enableCors({
    origin: resolveCorsOrigins(),
    credentials: true,
  });
  app.useGlobalFilters(new ResultExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: (errors: ValidationError[]) => {
        const messages = flattenValidationErrors(errors);
        return new BadRequestException({
          message: messages.length ? messages : ['Error de validación'],
          data: null,
          errorCode: ErrorCodes.VALIDATION_FAILED,
        });
      },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('MOF API')
    .setDescription(
      'API del Manual de Organización y Funciones. ' +
        'Envelope: { timestamp, status, message, data, errorCode? }. ' +
        'En errores, errorCode es un código estable (ver catálogo en src/common/errors.ts y README). ' +
        'message sigue siendo texto en español; data se mantiene por compatibilidad.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
