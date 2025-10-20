import { onSnapshot, collection, query, where, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { queryClient } from '@/lib/queryClient';


/**
 * Real-time Tournament Service
 * Provides real-time updates for tournament data using Firestore listeners
 */
export class TournamentRealtimeService {
  private listeners: Map<string, () => void> = new Map();

  /**
   * Subscribe to real-time updates for all tournaments
   */
  subscribeToTournaments(callback?: (tournaments: any[]) => void) {
    const tournamentsRef = collection(db, 'tournaments');
    
    const unsubscribe = onSnapshot(tournamentsRef, (snapshot) => {
      console.log('Tournament data updated in real-time');
      
      // Invalidate React Query cache to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['/tournaments'] });
      
      if (callback) {
        const tournaments = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        callback(tournaments);
      }
    }, (error) => {
      console.error('Error in tournament real-time listener:', error);
    });

    this.listeners.set('tournaments', unsubscribe);
    return unsubscribe;
  }

  /**
   * Subscribe to real-time updates for tournament registrations
   */
  subscribeToTournamentRegistrations(tournamentId?: string, callback?: (registrations: any[]) => void) {
    const registrationsRef = collection(db, 'tournament_registrations');
    const registrationsQuery = tournamentId 
      ? query(registrationsRef, where('tournamentId', '==', tournamentId))
      : registrationsRef;
    
    const unsubscribe = onSnapshot(registrationsQuery, (snapshot) => {
      console.log('Tournament registrations updated in real-time');
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['/tournaments'] });
      if (tournamentId) {
        queryClient.invalidateQueries({ queryKey: [`/tournaments/${tournamentId}/registrations`] });
      }
      
      if (callback) {
        const registrations = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        callback(registrations);
      }
    }, (error) => {
      console.error('Error in tournament registrations real-time listener:', error);
    });

    const key = tournamentId ? `registrations-${tournamentId}` : 'registrations';
    this.listeners.set(key, unsubscribe);
    return unsubscribe;
  }

  /**
   * Subscribe to a specific tournament's real-time updates
   */
  subscribeToTournament(tournamentId: string, callback?: (tournament: any) => void) {
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    
    const unsubscribe = onSnapshot(tournamentRef, (doc) => {
      console.log(`Tournament ${tournamentId} updated in real-time`);
      
      // Invalidate React Query cache
      queryClient.invalidateQueries({ queryKey: ['/tournaments'] });
      queryClient.invalidateQueries({ queryKey: [`/tournaments/${tournamentId}`] });
      
      if (callback && doc.exists()) {
        const tournament = { id: doc.id, ...doc.data() };
        callback(tournament);
      }
    }, (error) => {
      console.error(`Error in tournament ${tournamentId} real-time listener:`, error);
    });

    this.listeners.set(`tournament-${tournamentId}`, unsubscribe);
    return unsubscribe;
  }

  /**
   * Unsubscribe from a specific listener
   */
  unsubscribe(key: string) {
    const unsubscribe = this.listeners.get(key);
    if (unsubscribe) {
      unsubscribe();
      this.listeners.delete(key);
      console.log(`Unsubscribed from ${key} real-time updates`);
    }
  }

  /**
   * Unsubscribe from all listeners
   */
  unsubscribeAll() {
    this.listeners.forEach((unsubscribe, key) => {
      unsubscribe();
      console.log(`Unsubscribed from ${key} real-time updates`);
    });
    this.listeners.clear();
  }

  /**
   * Get active listener count
   */
  getActiveListenerCount(): number {
    return this.listeners.size;
  }
}

// Create singleton instance
export const tournamentRealtimeService = new TournamentRealtimeService();
