import { useEffect } from 'react';
import { tournamentRealtimeService } from '@/lib/firebase/tournament-realtime-service';


/**
 * Hook to enable real-time tournament updates
 */
export function useTournamentRealtime(options?: {
  enableTournaments?: boolean;
  enableRegistrations?: boolean;
  tournamentId?: string;
}) {
  useEffect(() => {
    const subscriptions: string[] = [];

    // Subscribe to tournaments if enabled
    if (options?.enableTournaments !== false) {
      tournamentRealtimeService.subscribeToTournaments();
      subscriptions.push('tournaments');
    }

    // Subscribe to registrations if enabled
    if (options?.enableRegistrations) {
      tournamentRealtimeService.subscribeToTournamentRegistrations(options.tournamentId);
      const key = options.tournamentId ? `registrations-${options.tournamentId}` : 'registrations';
      subscriptions.push(key);
    }

    // Subscribe to specific tournament if provided
    if (options?.tournamentId && options?.enableTournaments !== false) {
      tournamentRealtimeService.subscribeToTournament(options.tournamentId);
      subscriptions.push(`tournament-${options.tournamentId}`);
    }

    // Cleanup on unmount
    return () => {
      subscriptions.forEach(key => {
        tournamentRealtimeService.unsubscribe(key);
      });
    };
  }, [options?.enableTournaments, options?.enableRegistrations, options?.tournamentId]);

  return {
    activeListeners: tournamentRealtimeService.getActiveListenerCount(),
    unsubscribeAll: () => tournamentRealtimeService.unsubscribeAll(),
  };
}
