import { Module } from "@nestjs/common";
import { SageController } from "./sage.controller.js";
import { SageService } from "./sage.service.js";

@Module({ controllers: [SageController], providers: [SageService] })
export class AppModule {}
