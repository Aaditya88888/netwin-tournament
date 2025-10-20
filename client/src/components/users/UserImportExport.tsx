import React, { useRef } from 'react';
import { apiRequest } from '@/lib/queryClient';


const UserImportExport = () => {
  const fileInput = useRef<HTMLInputElement>(null);
  const handleExport = async () => {
    const res = await apiRequest('GET', '/users/export');
    const csv = await res.text();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users.csv';
    a.click();
    URL.revokeObjectURL(url);
  };
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    await apiRequest('POST', '/users/import', { csv: text });
    alert('Import complete!');
  };
  return (
    <div className="mb-4 flex gap-2 items-center">
      <button onClick={handleExport} className="border px-2 py-1">Export Users (CSV)</button>
      <input type="file" accept=".csv" ref={fileInput} onChange={handleImport} className="hidden" />
      <button onClick={() => fileInput.current?.click()} className="border px-2 py-1">Import Users (CSV)</button>
    </div>
  );
};
export default UserImportExport;
