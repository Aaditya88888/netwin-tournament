import { 
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  Timestamp,
  serverTimestamp,
  increment,
  CollectionReference,
  DocumentData,
  Query,
  writeBatch
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from './firebase';
import type {
  Tournament,
  Match,
  Participant,
  Transaction,
  Announcement,
  Notification,
  UserProfile,
  TournamentFilters,
  PaginationParams,
  TournamentStatus,
  MatchStatus,
  ParticipantStatus,
  TransactionStatus
} from '../../types/shared';

// Collection names
const COLLECTIONS = {
  TOURNAMENTS: 'tournaments',
  MATCHES: 'matches',
  PARTICIPANTS: 'participants',
  TRANSACTIONS: 'transactions',
  ANNOUNCEMENTS: 'announcements',
  NOTIFICATIONS: 'notifications',
  USERS: 'users',
} as const;

// Helper function to convert Firestore timestamp to Date
const convertTimestamps = <T extends Record<string, any>>(data: DocumentData): T => {
  const result = { ...data } as { [key: string]: any };
  for (const key of Object.keys(result)) {
    const value = result[key];
    if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
      result[key] = value.toDate();
    }
  }
  return result as T;
};

// Match Services for internal use
const matchService = {
  // Get matches for a tournament
  async getTournamentMatches(tournamentId: string) {
    try {
      const q = query(
        collection(db, COLLECTIONS.MATCHES),
        where('tournamentId', '==', tournamentId)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        ...convertTimestamps(doc.data() as Match),
        id: doc.id
      }));
    } catch (error) {
      console.error('Error fetching matches:', error);
      throw error;
    }
  }
};

// Tournament Management Services
export const adminTournamentService = {
  // Create a new tournament
  async createTournament(data: Omit<Tournament, 'id' | 'createdAt' | 'updatedAt' | 'currentParticipants'>) {
    try {
      const tournament = {
        ...data,
        currentParticipants: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, COLLECTIONS.TOURNAMENTS), tournament);
      return {
        ...data,
        id: docRef.id,
        currentParticipants: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      } as Tournament;
    } catch (error) {
      console.error('Error creating tournament:', error);
      throw error;
    }
  },

  // Update tournament details
  async updateTournament(id: string, data: Partial<Tournament>) {
    try {
      const docRef = doc(db, COLLECTIONS.TOURNAMENTS, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      });

      // Create notification for all participants if status changes
      if (data.status) {
        const participants = await this.getTournamentParticipants(id);
        const batch = writeBatch(db);
        
        participants.forEach(participant => {
          const notificationRef = doc(collection(db, COLLECTIONS.NOTIFICATIONS));
          batch.set(notificationRef, {
            userId: participant.userId,
            title: 'Tournament Update',
            message: `Tournament "${data.title || 'Unknown'}" status changed to ${data.status}`,
            type: 'tournament',
            read: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        });

        await batch.commit();
      }
    } catch (error) {
      console.error('Error updating tournament:', error);
      throw error;
    }
  },

  // Delete tournament and related data
  async deleteTournament(id: string) {
    try {
      const batch = writeBatch(db);
      
      // Delete tournament document
      batch.delete(doc(db, COLLECTIONS.TOURNAMENTS, id));
      
      // Delete related matches
      const matches = await matchService.getTournamentMatches(id);
      matches.forEach(match => {
        batch.delete(doc(db, COLLECTIONS.MATCHES, match.id));
      });
      
      // Delete participant registrations
      const participants = await this.getTournamentParticipants(id);
      participants.forEach(participant => {
        batch.delete(doc(db, COLLECTIONS.PARTICIPANTS, participant.id));
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error deleting tournament:', error);
      throw error;
    }
  },

  // Get tournament participants
  async getTournamentParticipants(tournamentId: string): Promise<Participant[]> {
    try {
      const q = query(
        collection(db, COLLECTIONS.PARTICIPANTS),
        where('tournamentId', '==', tournamentId)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        ...convertTimestamps<Omit<Participant, 'id'>>(doc.data()),
        id: doc.id
      })) as Participant[];
    } catch (error) {
      console.error('Error fetching tournament participants:', error);
      throw error;
    }
  }
};

