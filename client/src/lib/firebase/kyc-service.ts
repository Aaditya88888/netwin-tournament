import { db } from './index';

import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  orderBy, 
  serverTimestamp,
  Unsubscribe,
  getDocs,
  limit,
  startAfter,
  DocumentSnapshot
} from 'firebase/firestore';

export interface KYCDocument {
  id: string;
  userId: string;
  frontImageUrl?: string;
  backImageUrl?: string;
  selfieUrl?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: Date;
  updatedAt: Date;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
}

export interface KYCUser {
  id: string;
  uid: string;
  name: string;
  email: string;
  phone?: string;
  kycStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  kycDocuments?: {
    idProof?: string;
    addressProof?: string;
    selfie?: string;
  };
  status: 'active' | 'inactive' | 'banned';
  createdAt: Date;
  updatedAt: Date;
}

export interface ExtendedUser extends KYCUser {
  username: string;
  isAdmin: boolean;
  walletBalance: number;
}

export class KYCRealtimeService {
  private unsubscribers: Map<string, Unsubscribe> = new Map();

  /**
   * Subscribe to real-time updates for pending KYC users
   */
  subscribeToPendingKYC(callback: (users: KYCUser[]) => void): Unsubscribe {
    const unsubscribeKey = 'pending-kyc';
    
    // Clean up any existing subscription
    this.unsubscribe(unsubscribeKey);

    const usersQuery = query(
      collection(db, 'users'),
      where('kycStatus', '==', 'pending')
    );

    const unsubscribe = onSnapshot(usersQuery, async (snapshot) => {
      try {
        const users: KYCUser[] = [];
        
        // Process users in batches to avoid individual KYC document queries
        for (const userDoc of snapshot.docs) {
          const userData = userDoc.data();
          
          // Basic user data
          const user: KYCUser = {
            id: userDoc.id,
            uid: userData.uid || userDoc.id,
            name: userData.name || 'Unknown User',
            email: userData.email || '',
            phone: userData.phone,
            kycStatus: userData.kycStatus || 'pending',
            status: userData.status || 'active',
            createdAt: userData.createdAt?.toDate() || new Date(),
            updatedAt: userData.updatedAt?.toDate() || new Date(),
          };

          // Try to get KYC documents without complex queries
          // Use simple document-based approach to avoid index issues
          try {
            const kycQuery = query(
              collection(db, 'kyc_documents'),
              where('userId', '==', userData.uid || userDoc.id),
              limit(1)
            );
            
            const kycSnapshot = await getDocs(kycQuery);
            
            if (!kycSnapshot.empty) {
              const kycDoc = kycSnapshot.docs[0].data();
              user.kycDocuments = {
                idProof: kycDoc.frontImageUrl || null,
                addressProof: kycDoc.backImageUrl || null,
                selfie: kycDoc.selfieUrl || null
              };
            }          } catch (kycError) {
            console.warn(`Could not fetch KYC documents for user ${user.uid}:`, kycError);
            // Continue without KYC documents rather than failing
            user.kycDocuments = undefined;
          }

          users.push(user);
        }

        callback(users);
      } catch (error) {
        console.error('Error processing KYC users:', error);
        callback([]);
      }
    }, (error) => {
      console.error('Error in KYC real-time subscription:', error);
      callback([]);
    });

    this.unsubscribers.set(unsubscribeKey, unsubscribe);
    return unsubscribe;
  }

  /**
   * Subscribe to real-time updates for all users with KYC data
   */
  subscribeToAllUsersWithKYC(callback: (users: KYCUser[]) => void): Unsubscribe {
    const unsubscribeKey = 'all-users-kyc';
    
    // Clean up any existing subscription
    this.unsubscribe(unsubscribeKey);

    const usersQuery = query(collection(db, 'users'));

    const unsubscribe = onSnapshot(usersQuery, async (snapshot) => {
      try {
        const users: KYCUser[] = [];
        
        for (const userDoc of snapshot.docs) {
          const userData = userDoc.data();
          
          const user: KYCUser = {
            id: userDoc.id,
            uid: userData.uid || userDoc.id,
            name: userData.name || 'Unknown User',
            email: userData.email || '',
            phone: userData.phone,
            kycStatus: userData.kycStatus || 'pending',
            status: userData.status || 'active',
            createdAt: userData.createdAt?.toDate() || new Date(),
            updatedAt: userData.updatedAt?.toDate() || new Date(),
          };

          // Only fetch KYC documents for users who have submitted KYC
          if (userData.kycStatus && userData.kycStatus !== 'not_submitted') {
            try {
              const kycQuery = query(
                collection(db, 'kyc_documents'),
                where('userId', '==', userData.uid || userDoc.id),
                limit(1)
              );
              
              const kycSnapshot = await getDocs(kycQuery);
              
              if (!kycSnapshot.empty) {
                const kycDoc = kycSnapshot.docs[0].data();
                user.kycDocuments = {
                  idProof: kycDoc.frontImageUrl || null,
                  addressProof: kycDoc.backImageUrl || null,
                  selfie: kycDoc.selfieUrl || null
                };
              }
            } catch (kycError) {
              console.warn(`Could not fetch KYC documents for user ${user.uid}:`, kycError);
            }
          }

          users.push(user);
        }

        callback(users);
      } catch (error) {
        console.error('Error processing all users with KYC:', error);
        callback([]);
      }
    }, (error) => {
      console.error('Error in all users KYC real-time subscription:', error);
      callback([]);
    });

    this.unsubscribers.set(unsubscribeKey, unsubscribe);
    return unsubscribe;
  }

