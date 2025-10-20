import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { ModeratorManagement } from "@/components/moderator-management";
import { UserPlus, Users } from "lucide-react";

const PERMISSIONS = [
  { key: "manage_users", label: "Manage Users", icon: "👥" },
  { key: "edit_tournaments", label: "Edit Tournaments", icon: "🏆" },
  { key: "view_reports", label: "View Reports", icon: "📊" },
  { key: "manage_announcements", label: "Manage Announcements", icon: "📢" },
  { key: "distribute_prizes", label: "Distribute Prizes", icon: "💰" },
  { key: "review_kyc", label: "Review KYC", icon: "🔍" },
];

export function InviteModeratorAccess() {
  const [email, setEmail] = useState("");
  const [role] = useState("moderator");
  const [manual, setManual] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState<string[]>(
    PERMISSIONS.map((p) => p.key)
  );
  const { user, token } = useAdminAuth();
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    // Always enable all permissions for admin, but allow toggling
    if (isAdmin) setPermissions(PERMISSIONS.map((p) => p.key));
  }, [isAdmin]);

  const handleToggle = (perm: string) => {
    if (!isAdmin) return;
    setPermissions((prev) =>
      prev.includes(perm)
        ? prev.filter((p) => p !== perm)
        : [...prev, perm]
    );
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      // Use the direct endpoint to avoid email domain restrictions
      const res = await fetch("/api/moderator/invite-direct", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ email, manual, permissions }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message || "Moderator invited successfully! They will receive an email with login instructions.");
        setEmail("");
        // Reset permissions to default
        setPermissions(PERMISSIONS.map((p) => p.key));
      } else {
        setMessage(data.message || "Failed to send invite. Please try again.");
      }
    } catch (err) {
      setMessage("Failed to send invite. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <Tabs defaultValue="invite" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="invite" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Invite Moderator
          </TabsTrigger>
          <TabsTrigger value="manage" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Manage Moderators
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="invite" className="mt-6">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Invite New Moderator
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Send an invitation email with admin panel access and selected permissions.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleInvite} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Address</label>
                  <Input
                    type="email"
                    placeholder="moderator@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="manual"
                    checked={manual}
                    onChange={(e) => setManual(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="manual" className="text-sm">
                    Manual Access (set role directly without email)
                  </label>
                </div>
                
                <div className="space-y-3">
                  <label className="text-sm font-medium">Permissions</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {PERMISSIONS.map((perm) => (
                      <label key={perm.key} className="flex items-center space-x-3 cursor-pointer p-2 rounded border hover:bg-muted/50">
                        <input
                          type="checkbox"
                          checked={permissions.includes(perm.key)}
                          onChange={() => handleToggle(perm.key)}
                          disabled={!isAdmin}
                          className="rounded"
                        />
                        <span className="text-sm">
                          {perm.icon} {perm.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <Button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full"
                >
                  {loading ? "Sending..." : (manual ? "Grant Manual Access" : "Send Invitation")}
                </Button>
              </form>
              
              {message && (
                <div className={`mt-4 p-3 rounded text-sm ${
                  message.includes("successfully") 
                    ? "bg-green-50 text-green-700 border border-green-200" 
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}>
                  {message}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="manage" className="mt-6">
          <ModeratorManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}