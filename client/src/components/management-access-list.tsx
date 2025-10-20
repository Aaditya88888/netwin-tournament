import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAdminAuth } from "@/context/AdminAuthContext";


export function ManagementAccessList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const { token } = useAdminAuth();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/moderator/list", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      setUsers(data.moderators || []);
    } catch (err) {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line
  }, []);

  const handleRemove = async (uid: string) => {
    if (!window.confirm("Are you sure you want to remove access for this user?")) return;
    setLoading(true);
    try {
      await fetch("/api/moderator/remove", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ uid }),
      });
      fetchUsers();
    } catch (err) {
      // Optionally show error
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card p-6 rounded-lg shadow mt-8">
      <h2 className="text-lg font-semibold mb-4">Current Admins & Moderators</h2>
      {loading ? (
        <div>Loading...</div>
      ) : users.length === 0 ? (
        <div>No users with access found.</div>
      ) : (
        <table className="w-full text-left">
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Permissions</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((user: any) => (
              <tr key={user.uid}>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>{Array.isArray(user.permissions) ? user.permissions.join(", ") : "-"}</td>
                <td>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemove(user.uid)}
                    disabled={loading}
                  >
                    Remove Access
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