// Match Management Services
export const adminMatchService = {
  // Create a match for a tournament
  async createMatch(tournamentId: string, participants: string[]): Promise<Match> {
    try {
      const match: Omit<Match, 'id' | 'createdAt' | 'updatedAt'> = {
        tournamentId,
        participants,
        status: 'scheduled',
        startTime: new Date()
      };

      const docRef = await addDoc(collection(db, COLLECTIONS.MATCHES), {
        ...match,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Notify participants
      const batch = writeBatch(db);
      participants.forEach(userId => {
        const notificationRef = doc(collection(db, COLLECTIONS.NOTIFICATIONS));
        batch.set(notificationRef, {
          userId,
          title: 'Match Scheduled',
          message: 'You have been scheduled for a match',
          type: 'match',
          read: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });
      await batch.commit();

      return {
        ...match,
        id: docRef.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Error creating match:', error);
      throw error;
    }
  },

  // Update match status and results
  async updateMatch(id: string, data: Partial<Match>) {
    try {
      const docRef = doc(db, COLLECTIONS.MATCHES, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      });

      // If winner is declared, update participant statuses
      if (data.winnerId) {
        const match = await getDoc(docRef);
        if (match.exists()) {
          const matchData = convertTimestamps<Match>(match.data());
          const batch = writeBatch(db);

          // Update participant statuses
          for (const participantId of matchData.participants) {
            const participantRef = doc(db, COLLECTIONS.PARTICIPANTS, participantId);
            batch.update(participantRef, {
              status: participantId === data.winnerId ? 'winner' : 'eliminated',
              updatedAt: serverTimestamp()
            });
          }

          await batch.commit();
        }
      }
    } catch (error) {
      console.error('Error updating match:', error);
      throw error;
    }
  }
};

// User Management Services
export const adminUserService = {
  // Get all users with pagination
  async getUsers(pagination?: PaginationParams): Promise<UserProfile[]> {
    try {
      let q: Query<DocumentData> = collection(db, COLLECTIONS.USERS);

      if (pagination) {
        q = query(q,
          orderBy(pagination.sortBy || 'createdAt', pagination.sortOrder || 'desc'),
          limit(pagination.limit)
        );
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        ...convertTimestamps<Omit<UserProfile, 'id'>>(doc.data()),
        id: doc.id
      })) as UserProfile[];
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },

  // Update user profile
  async updateUser(userId: string, data: Partial<UserProfile>) {
    try {
      const docRef = doc(db, COLLECTIONS.USERS, userId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }
};

// Announcement Management Services
export const adminAnnouncementService = {
  // Create announcement
  async createAnnouncement(data: Omit<Announcement, 'id' | 'createdAt' | 'updatedAt'>): Promise<Announcement> {
    try {
      const announcement = {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, COLLECTIONS.ANNOUNCEMENTS), announcement);
      return {
        ...data,
        id: docRef.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Error creating announcement:', error);
      throw error;
    }
  },

  // Update announcement
  async updateAnnouncement(id: string, data: Partial<Announcement>) {
    try {
      const docRef = doc(db, COLLECTIONS.ANNOUNCEMENTS, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating announcement:', error);
      throw error;
    }
  },

  // Delete announcement
  async deleteAnnouncement(id: string) {
    try {
      await deleteDoc(doc(db, COLLECTIONS.ANNOUNCEMENTS, id));
    } catch (error) {
      console.error('Error deleting announcement:', error);
      throw error;
    }
  }
};

// Transaction Management Services
export const adminTransactionService = {
  // Get all transactions with filters
  async getTransactions(
    filters?: { userId?: string; status?: TransactionStatus },
    pagination?: PaginationParams
  ): Promise<Transaction[]> {
    try {
      let q: Query<DocumentData> = collection(db, COLLECTIONS.TRANSACTIONS);

      if (filters) {
        if (filters.userId) {
          q = query(q, where('userId', '==', filters.userId));
        }
        if (filters.status) {
          q = query(q, where('status', '==', filters.status));
        }
      }

      if (pagination) {
        q = query(q,
          orderBy(pagination.sortBy || 'createdAt', pagination.sortOrder || 'desc'),
          limit(pagination.limit)
        );
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        ...convertTimestamps<Omit<Transaction, 'id'>>(doc.data()),
        id: doc.id
      })) as Transaction[];
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  },

  // Update transaction status
  async updateTransactionStatus(id: string, status: TransactionStatus) {
    try {
      const docRef = doc(db, COLLECTIONS.TRANSACTIONS, id);
      await updateDoc(docRef, {
        status,
        updatedAt: serverTimestamp()
      });

      // Get transaction details
      const transaction = await getDoc(docRef);
      if (transaction.exists()) {
        const transactionData = convertTimestamps<Transaction>(transaction.data());

        // Create notification for user
        await addDoc(collection(db, COLLECTIONS.NOTIFICATIONS), {
          userId: transactionData.userId,
          title: 'Transaction Update',
          message: `Your transaction of ${transactionData.amount} ${transactionData.currency} has been ${status}`,
          type: 'wallet',
          read: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error updating transaction status:', error);
      throw error;
    }
  }
}; 