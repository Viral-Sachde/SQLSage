import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";

const app = await NestFactory.create(AppModule);
app.enableCors({ origin: process.env.SQLSAGE_WEB_ORIGIN ?? "http://localhost:3000" });
app.setGlobalPrefix("api");
await app.listen(Number(process.env.PORT ?? 4000));
console.log(`SQLsage server on :${process.env.PORT ?? 4000}`);
