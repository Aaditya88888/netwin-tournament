import React from "react";
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';


const UserDetailDrawer = ({ user, open, onClose }: any) => {
  const { data: detail, isLoading } = useQuery({
    queryKey: ['user-detail', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const res = await apiRequest('GET', `/users/${user.id}/detail`);
      return res.json();
    },
    enabled: !!user?.id && open,
  });
  if (!open) return null;
  return (
    <div className="fixed right-0 top-0 w-96 h-full bg-white shadow-lg z-50 p-4 overflow-y-auto">
      <button onClick={onClose} className="absolute top-2 right-2">Close</button>
      <div className="mb-2 font-bold">User Detail for {user?.email || user?.username}</div>
      {isLoading ? 'Loading...' : !detail ? 'No detail.' : (
        <div>
          <div><b>Email:</b> {detail.email}</div>
          <div><b>Username:</b> {detail.username}</div>
          <div><b>Status:</b> {detail.status}</div>
          <div><b>Role:</b> {detail.role}</div>
          <div><b>KYC Status:</b> {detail.kycStatus?.toUpperCase?.()}</div>
          {detail.kycStatus?.toUpperCase?.() === 'PENDING' && (
            <div className="flex gap-2 mt-2">
              <button
                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                onClick={async () => {
                  await apiRequest('POST', `/users/${user.id}/kyc-status`, { status: 'APPROVED' });
                  onClose();
                }}
              >
                Approve KYC
              </button>
              <button
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                onClick={async () => {
                  await apiRequest('POST', `/users/${user.id}/kyc-status`, { status: 'REJECTED' });
                  onClose();
                }}
              >
                Reject KYC
              </button>
            </div>
          )}
          {detail.kycDocuments && (
            <div className="mt-2">
              <div className="font-semibold">KYC Documents:</div>
              {detail.kycDocuments.idProof && (
                <div className="mb-2">
                  <b>ID Proof:</b> <a href={detail.kycDocuments.idProof} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">View</a><br/>
                  <img src={detail.kycDocuments.idProof} alt="ID Proof" className="max-w-full max-h-32 mt-1 border" />
                </div>
              )}
              {detail.kycDocuments.addressProof && (
                <div className="mb-2">
                  <b>Address Proof:</b> <a href={detail.kycDocuments.addressProof} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">View</a><br/>
                  <img src={detail.kycDocuments.addressProof} alt="Address Proof" className="max-w-full max-h-32 mt-1 border" />
                </div>
              )}
              {detail.kycDocuments.selfie && (
                <div className="mb-2">
                  <b>Selfie:</b> <a href={detail.kycDocuments.selfie} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">View</a><br/>
                  <img src={detail.kycDocuments.selfie} alt="Selfie" className="max-w-full max-h-32 mt-1 border" />
                </div>
              )}
            </div>
          )}
          {/* Add more: transactions, tournaments, audit, notes, notifications */}
        </div>
      )}
    </div>
  );
};
export default UserDetailDrawer;
