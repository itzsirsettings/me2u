import { Controller, Post } from "@nestjs/common";
import { BillsService } from "../bills/bills.service";

@Controller("jobs")
export class JobsController {
  constructor(private readonly bills: BillsService) {}

  @Post("bill-requery/scan")
  scanPendingBills() {
    return this.bills.requeryPendingBatch();
  }
}
