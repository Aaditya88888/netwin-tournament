import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';


const UserImpersonateModal = ({ user, open, onClose }: any) => {
  const [token, setToken] = useState('');
  const impersonate = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/users/${user.id}/impersonate`);
      const data = await res.json();
      setToken(data.token);
    }
  });
  if (!open) return null;
  return (
    <div className="fixed right-0 top-0 w-80 h-full bg-gray-50 shadow-lg z-50 p-4">
      <button onClick={onClose} className="absolute top-2 right-2">Close</button>
      <div className="mb-2 font-bold">Impersonate {user?.email || user?.username}</div>
      <button onClick={() => impersonate.mutate()} className="border px-2 py-1 mb-2">Generate Impersonation Token</button>
      {token && <div className="break-all text-xs">Token: {token}</div>}
      <div className="text-xs text-red-500 mt-2">Warning: Use impersonation only for troubleshooting. All actions are logged.</div>
    </div>
  );
};
export default UserImpersonateModal;
