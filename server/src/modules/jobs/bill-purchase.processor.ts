import { Processor, WorkerHost } from "@nestjs/bullmq";
import type { Job } from "bullmq";
import { BillsService } from "../bills/bills.service";

@Processor("bill-purchase")
export class BillPurchaseProcessor extends WorkerHost {
  constructor(private readonly bills: BillsService) {
    super();
  }

  async process(job: Job<{ reference: string }>) {
    if (job.name !== "fulfill") return null;
    return this.bills.fulfill(job.data.reference);
  }
}