  /**
   * Subscribe to real-time updates for all users with extended KYC data
   */
  subscribeToAllExtendedUsersWithKYC(callback: (users: ExtendedUser[]) => void): Unsubscribe {
    const unsubscribeKey = 'all-extended-users-kyc';
    
    // Clean up any existing subscription
    this.unsubscribe(unsubscribeKey);

    const usersQuery = query(collection(db, 'users'));

    const unsubscribe = onSnapshot(usersQuery, async (snapshot) => {
      try {
        const users: ExtendedUser[] = [];
        
        for (const userDoc of snapshot.docs) {
          const userData = userDoc.data();
          
          const user: ExtendedUser = {
            id: userDoc.id,
            uid: userData.uid || userDoc.id,
            name: userData.name || userData.displayName || 'Unknown User',
            username: userData.username || userData.email?.split('@')[0] || 'unknown',
            email: userData.email || '',
            phone: userData.phone,
            isAdmin: userData.isAdmin || false,
            walletBalance: userData.walletBalance || 0,
            kycStatus: userData.kycStatus || 'pending',
            status: userData.status || 'active',
            createdAt: userData.createdAt?.toDate() || new Date(),
            updatedAt: userData.updatedAt?.toDate() || new Date(),
          };

          // Try to get KYC documents
          try {
            const kycQuery = query(
              collection(db, 'kyc_documents'),
              where('userId', '==', userData.uid || userDoc.id),
              limit(1)
            );
            
            const kycSnapshot = await getDocs(kycQuery);
            
            if (!kycSnapshot.empty) {
              const kycDoc = kycSnapshot.docs[0].data();
              user.kycDocuments = {
                idProof: kycDoc.frontImageUrl || undefined,
                addressProof: kycDoc.backImageUrl || undefined,
                selfie: kycDoc.selfieUrl || undefined
              };
            }
          } catch (kycError) {
            console.warn(`Could not fetch KYC documents for user ${user.uid}:`, kycError);
            user.kycDocuments = undefined;
          }

          users.push(user);
        }

        callback(users);
      } catch (error) {
        console.error('Error processing extended KYC users:', error);
        callback([]);
      }
    }, (error) => {
      console.error('Error in extended KYC real-time subscription:', error);
      callback([]);
    });

    this.unsubscribers.set(unsubscribeKey, unsubscribe);
    return unsubscribe;
  }

