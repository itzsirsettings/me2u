import { Injectable } from "@nestjs/common";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

export type AuthenticatedRequestUser = {
  id: string;
  email?: string;
  user: User;
};

@Injectable()
export class SupabaseService {
  readonly admin: SupabaseClient;

  constructor() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRoleKey) {
      throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    }

    this.admin = createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  async getUserFromBearer(authorization = ""): Promise<AuthenticatedRequestUser> {
    const token = authorization.replace(/^Bearer\s+/i, "").trim();
    if (!token) throw new Error("Please log in first.");

    const {
      data: { user },
      error,
    } = await this.admin.auth.getUser(token);

    if (error || !user) throw new Error("Session expired. Please log in again.");
    return { id: user.id, email: user.email || undefined, user };
  }

  async assertAdmin(userId: string) {
    const { data, error } = await this.admin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data || data.role !== "admin") throw new Error("Admin access required.");
  }
}
