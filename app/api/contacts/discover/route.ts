import { queryAsUser, withUserTransaction } from "@/lib/railway/client";
import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { logApiError } from "@/lib/server/logger";
import crypto from "crypto";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function hashPhone(phone: string): string {
  return crypto.createHash("sha256").update(phone.trim()).digest("hex");
}

type DiscoveredContact = {
  contactName: string;
  phoneHash: string;
  matchedUserId?: string;
  matchedUserName?: string;
  matchedUserTrustScore?: number;
  alreadyInvited: boolean;
};

// Upload contacts and discover friends
export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    const body = await request.json();
    const { contacts } = body;

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Invalid contacts array" },
        { status: 400 }
      );
    }

    // Hash and store contacts
    const hashedContacts = contacts.map((contact: { name: string; phone: string }) => ({
      name: contact.name || "Unknown",
      phone: contact.phone,
      hash: hashPhone(contact.phone),
    }));

    const result = await withUserTransaction(auth.user.id, async (client) => {
      // Find matches by phone hash (you may need to adjust this based on your phone storage)
      const hashes = hashedContacts.map((c) => c.hash);
      const placeholders = hashes.map((_, i) => `$${i + 2}`).join(",");
      
      const matchResult = await client.query<{
        id: string;
        first_name: string;
        last_name: string;
        trust_score: number;
        phone: string;
      }>(
        `SELECT id, first_name, last_name, trust_score, phone
         FROM profiles
         WHERE phone IN (${placeholders})
         LIMIT 100`,
        [auth.user.id, ...hashes]
      );

      // Store contacts in database
      const contactsToInsert = hashedContacts.map((contact) => ({
        user_id: auth.user.id,
        phone_hash: contact.hash,
        contact_name: contact.name,
      }));

      for (const contact of contactsToInsert) {
        await client.query(
          `INSERT INTO user_contacts (user_id, phone_hash, contact_name, created_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (user_id, phone_hash) DO UPDATE
           SET contact_name = EXCLUDED.contact_name`,
          [contact.user_id, contact.phone_hash, contact.contact_name]
        );
      }

      // Build discovered list with matches
      const phoneToProfile = new Map(
        matchResult.rows.map((p) => [p.phone, p])
      );

      const discovered: DiscoveredContact[] = hashedContacts.map((contact) => {
        const profile = phoneToProfile.get(contact.hash);
        return {
          contactName: contact.name,
          phoneHash: contact.hash,
          matchedUserId: profile?.id,
          matchedUserName: profile ? `${profile.first_name} ${profile.last_name}` : undefined,
          matchedUserTrustScore: profile?.trust_score,
          alreadyInvited: false,
        };
      });

      return {
        discovered,
        matchedFriends: matchResult.rows.length,
      };
    });

    return NextResponse.json({
      ok: true,
      totalContacts: contacts.length,
      matchedFriends: result.matchedFriends,
      discovered: result.discovered,
    });
  } catch (error) {
    logApiError("contacts-discover-post", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Get discovered friends
export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    // Fetch user's contacts with matched users
    const { rows: contacts } = await queryAsUser<{
      contact_name: string;
      phone_hash: string;
      matched_user_id: string | null;
      notified: boolean;
      first_name: string | null;
      last_name: string | null;
      trust_score: number | null;
    }>(
      auth.user.id,
      `SELECT 
        uc.contact_name,
        uc.phone_hash,
        uc.matched_user_id,
        uc.notified,
        p.first_name,
        p.last_name,
        p.trust_score
       FROM user_contacts uc
       LEFT JOIN profiles p ON p.id = uc.matched_user_id
       WHERE uc.user_id = $1
       ORDER BY uc.contact_name`,
      [auth.user.id]
    );

    const discovered = contacts.map((contact) => ({
      contactName: contact.contact_name,
      phoneHash: contact.phone_hash,
      matchedUserId: contact.matched_user_id || undefined,
      matchedUserName:
        contact.first_name && contact.last_name
          ? `${contact.first_name} ${contact.last_name}`
          : undefined,
      matchedUserTrustScore: contact.trust_score || undefined,
      alreadyNotified: contact.notified,
    }));

    const matchedCount = discovered.filter((d) => d.matchedUserId).length;

    return NextResponse.json({
      ok: true,
      discovered,
      totalContacts: discovered.length,
      matchedFriends: matchedCount,
    });
  } catch (error) {
    logApiError("contacts-discover-get", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
