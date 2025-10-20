import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';


const UserBulkActions = ({ selected, clearSelected }: { selected: string[]; clearSelected: () => void }) => {
  const [action, setAction] = useState('');
  const [role, setRole] = useState('user');
  const queryClient = useQueryClient();
  const bulkMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/users/bulk', { action, userIds: selected, value: action === 'role' ? role : undefined });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      clearSelected();
    }
  });
  return (
    <div className="mb-4 flex gap-2 items-center">
      <span>Bulk Actions for {selected.length} users:</span>
      <select value={action} onChange={e => setAction(e.target.value)} className="border px-2 py-1">
        <option value="">Select Action</option>
        <option value="delete">Delete</option>
        <option value="activate">Activate</option>
        <option value="deactivate">Deactivate</option>
        <option value="ban">Ban</option>
        <option value="role">Change Role</option>
      </select>
      {action === 'role' && (
        <select value={role} onChange={e => setRole(e.target.value)} className="border px-2 py-1">
          <option value="user">User</option>
          <option value="admin">Admin</option>
          <option value="moderator">Moderator</option>
        </select>
      )}
      <button onClick={() => bulkMutation.mutate()} disabled={!action || selected.length === 0} className="border px-2 py-1">Apply</button>
    </div>
  );
};
export default UserBulkActions;
