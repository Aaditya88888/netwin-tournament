import React from "react";
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';


type AnalyticsSummary = { total: number; active: number; banned: number };

const UserAnalytics = () => {
  const analyticsQuery = useQuery<AnalyticsSummary>({
    queryKey: ['user-analytics'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/users/analytics/summary');
      return res.json();
    },
  });
  const data = analyticsQuery.data;
  const isLoading = analyticsQuery.isLoading;

  if (isLoading) return <div>Loading analytics...</div>;
  if (!data) return <div>No analytics data.</div>;

  return (
    <div className="mb-4 flex gap-8">
      <div>Total Users: <b>{data.total}</b></div>
      <div>Active: <b>{data.active}</b></div>
      <div>Banned: <b>{data.banned}</b></div>
      {/* Add more analytics as needed */}
    </div>
  );
};
export default UserAnalytics;
