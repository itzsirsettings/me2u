import { Processor, WorkerHost } from "@nestjs/bullmq";
import type { Job } from "bullmq";
import { BillsService } from "../bills/bills.service";

@Processor("bill-requery")
export class BillRequeryProcessor extends WorkerHost {
  constructor(private readonly bills: BillsService) {
    super();
  }

  async process(job: Job<{ reference?: string }>) {
    if (job.name === "scan") return this.bills.requeryPendingBatch();
    if (job.data.reference) return this.bills.requeryNow(job.data.reference);
    return null;
  }
}
