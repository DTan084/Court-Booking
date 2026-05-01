import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger, ClassSerializerInterceptor } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Security
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [`'self'`],
          styleSrc: [`'self'`, `'unsafe-inline'`],
          imgSrc: [`'self'`, 'data:', 'validator.swagger.io'],
          scriptSrc: [`'self'`, `https: 'unsafe-inline'`, `'unsafe-eval'`],
        },
      },
    }),
  );
  app.enableCors({
    origin: configService.get<string>('FE_URL') || '*',
    credentials: true,
  });

  // Global Setup
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
    new ClassSerializerInterceptor(app.get(Reflector)),
  );

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Court Booking API')
    .setDescription('The enterprise court booking system API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.get<number>('PORT') || 3001;
  await app.listen(port);
  logger.log(`🚀 Backend running on http://localhost:${port}/api`);
  logger.log(`📄 Swagger docs available at http://localhost:${port}/api/docs`);
}

bootstrap();
