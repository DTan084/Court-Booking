import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger, ClassSerializerInterceptor } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  const isProd = configService.get<string>('NODE_ENV') === 'production';
  const feUrl = configService.get<string>('FE_URL');

  if (isProd && !feUrl) {
    throw new Error('FE_URL environment variable is required in production');
  }

  // Security - Helmet middleware
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [`'self'`],
          styleSrc: [`'self'`],
          imgSrc: [`'self'`, 'data:', 'validator.swagger.io'],
          scriptSrc: [`'self'`],
        },
      },
    }),
  );

  // Performance - Response compression
  app.use(compression());

  // Cookies for auth
  app.use(cookieParser());

  // CORS configuration
  app.enableCors({
    origin: isProd ? feUrl : feUrl || '*',
    credentials: true,
  });

  // API versioning
  app.setGlobalPrefix('api/v1');
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  // Global filters and interceptors
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
    new ClassSerializerInterceptor(app.get(Reflector)),
  );

  // Swagger API Documentation (disabled in production)
  if (!isProd) {
    const config = new DocumentBuilder()
      .setTitle('Court Booking API')
      .setDescription('The enterprise court booking system API description')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('Root', 'API information')
      .addTag('Auth', 'User authentication and authorization')
      .addTag('Courts', 'Court management and information')
      .addTag('Bookings', 'Booking management')
      .addTag('Health', 'Health check endpoints')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = configService.get<number>('PORT') || 3001;
  await app.listen(port);

  logger.log(`🚀 Backend running on http://localhost:${port}/api/v1`);
  logger.log(`📄 Swagger docs available at http://localhost:${port}/api/docs`);
  logger.log(`🔒 Security: Helmet enabled`);
  logger.log(`⚡ Performance: Compression enabled`);
  logger.log(`🌍 Environment: ${configService.get<string>('NODE_ENV') || 'development'}`);
}

bootstrap();
