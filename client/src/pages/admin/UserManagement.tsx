import React, { useState } from 'react';
import UserTable from '@/components/users/UserTable';
import UserAnalytics from '@/components/users/UserAnalytics';
import UserBulkActions from '@/components/users/UserBulkActions';
import UserImportExport from '@/components/users/UserImportExport';


const UserManagement: React.FC = () => {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  
  const clearSelected = () => {
    setSelectedUsers([]);
  };

  return (
    <div className="p-6 space-y-6">
      <UserAnalytics />
      <UserBulkActions selected={selectedUsers} clearSelected={clearSelected} />
      <UserImportExport />
      <UserTable />
    </div>
  );
};

export default UserManagement;
