// TODO: Bootstrap NestJS application
// - app.useGlobalPipes(new ZodValidationPipe())
// - app.useGlobalFilters(new HttpExceptionFilter())
// - SwaggerModule.setup("api", app, document)
// - app.enableCors({ origin: process.env.FE_URL })
// - helmet middleware
// - pino logger

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // TODO: Global prefix
  app.setGlobalPrefix('api');

  // TODO: Swagger setup
  // TODO: Global pipes, filters, interceptors
  // TODO: CORS, Helmet

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Backend running on http://localhost:${port}`);
}

bootstrap();
