import dynamic from "next/dynamic";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { ManagementAccessList } from "@/components/management-access-list";
import React from "react";


const InviteModeratorAccess = dynamic(() => import("@/components/management-invite-moderator").then(m => m.InviteModeratorAccess), { ssr: false });

export default function ManagementPage() {
  const { user } = useAdminAuth();
  const isAdmin = user?.role === "admin";
  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold mb-4">Management</h1>
      {isAdmin ? (
        <>
          <InviteModeratorAccess />
          <ManagementAccessList />
        </>
      ) : (
        <div className="text-center text-lg text-red-500">You do not have access to this page.</div>
      )}
      {/* Add more management features here as needed */}
    </div>
  );
}
