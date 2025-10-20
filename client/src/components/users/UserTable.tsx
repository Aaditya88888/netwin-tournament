import React, { useState } from 'react';
import UserDetailDrawer from './UserDetailDrawer';
import UserNotes from './UserNotes';
import UserNotificationModal from './UserNotificationModal';
import UserImpersonateModal from './UserImpersonateModal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';


const UserTable: React.FC = () => {
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showNotify, setShowNotify] = useState(false);
  const [showImpersonate, setShowImpersonate] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [role, setRole] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const userQuery = useQuery({
    queryKey: ['users', { search, status, role }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('q', search);
      if (status) params.append('status', status);
      if (role) params.append('role', role);
      const res = await apiRequest('GET', `/users/search?${params.toString()}`);
      return res.json();
    },
  });
  const users: any[] = userQuery.data || [];
  const isLoading = userQuery.isLoading;
  const refetch = userQuery.refetch;

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest('DELETE', `/users/${userId}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] })
  });

  return (
    <div>
      <div className="flex gap-2 mb-2">
        <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="border px-2 py-1" />
        <select value={status} onChange={e => setStatus(e.target.value)} className="border px-2 py-1">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="banned">Banned</option>
        </select>
        <select value={role} onChange={e => setRole(e.target.value)} className="border px-2 py-1">
          <option value="">All Roles</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
          <option value="moderator">Moderator</option>
        </select>
        <button onClick={() => refetch()} className="border px-2 py-1">Search</button>
      </div>
      <table className="w-full border mb-4">
        <thead>
          <tr>
            <th><input type="checkbox" checked={selected.length === users.length && users.length > 0} onChange={e => setSelected(e.target.checked ? users.map((u: any) => u.id) : [])} /></th>
            <th>Email</th>
            <th>Username</th>
            <th>Status</th>
            <th>Role</th>
            <th>KYC</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? <tr><td colSpan={7}>Loading...</td></tr> : users.length === 0 ? <tr><td colSpan={7}>No users found</td></tr> : users.map((user: any) => (
            <tr key={user.id} className={selected.includes(user.id) ? 'bg-blue-50' : ''}>
              <td><input type="checkbox" checked={selected.includes(user.id)} onChange={e => setSelected(e.target.checked ? [...selected, user.id] : selected.filter(id => id !== user.id))} /></td>
              <td>{user.email}</td>
              <td>{user.username}</td>
              <td>{user.status}</td>
              <td>{user.role}</td>
              <td>{user.kycStatus}</td>
              <td>
                <button onClick={() => { setSelectedUser(user); setShowDetail(true); }}>Detail</button>
                <button onClick={() => { setSelectedUser(user); setShowNotes(true); }}>Notes</button>
                <button onClick={() => { setSelectedUser(user); setShowNotify(true); }}>Notify</button>
                <button onClick={() => { setSelectedUser(user); setShowImpersonate(true); }}>Impersonate</button>
                <button onClick={() => deleteUser.mutate(user.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <UserDetailDrawer user={selectedUser} open={showDetail} onClose={() => setShowDetail(false)} />
      <UserNotes user={selectedUser} open={showNotes} onClose={() => setShowNotes(false)} />
      <UserNotificationModal user={selectedUser} open={showNotify} onClose={() => setShowNotify(false)} />
      <UserImpersonateModal user={selectedUser} open={showImpersonate} onClose={() => setShowImpersonate(false)} />
    </div>
  );
};

export default UserTable;
