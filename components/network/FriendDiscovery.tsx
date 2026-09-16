"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Users, UserPlus, Sparkles, Upload, Check } from "lucide-react";
import Link from "next/link";

type DiscoveredFriend = {
  contactName: string;
  phoneHash: string;
  matchedUserId?: string;
  matchedUserName?: string;
  matchedUserTrustScore?: number;
  alreadyNotified?: boolean;
};

export default function FriendDiscovery() {
  const [discovered, setDiscovered] = useState<DiscoveredFriend[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  const handleContactUpload = async () => {
    setLoading(true);

    // Request contacts permission (browser API)
    if ("contacts" in navigator && "ContactsManager" in window) {
      try {
        // @ts-ignore - Contacts API is experimental
        const contacts = await navigator.contacts.select(
          ["name", "tel"],
          { multiple: true }
        );

        const formattedContacts = contacts.map((contact: any) => ({
          name: contact.name?.[0] || "Unknown",
          phone: contact.tel?.[0] || "",
        }));

        // Upload to server
        const response = await fetch("/api/contacts/discover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contacts: formattedContacts }),
        });

        const result = await response.json();

        if (result.ok) {
          setDiscovered(result.discovered || []);
          setUploaded(true);
        }
      } catch (error) {
        console.error("Failed to access contacts:", error);
      }
    } else {
      // Fallback: manual input or alternative method
      alert(
        "Contact access not supported in this browser. You can manually invite friends by username."
      );
    }

    setLoading(false);
  };

  const matchedFriends = discovered.filter((d) => d.matchedUserId);
  const unmatchedContacts = discovered.filter((d) => !d.matchedUserId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-card-foreground mb-2 flex items-center gap-2">
          <Users className="w-6 h-6 text-green" />
          Find Your Friends
        </h2>
        <p className="text-muted-foreground">
          Discover which of your contacts are already on Me2U
        </p>
      </div>

      {/* Upload Section */}
      {!uploaded && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-green/10 via-card to-card border-2 border-green/30 rounded-2xl p-8 text-center"
        >
          <div className="inline-block p-4 rounded-2xl bg-green/20 mb-4">
            <Sparkles className="w-12 h-12 text-green" />
          </div>
          <h3 className="text-xl font-black text-card-foreground mb-2">
            Connect with Friends
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Upload your contacts to see who's already using Me2U. We'll only use
            this to find matches—your contacts stay private.
          </p>
          <button
            onClick={handleContactUpload}
            disabled={loading}
            className="btn-primary px-8 py-4 text-lg font-bold inline-flex items-center gap-3"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                Scanning...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Find Friends
              </>
            )}
          </button>
          <p className="text-xs text-muted-foreground mt-4">
            Your contacts are hashed and never stored in plain text
          </p>
        </motion.div>
      )}

      {/* Matched Friends */}
      {matchedFriends.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-black text-card-foreground flex items-center gap-2">
            <Check className="w-5 h-5 text-green" />
            Friends on Me2U ({matchedFriends.length})
          </h3>
          <div className="space-y-3">
            {matchedFriends.map((friend, index) => (
              <motion.div
                key={friend.phoneHash}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-2xl border-2 border-green/30 bg-green/5 p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-green/20 flex items-center justify-center">
                      <span className="text-lg font-black text-green">
                        {friend.matchedUserName?.[0] || "?"}
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-card-foreground">
                        {friend.matchedUserName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Contact: {friend.contactName}
                      </p>
                      {friend.matchedUserTrustScore !== undefined && (
                        <div className="flex items-center gap-1 mt-1">
                          <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green"
                              style={{
                                width: `${friend.matchedUserTrustScore}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {friend.matchedUserTrustScore}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Link
                    href={`/profile/${friend.matchedUserId}`}
                    className="px-4 py-2 rounded-xl bg-green text-white font-bold text-sm hover:bg-green/90 transition-colors"
                  >
                    View
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Unmatched Contacts */}
      {unmatchedContacts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-black text-card-foreground flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-500" />
            Invite to Me2U ({unmatchedContacts.length})
          </h3>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-4">
            <p className="text-sm text-muted-foreground">
              These contacts aren't on Me2U yet. Share your referral code to earn
              rewards when they join!
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {unmatchedContacts.slice(0, 6).map((contact, index) => (
              <motion.div
                key={contact.phoneHash}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.03 }}
                className="rounded-xl border border-border bg-card p-3"
              >
                <p className="font-bold text-sm text-card-foreground truncate">
                  {contact.contactName}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Not on Me2U</p>
              </motion.div>
            ))}
          </div>
          {unmatchedContacts.length > 6 && (
            <p className="text-sm text-muted-foreground text-center">
              + {unmatchedContacts.length - 6} more contacts
            </p>
          )}
          <Link
            href="/referrals"
            className="block w-full btn-primary py-3 text-center font-bold"
          >
            Share Referral Code
          </Link>
        </div>
      )}

      {/* Empty State */}
      {uploaded && discovered.length === 0 && (
        <div className="text-center py-12 bg-secondary/50 rounded-2xl">
          <div className="inline-block p-4 rounded-2xl bg-secondary mb-4">
            <Users className="w-12 h-12 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-bold mb-2">
            No matches found
          </p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            None of your contacts are on Me2U yet. Be the first to refer them and
            earn rewards!
          </p>
          <Link
            href="/referrals"
            className="inline-block mt-4 px-6 py-3 rounded-xl bg-green text-white font-bold hover:bg-green/90 transition-colors"
          >
            View Referral Program
          </Link>
        </div>
      )}
    </div>
  );
}
