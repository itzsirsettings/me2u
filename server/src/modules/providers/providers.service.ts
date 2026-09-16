import { Injectable } from "@nestjs/common";
import { FlutterwaveProvider } from "./flutterwave.provider";
import type { BillProvider, BillProviderName } from "./provider.interface";
import { VtpassProvider } from "./vtpass.provider";
import { WemaBillProvider } from "./wema-bill.provider";

@Injectable()
export class ProvidersService {
  constructor(
    private readonly vtpass: VtpassProvider,
    private readonly flutterwave: FlutterwaveProvider,
    private readonly wema: WemaBillProvider,
  ) {}

  get(name: BillProviderName): BillProvider {
    if (name === "wema") return this.wema;
    if (name === "flutterwave") return this.flutterwave;
    return this.vtpass;
  }

  primary() {
    if (this.wema.isEnabled()) return this.wema;
    return this.vtpass;
  }
}
