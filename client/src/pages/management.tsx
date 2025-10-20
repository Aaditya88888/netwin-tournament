import dynamic from "next/dynamic";
import React from "react";


const InviteModeratorAccess = dynamic(() => import("@/components/management-invite-moderator").then(m => m.InviteModeratorAccess), { ssr: false });

export default function ManagementPage() {
  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold mb-4">Management</h1>
      <InviteModeratorAccess />
      {/* Add more management features here as needed */}
    </div>
  );
}
