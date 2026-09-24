import {
  Controller,
  Get,
  ServiceUnavailableException,
} from "@nestjs/common";
import { RailwayDbService } from "./railway-db.service";

@Controller("health")
export class HealthController {
  constructor(private readonly db: RailwayDbService) {}

  @Get("live")
  live() {
    return { status: "live", checkedAt: new Date().toISOString() };
  }

  @Get("ready")
  async ready() {
    try {
      let timeoutHandle: NodeJS.Timeout | undefined;
      await Promise.race([
        this.db.getPool().query("SELECT 1"),
        new Promise<never>((_, reject) => {
          timeoutHandle = setTimeout(() => reject(new Error("database readiness timeout")), 2000);
        }),
      ]).finally(() => clearTimeout(timeoutHandle));
      return { status: "ready", checkedAt: new Date().toISOString() };
    } catch {
      throw new ServiceUnavailableException({
        status: "not_ready",
        checkedAt: new Date().toISOString(),
      });
    }
  }
}