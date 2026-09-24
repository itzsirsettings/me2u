"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { authorizedFetch, isAbortError } from "@/lib/fetch";
import { X, UserPlus, Search, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface CircleInviteModalProps {
  circleId: string;
  circleName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function CircleInviteModal({
  circleId,
  circleName,
  isOpen,
  onClose,
}: CircleInviteModalProps) {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleInvite = async () => {
    if (!username.trim()) {
      toast.error("Please enter a username");
      return;
    }

    setLoading(true);
    setSuccess(false);

    try {
      const response = await authorizedFetch(`/api/circles/${circleId}/invite`, {
        method: "POST",
        body: JSON.stringify({ username: username.trim() }),
      });

      const result = await response.json().catch(() => ({}));

      if (result.ok) {
        setSuccess(true);
        toast.success(`Invited ${username} to ${circleName}`);
        setTimeout(() => {
          setUsername("");
          setSuccess(false);
          onClose();
        }, 1500);
      } else {
        toast.error(result.error || "Failed to invite user");
      }
    } catch (error) {
      if (!isAbortError(error)) {
        toast.error("Failed to send invitation");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[rgba(77,77,77,0.7)] backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            {/* Modal */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-md w-full bg-card border border-border rounded-3xl p-6 shadow-2xl"
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Content */}
              <div className="space-y-6">
                {/* Header */}
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 rounded-xl bg-green/20">
                      <UserPlus className="w-6 h-6 text-green" />
                    </div>
                    <h2 className="text-2xl font-black text-card-foreground">
                      Invite to Circle
                    </h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Add members to <span className="font-bold">{circleName}</span>
                  </p>
                </div>

                {/* Search Input */}
                <div>
                  <label
                    htmlFor="username-input"
                    className="block text-sm font-bold text-card-foreground mb-2"
                  >
                    Username
                  </label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                    <input
                      id="username-input"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter username"
                      className="w-full h-12 rounded-xl border border-border bg-secondary pl-12 pr-4 text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green"
                      disabled={loading || success}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !loading && !success) {
                          handleInvite();
                        }
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Enter the exact username of the person you want to invite
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 h-12 rounded-xl border border-border bg-secondary text-card-foreground font-bold hover:bg-secondary/80 transition-colors"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleInvite}
                    disabled={!username.trim() || loading || success}
                    className="flex-1 h-12 rounded-xl bg-green text-white font-bold hover:bg-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {success ? (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Invited!
                      </>
                    ) : loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-5 h-5" />
                        Send Invite
                      </>
                    )}
                  </button>
                </div>

                {/* Info Box */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-card-foreground">Note:</strong> The
                    user will be added to the circle immediately and receive a
                    notification. They'll have access to all circle benefits.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
