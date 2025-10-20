import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';


const UserNotes = ({ user, open, onClose }: any) => {
  const queryClient = useQueryClient();
  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['user-notes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await apiRequest('GET', `/users/${user.id}/notes`);
      return res.json();
    },
    enabled: !!user?.id && open,
  });
  const [note, setNote] = useState('');
  const addNote = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', `/users/${user.id}/notes`, { note });
    },
    onSuccess: () => {
      setNote('');
      queryClient.invalidateQueries({ queryKey: ['user-notes', user?.id] });
    }
  });
  if (!open) return null;
  return (
    <div className="fixed right-0 top-0 w-80 h-full bg-gray-50 shadow-lg z-50 p-4">
      <button onClick={onClose} className="absolute top-2 right-2">Close</button>
      <div className="mb-2 font-bold">Notes for {user?.email || user?.username}</div>
      <div className="mb-2">
        <textarea value={note} onChange={e => setNote(e.target.value)} className="w-full border p-1" placeholder="Add note..." />
        <button onClick={() => addNote.mutate()} disabled={!note} className="mt-1 border px-2 py-1">Add Note</button>
      </div>
      <div className="overflow-y-auto max-h-80">
        {isLoading ? 'Loading...' : notes.length === 0 ? 'No notes.' : notes.map((n: any) => (
          <div key={n.id} className="mb-2 p-2 bg-white border rounded">
            <div className="text-xs text-gray-500">{n.adminEmail} - {n.createdAt}</div>
            <div>{n.note}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default UserNotes;
