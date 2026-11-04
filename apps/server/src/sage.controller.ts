import { BadRequestException, Body, Controller, Get, Inject, Post, Query } from "@nestjs/common";
import { SageService } from "./sage.service.js";

@Controller()
export class SageController {
  constructor(@Inject(SageService) private readonly svc: SageService) {}

  @Get("health")
  health() {
    return { ok: true };
  }

  @Get("schema")
  async schema(@Query("refresh") refresh?: string) {
    const snapshot = await this.svc.sage.schema(refresh === "1");
    const graph = await this.svc.sage.graph();
    return { snapshot, relationships: graph.relationships };
  }

  @Get("advise")
  advise() {
    return this.svc.sage.advise();
  }

  @Post("advise")
  adviseFor(@Body() body: { useCase?: string }) {
    if (!body?.useCase) throw new BadRequestException("useCase is required");
    return this.svc.sage.adviseFor(body.useCase);
  }

  @Post("ask")
  ask(@Body() body: { question?: string; explain?: boolean }) {
    if (!body?.question) throw new BadRequestException("question is required");
    return this.svc.sage.ask(body.question, { explain: body.explain });
  }

  @Post("query")
  async query(@Body() body: { sql?: string }) {
    if (!body?.sql) throw new BadRequestException("sql is required");
    try {
      return await this.svc.sage.query(body.sql);
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : String(e));
    }
  }

  @Post("insights")
  insights(@Body() body: { useCase?: string }) {
    if (!body?.useCase) throw new BadRequestException("useCase is required");
    return this.svc.sage.insights(body.useCase);
  }
}
