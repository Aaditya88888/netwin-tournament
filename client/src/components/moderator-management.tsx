import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { Trash2, Edit, UserCheck, UserX, Mail, Shield, Clock, Calendar } from "lucide-react";

interface Moderator {
  uid: string;
  email: string;
  role: string;
  permissions: string[];
  createdAt?: string;
  lastSignIn?: string;
  disabled?: boolean;
  invitedAt?: string;
  invitedBy?: string;
  status?: string;
}

const PERMISSIONS = [
  { key: "manage_users", label: "Manage Users", icon: "👥" },
  { key: "edit_tournaments", label: "Edit Tournaments", icon: "🏆" },
  { key: "view_reports", label: "View Reports", icon: "📊" },
  { key: "manage_announcements", label: "Manage Announcements", icon: "📢" },
  { key: "distribute_prizes", label: "Distribute Prizes", icon: "💰" },
  { key: "review_kyc", label: "Review KYC", icon: "🔍" },
];

export function ModeratorManagement() {
  const [moderators, setModerators] = useState<Moderator[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingModerator, setEditingModerator] = useState<Moderator | null>(null);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const { user, token } = useAdminAuth();
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (isAdmin) {
      fetchModerators();
    }
  }, [isAdmin]);

  const fetchModerators = async () => {
    try {
      const response = await fetch("/api/moderator/list", {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await response.json();
      if (response.ok) {
        setModerators(data.moderators || []);
      }
    } catch (error) {
      console.error("Failed to fetch moderators:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveModerator = async (uid: string) => {
    if (!confirm("Are you sure you want to remove this moderator's access?")) return;
    
    try {
      const response = await fetch("/api/moderator/remove", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ uid }),
      });
      
      if (response.ok) {
        await fetchModerators();
      }
    } catch (error) {
      console.error("Failed to remove moderator:", error);
    }
  };

  const handleToggleStatus = async (uid: string, disabled: boolean) => {
    try {
      const response = await fetch("/api/moderator/status", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ uid, disabled }),
      });
      
      if (response.ok) {
        await fetchModerators();
      }
    } catch (error) {
      console.error("Failed to toggle moderator status:", error);
    }
  };

  const handleUpdatePermissions = async () => {
    if (!editingModerator) return;
    
    try {
      const response = await fetch("/api/moderator/permissions", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ 
          uid: editingModerator.uid, 
          permissions: editPermissions 
        }),
      });
      
      if (response.ok) {
        setEditingModerator(null);
        setEditPermissions([]);
        await fetchModerators();
      }
    } catch (error) {
      console.error("Failed to update permissions:", error);
    }
  };

  const startEditingPermissions = (moderator: Moderator) => {
    setEditingModerator(moderator);
    setEditPermissions([...moderator.permissions]);
  };

  const togglePermission = (permission: string) => {
    setEditPermissions(prev =>
      prev.includes(permission)
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusVariant = (moderator: Moderator) => {
    if (moderator.disabled) return "destructive";
    if (moderator.lastSignIn) return "success";
    if (moderator.status === "pending") return "secondary";
    return "outline";
  };

  const getStatusLabel = (moderator: Moderator) => {
    if (moderator.disabled) return "Disabled";
    if (moderator.lastSignIn) return "Active";
    if (moderator.status === "pending") return "Pending";
    return "Invited";
  };

  const filteredModerators = moderators.filter(mod =>
    mod.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mod.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Loading moderators...</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Moderator Management</h1>
        <Badge variant="secondary" className="text-sm">
          {moderators.length} Total Moderators
        </Badge>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <Input
          placeholder="Search moderators by email or role..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Moderators List */}
      <div className="grid gap-4">
        {filteredModerators.map((moderator) => (
          <Card key={moderator.uid} className={moderator.disabled ? "opacity-60" : ""}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {moderator.email}
                    {moderator.disabled && (
                      <Badge variant="destructive" className="text-xs">Disabled</Badge>
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      {moderator.role}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Created: {formatDate(moderator.createdAt)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Last Sign In: {formatDate(moderator.lastSignIn)}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={getStatusVariant(moderator)} 
                        className="text-xs"
                      >
                        {getStatusLabel(moderator)}
                      </Badge>
                      {moderator.invitedAt && !moderator.lastSignIn && (
                        <span className="text-xs text-muted-foreground">
                          Invited: {formatDate(moderator.invitedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startEditingPermissions(moderator)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={moderator.disabled ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleToggleStatus(moderator.uid, !moderator.disabled)}
                  >
                    {moderator.disabled ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveModerator(moderator.uid)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm font-medium">Permissions:</p>
                <div className="flex flex-wrap gap-2">
                  {moderator.permissions.map((permission) => {
                    const permissionInfo = PERMISSIONS.find(p => p.key === permission);
                    return (
                      <Badge key={permission} variant="secondary" className="text-xs">
                        {permissionInfo?.icon} {permissionInfo?.label || permission}
                      </Badge>
                    );
                  })}
                  {moderator.permissions.length === 0 && (
                    <Badge variant="outline" className="text-xs">No permissions assigned</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredModerators.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              {searchTerm ? "No moderators found matching your search." : "No moderators found."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Edit Permissions Modal */}
      {editingModerator && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Edit Permissions</CardTitle>
              <p className="text-sm text-muted-foreground">{editingModerator.email}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {PERMISSIONS.map((permission) => (
                  <label key={permission.key} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editPermissions.includes(permission.key)}
                      onChange={() => togglePermission(permission.key)}
                      className="rounded"
                    />
                    <span className="text-sm">
                      {permission.icon} {permission.label}
                    </span>
                  </label>
                ))}
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={handleUpdatePermissions} className="flex-1">
                  Update Permissions
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setEditingModerator(null);
                    setEditPermissions([]);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}