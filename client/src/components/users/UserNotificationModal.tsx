import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';


const UserNotificationModal = ({ user, open, onClose }: any) => {
  const [type, setType] = useState('in-app');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const sendNotification = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', `/users/${user.id}/notify`, { type, subject, message });
    },
    onSuccess: () => {
      setSubject('');
      setMessage('');
      onClose();
    }
  });
  if (!open) return null;
  return (
    <div className="fixed right-0 top-0 w-80 h-full bg-gray-50 shadow-lg z-50 p-4">
      <button onClick={onClose} className="absolute top-2 right-2">Close</button>
      <div className="mb-2 font-bold">Send Notification to {user?.email || user?.username}</div>
      <div className="mb-2">
        <select value={type} onChange={e => setType(e.target.value)} className="border px-2 py-1">
          <option value="in-app">In-App</option>
          <option value="email">Email</option>
          <option value="sms">SMS</option>
        </select>
      </div>
      <div className="mb-2">
        <input value={subject} onChange={e => setSubject(e.target.value)} className="w-full border p-1" placeholder="Subject" />
      </div>
      <div className="mb-2">
        <textarea value={message} onChange={e => setMessage(e.target.value)} className="w-full border p-1" placeholder="Message..." />
      </div>
      <button onClick={() => sendNotification.mutate()} disabled={!message} className="border px-2 py-1">Send</button>
    </div>
  );
};
export default UserNotificationModal;