  /**
   * Subscribe to real-time updates for KYC documents
   */
  subscribeToKYCDocuments(callback: (documents: KYCDocument[]) => void): Unsubscribe {
    const unsubscribeKey = 'kyc-documents';
    
    // Clean up any existing subscription
    this.unsubscribe(unsubscribeKey);

    // Simple query without orderBy to avoid index issues
    const documentsQuery = query(
      collection(db, 'kyc_documents'),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(documentsQuery, (snapshot) => {
      try {
        const documents: KYCDocument[] = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            userId: data.userId,
            frontImageUrl: data.frontImageUrl,
            backImageUrl: data.backImageUrl,
            selfieUrl: data.selfieUrl,
            status: data.status || 'pending',
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            rejectionReason: data.rejectionReason,
            reviewedBy: data.reviewedBy,
            reviewedAt: data.reviewedAt?.toDate(),
          };
        });

        // Sort by createdAt in memory to avoid index requirement
        documents.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        callback(documents);
      } catch (error) {
        console.error('Error processing KYC documents:', error);
        callback([]);
      }
    }, (error) => {
      console.error('Error in KYC documents real-time subscription:', error);
      callback([]);
    });

    this.unsubscribers.set(unsubscribeKey, unsubscribe);
    return unsubscribe;
  }

  /**
   * Update KYC status for a user
   */
  async updateKYCStatus(
    userId: string, 
    status: 'approved' | 'rejected', 
    rejectionReason?: string
  ): Promise<void> {
    try {
      // Update user's KYC status
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        kycStatus: status,
        isVerified: status === 'approved',
        updatedAt: serverTimestamp()
      });

      // Update KYC document status
      const kycQuery = query(
        collection(db, 'kyc_documents'),
        where('userId', '==', userId),
        limit(1)
      );
      
      const kycSnapshot = await getDocs(kycQuery);
      
      if (!kycSnapshot.empty) {
        const kycDocRef = kycSnapshot.docs[0].ref;
        const updateData: any = {
          status,
          reviewedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        if (status === 'rejected' && rejectionReason) {
          updateData.rejectionReason = rejectionReason;
        }

        await updateDoc(kycDocRef, updateData);
      }
    } catch (error) {
      console.error('Error updating KYC status:', error);
      throw error;
    }
  }

  /**
   * Get paginated KYC documents (for admin review)
   */
  async getKYCDocumentsPaginated(
    pageSize: number = 10, 
    lastDoc?: DocumentSnapshot
  ): Promise<{ documents: KYCDocument[], lastDoc?: DocumentSnapshot }> {
    try {
      let documentsQuery = query(
        collection(db, 'kyc_documents'),
        limit(pageSize)
      );

      if (lastDoc) {
        documentsQuery = query(documentsQuery, startAfter(lastDoc));
      }

      const snapshot = await getDocs(documentsQuery);
      
      const documents: KYCDocument[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          frontImageUrl: data.frontImageUrl,
          backImageUrl: data.backImageUrl,
          selfieUrl: data.selfieUrl,
          status: data.status || 'pending',
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          rejectionReason: data.rejectionReason,
          reviewedBy: data.reviewedBy,
          reviewedAt: data.reviewedAt?.toDate(),
        };
      });

      const lastDocument = snapshot.docs[snapshot.docs.length - 1];

      return {
        documents,
        lastDoc: lastDocument
      };
    } catch (error) {
      console.error('Error getting paginated KYC documents:', error);
      throw error;
    }
  }

  /**
   * Get all users with KYC data (one-time fetch)
   */
  async getAllUsersWithKYC(): Promise<ExtendedUser[]> {
    try {
      const usersSnapshot = await getDocs(query(collection(db, 'users')));
      const users: ExtendedUser[] = [];

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        
        const user: ExtendedUser = {
          id: userDoc.id,
          uid: userData.uid || userDoc.id,
          name: userData.name || userData.displayName || 'Unknown User',
          username: userData.username || userData.email?.split('@')[0] || 'unknown',
          email: userData.email || '',
          phone: userData.phone,
          isAdmin: userData.isAdmin || false,
          walletBalance: userData.walletBalance || 0,
          kycStatus: userData.kycStatus || 'pending',
          status: userData.status || 'active',
          createdAt: userData.createdAt?.toDate() || new Date(),
          updatedAt: userData.updatedAt?.toDate() || new Date(),
        };

        // Try to get KYC documents
        try {
          const kycQuery = query(
            collection(db, 'kyc_documents'),
            where('userId', '==', userData.uid || userDoc.id),
            limit(1)
          );
          
          const kycSnapshot = await getDocs(kycQuery);
            if (!kycSnapshot.empty) {
            const kycDoc = kycSnapshot.docs[0].data();
            user.kycDocuments = {
              idProof: kycDoc.frontImageUrl || undefined,
              addressProof: kycDoc.backImageUrl || undefined,
              selfie: kycDoc.selfieUrl || undefined
            };
          }
        } catch (kycError) {
          console.warn(`Could not fetch KYC documents for user ${user.uid}:`, kycError);
          user.kycDocuments = undefined;
        }

        users.push(user);
      }

      return users;
    } catch (error) {
      console.error('Error fetching all users with KYC:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from a specific subscription
   */
  private unsubscribe(key: string): void {
    const unsubscribe = this.unsubscribers.get(key);
    if (unsubscribe) {
      unsubscribe();
      this.unsubscribers.delete(key);
    }
  }

  /**
   * Clean up all subscriptions
   */
  cleanup(): void {
    this.unsubscribers.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.unsubscribers.clear();
  }
}

// Export a singleton instance
export const kycRealtimeService = new KYCRealtimeService();
