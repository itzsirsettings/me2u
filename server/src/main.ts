import "reflect-metadata";
import "./load-env";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.enableCors({
    origin: (process.env.CORS_ORIGIN || "http://localhost:3000")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    credentials: true,
  });
  app.setGlobalPrefix("api");
  await app.listen(Number(process.env.PORT || 4000));
}

bootstrap().catch((error) => {
  console.error("Me2U Bills API failed to start", error);
  process.exit(1);
});
