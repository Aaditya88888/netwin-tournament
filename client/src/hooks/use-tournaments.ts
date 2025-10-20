import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Tournament } from '@shared/schema';
import { useEffect } from 'react';


export function useTournaments(options?: {
  refetchInterval?: number;
  enableRealtime?: boolean;
}) {
  const query = useQuery({
    queryKey: ['/tournaments'],
    queryFn: async (): Promise<Tournament[]> => {
      const response = await apiRequest('GET', '/tournaments');
      return await response.json();
    },
    // Enable background refetching every 30 seconds by default for live updates
    refetchInterval: options?.refetchInterval ?? 30000,
    // Keep data fresh when user comes back to tab
    refetchOnWindowFocus: true,
    // Refetch when coming back online
    refetchOnReconnect: true,
  });

  // Optional real-time updates using polling when component is focused
  useEffect(() => {
    if (!options?.enableRealtime) return;

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Refetch when tab becomes visible
        query.refetch();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [query, options?.enableRealtime]);

  return query;
}
