import { firestore } from './firebase.js';
import { getAuth } from 'firebase-admin/auth';
// Use the initialized Firestore instance
const db = firestore;
const auth = getAuth();
export class FirestoreStorage {
    constructor() {
        if (process.env.NODE_ENV === 'development') {
            console.log('🔥 Initializing FirestoreStorage...');
        }
        try {
            this.db = firestore; // Use the already initialized firestore instance
            if (process.env.NODE_ENV === 'development') {
                console.log('✅ Firestore initialized successfully:', !!this.db);
            }
        }
        catch (error) {
            console.error('❌ Failed to initialize Firestore:', error);
            throw error;
        }
    }
    // User operations
    async getUser(id) {
        const doc = await db.collection('users').doc(id.toString()).get();
        return doc.exists ? doc.data() : undefined;
    }
    async getUserByUsername(username) {
        const snapshot = await db.collection('users').where('username', '==', username).limit(1).get();
        return snapshot.empty ? undefined : snapshot.docs[0].data();
    }
    async getUserByUid(uid) {
        const snapshot = await db.collection('users').where('uid', '==', uid).limit(1).get();
        if (snapshot.empty)
            return undefined;
        const doc = snapshot.docs[0];
        return { ...doc.data(), id: parseInt(doc.id) };
    }
    async createUser(user) {
        const docRef = await db.collection('users').add({
            ...user,
            createdAt: new Date(),
            lastLogin: null,
            phone: user.phone || null,
            profileImage: user.profileImage || null,
            walletBalance: 0, // Ensure initial balance is 0
            isVerified: user.isVerified || false,
            kycStatus: user.kycStatus || "pending",
            kycDocuments: user.kycDocuments || null,
            status: user.status || "active",
            location: user.location || null
        });
        const newUser = await docRef.get();
        return { id: newUser.id, ...newUser.data() }; // Keep as string ID
    }
    async updateUser(id, userData) {
        try {
            // Try to update in Firestore first
            const docRef = db.collection('users').doc(id.toString());
            const docSnapshot = await docRef.get();
            if (docSnapshot.exists) {
                // Update in Firestore
                await docRef.update(userData);
                const updated = await docRef.get();
                return { id, ...updated.data() };
            }
            else {
                // If not in Firestore, check if it's in Auth and sync it
                if (auth) {
                    try {
                        // Check if user exists in Firebase Auth
                        const authUser = await auth.getUser(id.toString());
                        if (authUser) {
                            // Sync user from Auth to Firestore first
                            await this.syncUserFromAuth(id.toString());
                            // Then update with the provided data
                            await docRef.update(userData);
                            const updated = await docRef.get();
                            return { id, ...updated.data() };
                        }
                    }
                    catch (authError) {
                        console.error(`User ${id} not found in Auth:`, authError);
                    }
                }
            }
            // If we've made it here, user doesn't exist in either system
            return undefined;
        }
        catch (error) {
            console.error(`Error updating user ${id}:`, error);
            return undefined;
        }
    }
    async deleteUser(id) {
        try {
            const idStr = id.toString();
            let deletedFromFirestore = false;
            let deletedFromAuth = false;
            let uidToDelete = undefined;
            // First, try to find the user document by document ID (most common case)
            let docToDelete = await db.collection('users').doc(idStr).get();
            if (docToDelete.exists) {
                const userData = docToDelete.data();
                uidToDelete = userData?.uid || idStr;
                await docToDelete.ref.delete();
                deletedFromFirestore = true;
                console.log(`✅ User deleted by document ID: ${idStr}`);
            }
            else {
                // If not found by document ID, try searching by uid field
                const userQuery = await db.collection('users').where('uid', '==', idStr).get();
                if (!userQuery.empty) {
                    uidToDelete = idStr;
                    await userQuery.docs[0].ref.delete();
                    deletedFromFirestore = true;
                    console.log(`✅ User deleted by uid: ${idStr}`);
                }
                else {
                    // If still not found, try searching by numeric id field
                    const numericId = parseInt(idStr);
                    if (!isNaN(numericId)) {
                        const idQuery = await db.collection('users').where('id', '==', numericId).get();
                        if (!idQuery.empty) {
                            const userData = idQuery.docs[0].data();
                            uidToDelete = userData?.uid;
                            await idQuery.docs[0].ref.delete();
                            deletedFromFirestore = true;
                            console.log(`✅ User deleted by numeric id: ${numericId}`);
                        }
                    }
                }
            }
            // Delete from Firebase Auth if we have a UID
            if (uidToDelete) {
                try {
                    await auth.deleteUser(uidToDelete);
                    deletedFromAuth = true;
                    console.log(`✅ User deleted from Firebase Auth: ${uidToDelete}`);
                }
                catch (authError) {
                    console.warn(`⚠️ Could not delete user from Firebase Auth: ${uidToDelete}`, authError);
                }
            }
            else {
                console.warn('⚠️ No UID found for user, skipping Firebase Auth deletion.');
            }
            return deletedFromFirestore;
        }
        catch (error) {
            console.error('Error deleting user:', error);
            return false;
        }
    }
    async deleteUserData(id) {
        const batch = db.batch();
        const idStr = id.toString();
        // Try to find the user document and get its ID
        let userId = idStr;
        // Check if it's a document ID first
        const docExists = await db.collection('users').doc(idStr).get();
        if (docExists.exists) {
            userId = idStr;
        }
        else {
            // Try to find by uid field
            const userQuery = await db.collection('users').where('uid', '==', idStr).get();
            if (!userQuery.empty) {
                userId = userQuery.docs[0].id;
            }
        }
        // Delete user transactions
        const transactionsRef = await db.collection('transactions').where('userId', '==', userId).get();
        transactionsRef.docs.forEach((doc) => batch.delete(doc.ref));
        // Delete user tournament registrations
        const registrationsRef = await db.collection('tournament_registrations').where('userId', '==', userId).get();
        registrationsRef.docs.forEach((doc) => batch.delete(doc.ref));
        // Delete user match history
        const matchesRef = await db.collection('results').where('userId', '==', userId).get();
        matchesRef.docs.forEach((doc) => batch.delete(doc.ref));
        // Delete user wallet
        const walletRef = db.collection('wallets').doc(userId);
        const walletDoc = await walletRef.get();
        if (walletDoc.exists) {
            batch.delete(walletRef);
        }
        await batch.commit();
        console.log(`User data deleted for: ${userId}`);
    }
    async getAllUsers() {
        try {
            // Get users from Firestore
            const snapshot = await db.collection('users').get();
            // First, get all Firestore users
            const firestoreUsers = snapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id, // Keep as string ID (Firestore document ID or Firebase UID)
                    uid: data.uid || doc.id, // Ensure uid is set
                    ...data,
                    source: 'firestore',
                    kycDocuments: null // Initialize as null, will be populated below
                };
            });
            // Get users from Firebase Auth (if auth is available)
            let authUsers = [];
            if (auth) {
                try {
                    // List all users from Firebase Auth (in batches if needed)
                    const listUsersResult = await auth.listUsers();
                    // Map Firebase Auth users to match our format
                    authUsers = listUsersResult.users.map((userRecord) => {
                        // Extract authentication provider
                        let provider = 'email';
                        if (userRecord.providerData && userRecord.providerData.length > 0) {
                            provider = userRecord.providerData[0].providerId || 'email';
                        }
                        const userData = {
                            id: userRecord.uid,
                            uid: userRecord.uid,
                            email: userRecord.email || null,
                            emailVerified: userRecord.emailVerified || false,
                            displayName: userRecord.displayName || null,
                            name: userRecord.displayName || 'Unknown',
                            username: userRecord.email || userRecord.phoneNumber || userRecord.uid,
                            phone: userRecord.phoneNumber || null,
                            photoURL: userRecord.photoURL || null,
                            profileImage: userRecord.photoURL || null,
                            provider,
                            createdAt: new Date(userRecord.metadata.creationTime || Date.now()),
                            lastLogin: userRecord.metadata.lastSignInTime ? new Date(userRecord.metadata.lastSignInTime) : null,
                            disabled: userRecord.disabled,
                            status: userRecord.disabled ? 'inactive' : 'active',
                            kycStatus: 'not_submitted',
                            walletBalance: 0,
                            source: 'auth',
                            kycDocuments: null
                        };
                        return userData;
                    });
                }
                catch (authError) {
                    console.error('Error fetching users from Firebase Auth:', authError);
                }
            }
            // Create a map of UIDs from Firestore to check for duplicates
            const firestoreUidMap = new Map();
            firestoreUsers.forEach((user) => {
                if (user.uid)
                    firestoreUidMap.set(user.uid, user);
            });
            // Find Auth users that aren't in Firestore
            const uniqueAuthUsers = authUsers.filter(user => !firestoreUidMap.has(user.uid));
            // Sync Auth users to Firestore
            if (uniqueAuthUsers.length > 0) {
                console.log(`Syncing ${uniqueAuthUsers.length} users from Auth to Firestore`);
                for (const authUser of uniqueAuthUsers) {
                    try {
                        if (authUser.uid) {
                            // Create minimal user record in Firestore
                            await db.collection('users').doc(authUser.uid).set({
                                uid: authUser.uid,
                                email: authUser.email,
                                name: authUser.name || authUser.displayName,
                                username: authUser.username || authUser.email || authUser.uid,
                                phone: authUser.phone,
                                photoURL: authUser.photoURL,
                                profileImage: authUser.profileImage || authUser.photoURL,
                                provider: authUser.provider || 'auth',
                                createdAt: new Date(),
                                lastLogin: new Date(),
                                status: 'active',
                                kycStatus: 'not_submitted',
                                walletBalance: 0,
                                synced: true,
                                syncedFrom: 'auth'
                            }, { merge: true });
                        }
                    }
                    catch (syncError) {
                        console.error(`Error syncing Auth user to Firestore: ${authUser.uid}`, syncError);
                    }
                }
            }
            // Combine all users, preferring Firestore data when available
            const allUsers = [...firestoreUsers, ...uniqueAuthUsers];
            // Then, batch fetch KYC documents to avoid individual queries
            try {
                // Get all KYC documents at once (without orderBy to avoid index issues)
                const kycSnapshot = await db.collection('kyc_documents').get();
                const kycDocumentsByUser = new Map();
                // Group KYC documents by userId
                kycSnapshot.docs.forEach((doc) => {
                    const kycData = doc.data();
                    const userId = kycData.userId;
                    if (userId) {
                        // Keep the most recent document for each user (sort in memory)
                        if (!kycDocumentsByUser.has(userId)) {
                            kycDocumentsByUser.set(userId, kycData);
                        }
                        else {
                            const existingDoc = kycDocumentsByUser.get(userId);
                            // Compare creation dates - handle both Timestamp and Date objects
                            const newDocDate = kycData.createdAt ?
                                (typeof kycData.createdAt.toDate === 'function' ? kycData.createdAt.toDate() : new Date(kycData.createdAt)) :
                                new Date(0);
                            const existingDocDate = existingDoc.createdAt ?
                                (typeof existingDoc.createdAt.toDate === 'function' ? existingDoc.createdAt.toDate() : new Date(existingDoc.createdAt)) :
                                new Date(0);
                            if (newDocDate > existingDocDate) {
                                kycDocumentsByUser.set(userId, kycData);
                            }
                        }
                    }
                });
                // Attach KYC documents to users
                allUsers.forEach((user) => {
                    if (user.kycStatus && user.kycStatus !== 'not_submitted') {
                        const kycDoc = kycDocumentsByUser.get(user.uid || user.id);
                        if (kycDoc) {
                            user.kycDocuments = {
                                idProof: kycDoc.frontImageUrl || null,
                                addressProof: kycDoc.backImageUrl || null,
                                selfie: kycDoc.selfieUrl || null
                            };
                        }
                    }
                });
            }
            catch (kycError) {
                console.warn('Could not fetch KYC documents in batch:', kycError);
                // Continue without KYC documents rather than failing
            }
            return allUsers;
        }
        catch (error) {
            console.error('Error fetching all users:', error);
            return [];
        }
    }
    async getPendingKycUsers() {
        try {
            const snapshot = await db.collection('users')
                .where('kycStatus', '==', 'pending')
                .get();
            // First, get all pending users
            const users = snapshot.docs.map((doc) => {
                const userData = doc.data();
                return {
                    id: doc.id, // Keep as string ID for Firebase UID compatibility
                    ...userData,
                    kycDocuments: null // Initialize as null
                };
            });
            // Then, batch fetch KYC documents for pending users only
            if (users.length > 0) {
                try {
                    // Get KYC documents for pending users (without problematic orderBy)
                    const userIds = users.map((user) => user.uid || user.id);
                    const kycSnapshot = await db.collection('kyc_documents')
                        .where('userId', 'in', userIds.slice(0, 10)) // Firestore 'in' query limit is 10
                        .get();
                    const kycDocumentsByUser = new Map();
                    kycSnapshot.docs.forEach((doc) => {
                        const kycData = doc.data();
                        const userId = kycData.userId;
                        if (userId) {
                            // Keep the most recent document (sort in memory)
                            if (!kycDocumentsByUser.has(userId) ||
                                (kycData.createdAt && kycDocumentsByUser.get(userId).createdAt &&
                                    kycData.createdAt.toDate() > kycDocumentsByUser.get(userId).createdAt.toDate())) {
                                kycDocumentsByUser.set(userId, kycData);
                            }
                        }
                    });
                    // Attach KYC documents to users
                    users.forEach((user) => {
                        const kycDoc = kycDocumentsByUser.get(user.uid || user.id);
                        if (kycDoc) {
                            user.kycDocuments = {
                                idProof: kycDoc.frontImageUrl || null,
                                addressProof: kycDoc.backImageUrl || null,
                                selfie: kycDoc.selfieUrl || null
                            };
                        }
                    });
                }
                catch (kycError) {
                    console.warn('Could not fetch KYC documents for pending users:', kycError);
                    // Continue without KYC documents rather than failing
                }
            }
            return users;
        }
        catch (error) {
            console.error('Error fetching pending KYC users:', error);
            return [];
        }
    }
    // Tournament operations
    async getTournament(id) {
        try {
            const doc = await db.collection('tournaments').doc(id).get();
            return doc.exists ? { id: doc.id, ...doc.data() } : undefined;
        }
        catch (error) {
            console.error('Error fetching tournament:', error);
            return undefined;
        }
    }
    async createTournament(tournament) {
        const docRef = await db.collection('tournaments').add({
            ...tournament,
            createdAt: new Date(),
            status: tournament.status || "upcoming",
            registeredTeams: 0
        });
        const newTournament = await docRef.get();
        return { id: newTournament.id, ...newTournament.data() };
    }
    async updateTournament(id, tournamentData) {
        const docRef = db.collection('tournaments').doc(id);
        await docRef.update(tournamentData);
        const updated = await docRef.get();
        return updated.exists ? { id, ...updated.data() } : undefined;
    }
    async deleteTournament(id) {
        await db.collection('tournaments').doc(id).delete();
        return true;
    }
    async getAllTournaments() {
        try {
            const snapshot = await db.collection('tournaments').get();
            const tournaments = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data()
            }));
            // Fetch registration counts for each tournament
            const tournamentsWithCounts = await Promise.all(tournaments.map(async (tournament) => {
                try {
                    const registrationsSnapshot = await db.collection('tournament_registrations')
                        .where('tournamentId', '==', tournament.id)
                        .get();
                    return {
                        ...tournament,
                        registeredTeams: registrationsSnapshot.size,
                    };
                }
                catch (error) {
                    console.warn(`Failed to get registration count for tournament ${tournament.id}:`, error);
                    return {
                        ...tournament,
                        registeredTeams: tournament.registeredTeams || 0,
                    };
                }
            }));
            return tournamentsWithCounts;
        }
        catch (error) {
            console.error('Error fetching all tournaments:', error);
            return [];
        }
    }
    async getUpcomingTournaments() {
        try {
            const snapshot = await db.collection('tournaments')
                .where('status', '==', 'upcoming')
                .get();
            return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        }
        catch (error) {
            console.error('Error fetching upcoming tournaments:', error);
            return [];
        }
    }
    async getActiveTournaments() {
        try {
            const snapshot = await db.collection('tournaments')
                .where('status', '==', 'live')
                .get();
            return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        }
        catch (error) {
            console.error('Error fetching active tournaments:', error);
            return [];
        }
    }
    async getCompletedTournaments() {
        try {
            const snapshot = await db.collection('tournaments')
                .where('status', '==', 'completed')
                .get();
            return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        }
        catch (error) {
            console.error('Error fetching completed tournaments:', error);
            return [];
        }
    }
    // Registration operations
    async getRegistration(id) {
        const doc = await db.collection('tournament_registrations').doc(id.toString()).get();
        return doc.exists ? { id: doc.id, ...doc.data() } : undefined;
    }
    async createRegistration(registration) {
        const docRef = await db.collection('tournament_registrations').add(registration);
        const newRegistration = await docRef.get();
        return { id: newRegistration.id, ...newRegistration.data() };
    }
    async getRegistrationsByTournament(tournamentId) {
        const snapshot = await db.collection('tournament_registrations')
            .where('tournamentId', '==', tournamentId)
            .get();
        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }
    async getRegistrationsByUser(userId) {
        const snapshot = await db.collection('tournament_registrations')
            .where('userId', '==', userId)
            .get();
        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }
    // Result operations
    async getResult(id) {
        const doc = await db.collection('results').doc(id.toString()).get();
        return doc.exists ? { id: parseInt(doc.id), ...doc.data() } : undefined;
    }
    async createResult(result) {
        const docRef = await db.collection('results').add(result);
        const newResult = await docRef.get();
        return { id: parseInt(newResult.id), ...newResult.data() };
    }
    async updateResult(id, resultData) {
        const docRef = db.collection('results').doc(id.toString());
        await docRef.update(resultData);
        const updated = await docRef.get();
        return updated.exists ? { id, ...updated.data() } : undefined;
    }
    async getResultsByTournament(tournamentId) {
        const snapshot = await db.collection('results')
            .where('tournamentId', '==', tournamentId)
            .get();
        return snapshot.docs.map((doc) => ({ id: parseInt(doc.id), ...doc.data() }));
    }
    async getPendingResults() {
        const snapshot = await db.collection('results')
            .where('status', '==', 'pending')
            .get();
        return snapshot.docs.map((doc) => ({ id: parseInt(doc.id), ...doc.data() }));
    }
    // Transaction operations
    async createTransaction(transaction) {
        const docRef = await db.collection('transactions').add(transaction);
        const newTransaction = await docRef.get();
        return { id: parseInt(newTransaction.id), ...newTransaction.data() };
    }
    async getTransactionsByUser(userId) {
        const snapshot = await db.collection('transactions')
            .where('userId', '==', userId)
            .get();
        return snapshot.docs.map((doc) => ({ id: parseInt(doc.id), ...doc.data() }));
    }
    async getTransactionsByTournament(tournamentId) {
        const snapshot = await db.collection('transactions')
            .where('tournamentId', '==', tournamentId)
            .get();
        return snapshot.docs.map((doc) => ({ id: parseInt(doc.id), ...doc.data() }));
    }
    async getAllTransactions() {
        try {
            const snapshot = await db.collection('transactions').get();
            return snapshot.docs.map((doc) => ({ id: parseInt(doc.id), ...doc.data() }));
        }
        catch (error) {
            console.error('Error fetching all transactions:', error);
            return [];
        }
    }
    // Notification operations (announcements)
    async getAnnouncement(id) {
        const doc = await db.collection('announcements').doc(id.toString()).get();
        return doc.exists ? { id: parseInt(doc.id), ...doc.data() } : undefined;
    }
    async createAnnouncement(announcement) {
        const docRef = await db.collection('announcements').add(announcement);
        const newAnnouncement = await docRef.get();
        return { id: parseInt(newAnnouncement.id), ...newAnnouncement.data() };
    }
    async updateAnnouncement(id, announcementData) {
        const docRef = db.collection('announcements').doc(id.toString());
        await docRef.update(announcementData);
        const updated = await docRef.get();
        return updated.exists ? { id, ...updated.data() } : undefined;
    }
    async deleteAnnouncement(id) {
        await db.collection('announcements').doc(id.toString()).delete();
        return true;
    }
    async getAllAnnouncements() {
        const snapshot = await db.collection('announcements').get();
        return snapshot.docs.map((doc) => ({ id: parseInt(doc.id), ...doc.data() }));
    }
    async getActiveAnnouncements() {
        const snapshot = await db.collection('announcements')
            .where('isActive', '==', true)
            .get();
        return snapshot.docs.map((doc) => ({ id: parseInt(doc.id), ...doc.data() }));
    }
    // Add a method to sync a single user from Firebase Auth to Firestore
    async syncUserFromAuth(uid) {
        try {
            if (!auth) {
                console.warn('Firebase Auth not initialized, cannot sync user');
                return null;
            }
            // Get user details from Firebase Auth
            try {
                const userRecord = await auth.getUser(uid);
                if (!userRecord) {
                    console.warn(`User ${uid} not found in Firebase Auth`);
                    return null;
                }
                // Extract authentication provider
                let provider = 'email';
                if (userRecord.providerData && userRecord.providerData.length > 0) {
                    provider = userRecord.providerData[0].providerId || 'email';
                }
                // Create or update user in Firestore
                const userData = {
                    uid: userRecord.uid,
                    email: userRecord.email || null,
                    emailVerified: userRecord.emailVerified || false,
                    name: userRecord.displayName || 'Unknown',
                    username: userRecord.email || userRecord.phoneNumber || userRecord.uid,
                    phone: userRecord.phoneNumber || null,
                    photoURL: userRecord.photoURL || null,
                    profileImage: userRecord.photoURL || null,
                    provider: provider,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    lastLogin: new Date(),
                    status: userRecord.disabled ? 'inactive' : 'active',
                    kycStatus: 'not_submitted',
                    walletBalance: 0,
                    synced: true,
                    syncedFrom: 'auth'
                };
                // Use the uid as the document ID
                await db.collection('users').doc(userRecord.uid).set(userData, { merge: true });
                console.log(`Synced user from Auth to Firestore: ${userRecord.uid}`);
                return { id: userRecord.uid, ...userData };
            }
            catch (error) {
                console.error(`Error getting user ${uid} from Auth:`, error);
                return null;
            }
        }
        catch (error) {
            console.error(`Error syncing user ${uid} from Auth to Firestore:`, error);
            return null;
        }
    }
    // KYC operations
    async createKycDocument(data) {
        try {
            // Create KYC document record in Firestore
            const docRef = await db.collection('kyc_documents').add({
                ...data,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            // Get the created document
            const snapshot = await docRef.get();
            const createdDoc = {
                id: docRef.id,
                ...snapshot.data()
            };
            console.log('KYC document created successfully:', createdDoc.id);
            return createdDoc;
        }
        catch (error) {
            console.error('Error creating KYC document:', error);
            throw error;
        }
    }
    async getKycDocumentsByUserId(userId) {
        try {
            const snapshot = await db.collection('kyc_documents')
                .where('userId', '==', userId)
                .get();
            return snapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    createdAt: this.formatTimestamp(data.createdAt) || new Date(),
                    updatedAt: this.formatTimestamp(data.updatedAt),
                    submittedAt: this.formatTimestamp(data.submittedAt) || this.formatTimestamp(data.createdAt) || new Date(),
                    verifiedAt: this.formatTimestamp(data.verifiedAt)
                };
            });
        }
        catch (error) {
            console.error('Error fetching KYC documents by userId:', error);
            return [];
        }
    }
    async updateKycDocumentStatus(docId, updates) {
        try {
            const statusUpper = updates.status.toUpperCase();
            const updateData = {
                status: statusUpper,
                updatedAt: new Date()
            };
            if (statusUpper === 'APPROVED') {
                updateData.verifiedAt = updates.verifiedAt || new Date();
                updateData.verifiedBy = 'admin'; // This could be the admin's ID in a real app
            }
            if (statusUpper === 'REJECTED' && updates.rejectionReason) {
                updateData.rejectionReason = updates.rejectionReason;
            }
            if (updates.notes) {
                updateData.notes = updates.notes;
            }
            await db.collection('kyc_documents').doc(docId).update(updateData);
            return true;
        }
        catch (error) {
            console.error('Error updating KYC document status:', error);
            throw error;
        }
    }
    async updateUserKycStatus(userId, kycStatus) {
        try {
            const statusUpper = kycStatus.toUpperCase();
            await db.collection('users').doc(userId).update({
                kycStatus: statusUpper,
                updatedAt: new Date()
            });
            return true;
        }
        catch (error) {
            console.error('Error updating user KYC status:', error);
            throw error;
        }
    }
    // --- USER MANAGEMENT ENHANCEMENTS ---
    // 1. User Search & Filtering
    async advancedUserSearch({ q, status, role, kycStatus, from, to }) {
        let queryRef = db.collection('users');
        if (status)
            queryRef = queryRef.where('status', '==', status);
        if (role)
            queryRef = queryRef.where('role', '==', role);
        if (kycStatus)
            queryRef = queryRef.where('kycStatus', '==', kycStatus);
        // Add more filters as needed
        const snapshot = await queryRef.get();
        let users = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        if (q) {
            users = users.filter((u) => (u.email?.includes(q) || u.username?.includes(q) || u.uid?.includes(q)));
        }
        // Date filtering (from, to)
        if (from || to) {
            users = users.filter((u) => {
                const created = u.createdAt ? new Date(u.createdAt) : null;
                if (!created)
                    return false;
                if (from && created < new Date(from))
                    return false;
                if (to && created > new Date(to))
                    return false;
                return true;
            });
        }
        return users;
    }
    // 2. User Status Management
    async updateUserStatus(userId, status) {
        // Update Firestore
        await db.collection('users').doc(userId).update({ status });
        // Optionally disable/enable in Auth
        try {
            await auth.updateUser(userId, { disabled: status === 'banned' });
        }
        catch (e) { /* ignore if not in Auth */ }
        return { success: true };
    }
    // 3. User Role Management
    async updateUserRole(userId, role) {
        await db.collection('users').doc(userId).update({ role });
        return { success: true };
    }
    // 4. User Detail View
    async getUserFullDetail(userId) {
        const doc = await db.collection('users').doc(userId).get();
        const user = doc.exists ? { id: doc.id, ...doc.data() } : null;
        // Optionally fetch KYC, transactions, tournaments, etc.
        return user;
    }
    // 5. Bulk Actions
    async bulkUserAction(action, userIds, value) {
        const results = [];
        for (const userId of userIds) {
            if (action === 'delete')
                results.push(await this.deleteUser(userId));
            if (action === 'activate')
                results.push(await this.updateUserStatus(userId, 'active'));
            if (action === 'deactivate')
                results.push(await this.updateUserStatus(userId, 'inactive'));
            if (action === 'ban')
                results.push(await this.updateUserStatus(userId, 'banned'));
            if (action === 'role' && value)
                results.push(await this.updateUserRole(userId, value));
        }
        return { success: true, results };
    }
    // 6. User Notes & Admin Comments
    async addUserNote(userId, note, adminEmail) {
        const noteObj = { note, adminEmail, createdAt: new Date().toISOString() };
        await db.collection('users').doc(userId).collection('notes').add(noteObj);
        return { success: true };
    }
    async getUserNotes(userId) {
        const snapshot = await db.collection('users').doc(userId).collection('notes').get();
        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }
    // 7. User Notification (email, SMS, in-app)
    async sendUserNotification(userId, { type, message, subject }) {
        // Call notification service or add to Firestore
        // For demo, just add to notifications collection
        await db.collection('users').doc(userId).collection('notifications').add({ type, message, subject, createdAt: new Date().toISOString() });
        return { success: true };
    }
    // 8. Export/Import Users
    async exportUsersCSV() {
        const snapshot = await db.collection('users').get();
        const users = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        // Convert to CSV
        const header = Object.keys(users[0] || {}).join(',');
        const rows = users.map((u) => Object.values(u).map(v => `"${(v ?? '').toString().replace(/"/g, '""')}"`).join(','));
        return [header, ...rows].join('\n');
    }
    async importUsersCSV(csv) {
        // Parse CSV and add users to Firestore
        const [header, ...lines] = csv.split('\n');
        const keys = header.split(',');
        for (const line of lines) {
            const values = line.split(',').map(v => v.replace(/^"|"$/g, ''));
            const user = {};
            keys.forEach((k, i) => user[k] = values[i]);
            if (user.id)
                await db.collection('users').doc(user.id).set(user, { merge: true });
        }
        return { success: true };
    }
    // 9. Audit Logs
    async getUserAuditLogs(userId) {
        const snapshot = await db.collection('users').doc(userId).collection('audit').get();
        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }
    // 10. Impersonate User
    async generateImpersonationToken(userId) {
        // For Firebase, you can use custom tokens
        const user = await auth.getUser(userId).catch(() => null);
        if (!user)
            throw new Error('User not found');
        const token = await auth.createCustomToken(user.uid);
        return token;
    }
    // 11. User Registration & Login Analytics
    async getUserAnalyticsSummary() {
        // Example: count users, active, banned, new today, etc.
        const snapshot = await db.collection('users').get();
        const users = snapshot.docs.map((doc) => doc.data());
        const total = users.length;
        const active = users.filter((u) => u.status === 'active').length;
        const banned = users.filter((u) => u.status === 'banned').length;
        // Add more analytics as needed
        return { total, active, banned };
    }
    // Support Ticket Methods
    // Get all support tickets with filtering
    async getSupportTickets(filters) {
        try {
            // Add null check for db
            if (!this.db) {
                console.error('Firestore database not initialized');
                throw new Error('Database not initialized');
            }
            let query = this.db.collection('support_tickets');
            // Apply filters
            if (filters?.status) {
                query = query.where('status', '==', filters.status);
            }
            if (filters?.priority) {
                query = query.where('priority', '==', filters.priority);
            }
            if (filters?.category) {
                query = query.where('category', '==', filters.category);
            }
            if (filters?.assignedTo) {
                query = query.where('assignedTo', '==', filters.assignedTo);
            }
            // Add ordering and pagination
            query = query.orderBy('createdAt', 'desc');
            if (filters?.limit) {
                query = query.limit(filters.limit);
            }
            if (filters?.offset) {
                query = query.offset(filters.offset);
            }
            const snapshot = await query.get();
            const tickets = await Promise.all(snapshot.docs.map(async (doc) => {
                const ticketData = { id: doc.id, ...doc.data() };
                // Fetch responses for each ticket (simplified query to avoid index requirement)
                let responses = [];
                try {
                    const responsesSnapshot = await this.db
                        .collection('support_ticket_responses')
                        .where('ticketId', '==', doc.id)
                        .get();
                    responses = responsesSnapshot.docs.map((responseDoc) => ({
                        id: responseDoc.id,
                        ...responseDoc.data()
                    }));
                    // Sort responses by createdAt in memory to avoid index requirement
                    responses.sort((a, b) => {
                        const timeA = a.createdAt?._seconds || a.createdAt?.seconds || 0;
                        const timeB = b.createdAt?._seconds || b.createdAt?.seconds || 0;
                        return timeA - timeB;
                    });
                }
                catch (responsesError) {
                    console.warn(`Could not fetch responses for ticket ${doc.id}:`, responsesError.message);
                    responses = [];
                }
                return {
                    ...ticketData,
                    responses
                };
            }));
            return tickets.map((ticket) => ({
                id: ticket.id,
                ticketId: ticket.ticketId,
                subject: ticket.subject,
                description: ticket.description,
                status: ticket.status,
                priority: ticket.priority,
                category: ticket.category,
                userId: ticket.userId,
                userEmail: ticket.userEmail,
                assignedTo: ticket.assignedTo || null,
                createdAt: ticket.createdAt?.toDate?.() || new Date(ticket.createdAt),
                updatedAt: ticket.updatedAt?.toDate?.() || new Date(ticket.updatedAt),
                responses: ticket.responses || []
            }));
        }
        catch (error) {
            console.error('Firestore error in getSupportTickets:', error);
            throw error;
        }
    }
    async getSupportTicketsStats() {
        try {
            if (!this.db) {
                console.error('Firestore database not initialized');
                throw new Error('Database not initialized');
            }
            const snapshot = await this.db.collection('support_tickets').get();
            const tickets = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            const total = tickets.length;
            const byStatus = tickets.reduce((acc, t) => {
                acc[t.status] = (acc[t.status] || 0) + 1;
                return acc;
            }, {});
            const byPriority = tickets.reduce((acc, t) => {
                acc[t.priority] = (acc[t.priority] || 0) + 1;
                return acc;
            }, {});
            const byCategory = tickets.reduce((acc, t) => {
                acc[t.category] = (acc[t.category] || 0) + 1;
                return acc;
            }, {});
            // Calculate average response time (simplified)
            const avgResponseTime = tickets
                .filter((t) => t.status === 'resolved')
                .reduce((sum, ticket) => {
                const created = ticket.createdAt?.toDate?.() || new Date(ticket.createdAt);
                const updated = ticket.updatedAt?.toDate?.() || new Date(ticket.updatedAt);
                return sum + (updated.getTime() - created.getTime());
            }, 0) / Math.max(tickets.filter((t) => t.status === 'resolved').length, 1);
            return {
                total,
                byStatus,
                byPriority,
                byCategory,
                avgResponseTime: Math.round(avgResponseTime / (1000 * 60 * 60)) // Convert to hours
            };
        }
        catch (error) {
            console.error('Error getting support tickets stats:', error);
            throw error;
        }
    }
    // Update support ticket status
    async updateSupportTicketStatus(ticketId, status) {
        try {
            console.log(`🔧 updateSupportTicketStatus called with ticketId: ${ticketId}, status: ${status}`);
            if (!this.db) {
                console.error('Firestore database not initialized');
                throw new Error('Database not initialized');
            }
            // Validate status
            const validStatuses = ['open', 'in-progress', 'resolved', 'closed'];
            if (!validStatuses.includes(status)) {
                throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
            }
            console.log(`🔍 Searching for ticket with ticketId: ${ticketId}`);
            // First, find the ticket by ticketId field (not document ID)
            const ticketsSnapshot = await this.db
                .collection('support_tickets')
                .where('ticketId', '==', ticketId)
                .get();
            console.log(`📋 Found ${ticketsSnapshot.docs.length} tickets matching ticketId: ${ticketId}`);
            if (ticketsSnapshot.empty) {
                throw new Error(`Support ticket with ID ${ticketId} not found`);
            }
            const ticketDoc = ticketsSnapshot.docs[0];
            const ticketData = ticketDoc.data();
            console.log(`📝 Updating ticket document: ${ticketDoc.id} with status: ${status}`);
            // Update the ticket status and updatedAt timestamp
            const updateData = {
                status,
                updatedAt: new Date()
            };
            await ticketDoc.ref.update(updateData);
            console.log(`✅ Ticket status updated successfully`);
            // Return the updated ticket
            const updatedTicket = {
                id: ticketDoc.id,
                ticketId: ticketData.ticketId,
                subject: ticketData.subject,
                description: ticketData.description,
                status,
                priority: ticketData.priority,
                category: ticketData.category,
                userId: ticketData.userId,
                userEmail: ticketData.userEmail,
                assignedTo: ticketData.assignedTo || null,
                createdAt: ticketData.createdAt?.toDate?.() || new Date(ticketData.createdAt),
                updatedAt: new Date()
            };
            return updatedTicket;
        }
        catch (error) {
            console.error('🚨 Error updating support ticket status:', error);
            throw error;
        }
    }
    // Get a single support ticket by ticketId
    async getSupportTicket(ticketId) {
        try {
            if (!this.db) {
                throw new Error('Database not initialized');
            }
            const ticketsSnapshot = await this.db
                .collection('support_tickets')
                .where('ticketId', '==', ticketId)
                .get();
            if (ticketsSnapshot.empty) {
                return null;
            }
            const ticketDoc = ticketsSnapshot.docs[0];
            const ticketData = ticketDoc.data();
            return {
                id: ticketDoc.id,
                ticketId: ticketData.ticketId,
                subject: ticketData.subject,
                description: ticketData.description,
                status: ticketData.status,
                priority: ticketData.priority,
                category: ticketData.category,
                userId: ticketData.userId,
                userEmail: ticketData.userEmail,
                assignedTo: ticketData.assignedTo || null,
                createdAt: ticketData.createdAt?.toDate?.() || new Date(ticketData.createdAt),
                updatedAt: ticketData.updatedAt?.toDate?.() || new Date(ticketData.updatedAt)
            };
        }
        catch (error) {
            console.error('Error getting support ticket:', error);
            throw error;
        }
    }
    // Create a new support ticket
    async createSupportTicket(ticketData) {
        try {
            if (!this.db) {
                throw new Error('Database not initialized');
            }
            const docRef = await this.db.collection('support_tickets').add({
                ...ticketData,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            return {
                id: docRef.id,
                ...ticketData,
                createdAt: new Date(),
                updatedAt: new Date()
            };
        }
        catch (error) {
            console.error('Error creating support ticket:', error);
            throw error;
        }
    }
    // Add response to support ticket
    async addSupportTicketResponse(responseData) {
        try {
            if (!this.db) {
                throw new Error('Database not initialized');
            }
            const docRef = await this.db.collection('support_ticket_responses').add({
                ...responseData,
                createdAt: new Date()
            });
            return {
                id: docRef.id,
                ...responseData,
                createdAt: new Date()
            };
        }
        catch (error) {
            console.error('Error adding support ticket response:', error);
            throw error;
        }
    }
    // Update support ticket last activity
    async updateSupportTicketLastActivity(ticketId) {
        try {
            if (!this.db) {
                throw new Error('Database not initialized');
            }
            const ticketsSnapshot = await this.db
                .collection('support_tickets')
                .where('ticketId', '==', ticketId)
                .get();
            if (!ticketsSnapshot.empty) {
                const ticketDoc = ticketsSnapshot.docs[0];
                await ticketDoc.ref.update({
                    lastActivityAt: new Date(),
                    updatedAt: new Date()
                });
            }
        }
        catch (error) {
            console.error('Error updating support ticket last activity:', error);
            throw error;
        }
    }
    // Assign support ticket
    async assignSupportTicket(ticketId, assignedTo, assignedToName) {
        try {
            if (!this.db) {
                throw new Error('Database not initialized');
            }
            const ticketsSnapshot = await this.db
                .collection('support_tickets')
                .where('ticketId', '==', ticketId)
                .get();
            if (ticketsSnapshot.empty) {
                throw new Error(`Support ticket with ID ${ticketId} not found`);
            }
            const ticketDoc = ticketsSnapshot.docs[0];
            const ticketData = ticketDoc.data();
            await ticketDoc.ref.update({
                assignedTo,
                assignedToName,
                updatedAt: new Date()
            });
            return {
                id: ticketDoc.id,
                ticketId: ticketData.ticketId,
                subject: ticketData.subject,
                description: ticketData.description,
                status: ticketData.status,
                priority: ticketData.priority,
                category: ticketData.category,
                userId: ticketData.userId,
                userEmail: ticketData.userEmail,
                assignedTo,
                createdAt: ticketData.createdAt?.toDate?.() || new Date(ticketData.createdAt),
                updatedAt: new Date()
            };
        }
        catch (error) {
            console.error('Error assigning support ticket:', error);
            throw error;
        }
    }
    // ===============================
    // WALLET MANAGEMENT METHODS
    // ===============================
    // Get all pending deposit requests
    async getPendingDeposits() {
        try {
            if (!this.db) {
                throw new Error('Database not initialized');
            }
            const snapshot = await this.db
                .collection('pending_deposits')
                .orderBy('createdAt', 'desc')
                .get();
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
                updatedAt: doc.data().updatedAt?.toDate?.() || null,
                verifiedAt: doc.data().verifiedAt?.toDate?.() || null
            }));
        }
        catch (error) {
            console.error('Error fetching pending deposits:', error);
            throw error;
        }
    }
    // Get all pending withdrawal requests
    async getPendingWithdrawals() {
        try {
            if (!this.db) {
                throw new Error('Database not initialized');
            }
            const snapshot = await this.db
                .collection('pending_withdrawals')
                .orderBy('createdAt', 'desc')
                .get();
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
                updatedAt: doc.data().updatedAt?.toDate?.() || null,
                verifiedAt: doc.data().verifiedAt?.toDate?.() || null
            }));
        }
        catch (error) {
            console.error('Error fetching pending withdrawals:', error);
            throw error;
        }
    }
    // Approve deposit request
    async approveDepositRequest(depositId, adminId) {
        try {
            if (!this.db) {
                throw new Error('Database not initialized');
            }
            const depositRef = this.db.collection('pending_deposits').doc(depositId);
            const depositDoc = await depositRef.get();
            if (!depositDoc.exists) {
                throw new Error('Deposit request not found');
            }
            const depositData = depositDoc.data();
            if (!depositData) {
                throw new Error('Deposit data not found');
            }
            // Update deposit status
            await depositRef.update({
                status: 'APPROVED',
                verifiedBy: adminId,
                verifiedAt: new Date(),
                updatedAt: new Date()
            });
            // Update user's wallet balance
            const userRef = this.db.collection('users').doc(depositData.userId);
            const userDoc = await userRef.get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                const currentBalance = userData?.walletBalance || 0;
                const newBalance = currentBalance + depositData.amount;
                await userRef.update({
                    walletBalance: newBalance,
                    updatedAt: new Date()
                });
                // Create transaction record in /transactions (not wallet_transactions)
                await this.db.collection('transactions').add({
                    userId: depositData.userId,
                    type: 'deposit',
                    amount: depositData.amount,
                    currency: depositData.currency,
                    status: 'APPROVED',
                    description: `UPI deposit approved - Ref: ${depositData.upiRefId}`,
                    paymentMethod: 'UPI',
                    depositRequestId: depositId, // top-level for easy querying
                    metadata: {
                        depositRequestId: depositId,
                        upiRefId: depositData.upiRefId,
                        approvedBy: adminId
                    },
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
                // Notify user of approval
                const { NotificationService } = await import('./notification-service.js');
                await NotificationService.sendNotification({
                    userId: depositData.userId,
                    title: 'Deposit Approved',
                    message: `Your deposit of ${depositData.amount} ${depositData.currency} has been approved and credited to your wallet.`,
                    type: 'wallet',
                    priority: 'normal',
                    data: { depositId }
                });
            }
            return { success: true, message: 'Deposit approved successfully' };
        }
        catch (error) {
            console.error('Error approving deposit:', error);
            throw error;
        }
    }
    // Reject deposit request
    async rejectDepositRequest(depositId, adminId, reason) {
        try {
            if (!this.db) {
                throw new Error('Database not initialized');
            }
            const depositRef = this.db.collection('pending_deposits').doc(depositId);
            const depositDoc = await depositRef.get();
            if (!depositDoc.exists) {
                throw new Error('Deposit request not found');
            }
            const depositData = depositDoc.data();
            // Update deposit status
            await depositRef.update({
                status: 'REJECTED',
                verifiedBy: adminId,
                verifiedAt: new Date(),
                updatedAt: new Date(),
                rejectionReason: reason
            });
            // Notify user of rejection
            if (depositData && depositData.userId) {
                const { NotificationService } = await import('./notification-service.js');
                await NotificationService.sendNotification({
                    userId: depositData.userId,
                    title: 'Deposit Rejected',
                    message: `Your deposit of ${depositData.amount} ${depositData.currency} was rejected. Reason: ${reason}`,
                    type: 'wallet',
                    priority: 'normal',
                    data: { depositId, reason }
                });
            }
            return { success: true, message: 'Deposit rejected successfully' };
        }
        catch (error) {
            console.error('Error rejecting deposit:', error);
            throw error;
        }
    }
    // Approve withdrawal request
    async approveWithdrawalRequest(withdrawalId, adminId) {
        try {
            if (!this.db) {
                throw new Error('Database not initialized');
            }
            const withdrawalRef = this.db.collection('pending_withdrawals').doc(withdrawalId);
            const withdrawalDoc = await withdrawalRef.get();
            if (!withdrawalDoc.exists) {
                throw new Error('Withdrawal request not found');
            }
            const withdrawalData = withdrawalDoc.data();
            if (!withdrawalData) {
                throw new Error('Withdrawal data not found');
            }
            // Update withdrawal status
            await withdrawalRef.update({
                status: 'APPROVED',
                verifiedBy: adminId,
                verifiedAt: new Date(),
                updatedAt: new Date()
            });
            // Update user's wallet balance
            const userRef = this.db.collection('users').doc(withdrawalData.userId);
            const userDoc = await userRef.get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                const currentBalance = userData?.walletBalance || 0;
                const newBalance = Math.max(0, currentBalance - withdrawalData.amount);
                await userRef.update({
                    walletBalance: newBalance,
                    updatedAt: new Date()
                });
                // Create transaction record in /transactions (not wallet_transactions)
                await this.db.collection('transactions').add({
                    userId: withdrawalData.userId,
                    type: 'withdrawal',
                    amount: withdrawalData.amount,
                    currency: withdrawalData.currency,
                    status: 'APPROVED',
                    description: `UPI withdrawal approved to ${withdrawalData.upiId}`,
                    paymentMethod: 'UPI',
                    withdrawalRequestId: withdrawalId, // top-level for easy querying
                    metadata: {
                        withdrawalRequestId: withdrawalId,
                        upiId: withdrawalData.upiId,
                        approvedBy: adminId
                    },
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
            }
            return { success: true, message: 'Withdrawal approved successfully' };
        }
        catch (error) {
            console.error('Error approving withdrawal:', error);
            throw error;
        }
    }
    // Reject withdrawal request
    async rejectWithdrawalRequest(withdrawalId, adminId, reason) {
        try {
            if (!this.db) {
                throw new Error('Database not initialized');
            }
            const withdrawalRef = this.db.collection('pending_withdrawals').doc(withdrawalId);
            const withdrawalDoc = await withdrawalRef.get();
            if (!withdrawalDoc.exists) {
                throw new Error('Withdrawal request not found');
            }
            // Update withdrawal status
            await withdrawalRef.update({
                status: 'REJECTED',
                verifiedBy: adminId,
                verifiedAt: new Date(),
                updatedAt: new Date(),
                rejectionReason: reason
            });
            return { success: true, message: 'Withdrawal rejected successfully' };
        }
        catch (error) {
            console.error('Error rejecting withdrawal:', error);
            throw error;
        }
    }
    // Get admin UPI configuration
    async getAdminUpiConfig() {
        try {
            if (!this.db) {
                throw new Error('Database not initialized');
            }
            const configDoc = await this.db.collection('admin_config').doc('upi_settings').get();
            if (configDoc.exists) {
                const data = configDoc.data();
                return {
                    ...data,
                    updatedAt: data?.updatedAt?.toDate?.() || new Date(data?.updatedAt)
                };
            }
            // Return default config if not found
            return {
                upiId: '',
                displayName: 'Netwin Gaming',
                isActive: false,
                updatedAt: new Date(),
                updatedBy: ''
            };
        }
        catch (error) {
            console.error('Error fetching UPI config:', error);
            throw error;
        }
    }
    // Update admin UPI configuration
    async updateAdminUpiConfig(config, adminId) {
        try {
            if (!this.db) {
                throw new Error('Database not initialized');
            }
            const configRef = this.db.collection('admin_config').doc('upi_settings');
            await configRef.set({
                ...config,
                updatedBy: adminId,
                updatedAt: new Date()
            }, { merge: true });
            return { success: true, message: 'UPI config updated successfully' };
        }
        catch (error) {
            console.error('Error updating UPI config:', error);
            throw error;
        }
    }
    // Get all wallet transactions for unified view
    async getAllWalletTransactions() {
        try {
            if (!this.db) {
                throw new Error('Database not initialized');
            }
            // Fetch all three types of transactions
            const [walletTransactions, pendingDeposits, pendingWithdrawals] = await Promise.all([
                this.db.collection('wallet_transactions').orderBy('createdAt', 'desc').limit(100).get(),
                // Only get PENDING deposits to avoid duplicates with wallet_transactions
                this.db.collection('pending_deposits').where('status', '==', 'PENDING').orderBy('createdAt', 'desc').limit(50).get(),
                // Only get PENDING withdrawals to avoid duplicates with wallet_transactions
                this.db.collection('pending_withdrawals').where('status', '==', 'PENDING').orderBy('createdAt', 'desc').limit(50).get()
            ]);
            // Combine and format all transactions
            const allTransactions = [];
            // Add wallet transactions (historical/completed)
            walletTransactions.docs.forEach(doc => {
                const data = doc.data();
                allTransactions.push({
                    id: doc.id,
                    ...data,
                    source: 'wallet_transactions',
                    createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
                    updatedAt: data.updatedAt?.toDate?.() || null
                });
            });
            // Add ONLY pending deposits (to avoid duplicates with approved ones in wallet_transactions)
            pendingDeposits.docs.forEach(doc => {
                const data = doc.data();
                allTransactions.push({
                    id: doc.id,
                    ...data,
                    type: 'deposit',
                    source: 'pending_deposits',
                    createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
                    updatedAt: data.updatedAt?.toDate?.() || null,
                    verifiedAt: data.verifiedAt?.toDate?.() || null
                });
            });
            // Add ONLY pending withdrawals (to avoid duplicates with approved ones in wallet_transactions)
            pendingWithdrawals.docs.forEach(doc => {
                const data = doc.data();
                allTransactions.push({
                    id: doc.id,
                    ...data,
                    type: 'withdrawal',
                    source: 'pending_withdrawals',
                    createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
                    updatedAt: data.updatedAt?.toDate?.() || null,
                    verifiedAt: data.verifiedAt?.toDate?.() || null
                });
            });
            // Sort by creation date (newest first)
            allTransactions.sort((a, b) => {
                const dateA = new Date(a.createdAt);
                const dateB = new Date(b.createdAt);
                return dateB.getTime() - dateA.getTime();
            });
            return allTransactions;
        }
        catch (error) {
            console.error('Error fetching all wallet transactions:', error);
            throw error;
        }
    }
    // Get all transactions for a specific user (comprehensive view)
    async getUserAllTransactions(userId) {
        try {
            if (!this.db) {
                throw new Error('Database not initialized');
            }
            const user = await this.getUserByUid(userId);
            if (!user) {
                throw new Error('User not found');
            }
            // Fetch all transaction types for this user
            const [walletTransactions, pendingDeposits, pendingWithdrawals, tournamentEntries, tournamentResults] = await Promise.all([
                this.db.collection('wallet_transactions').where('userId', '==', userId).get(),
                this.db.collection('pending_deposits').where('userId', '==', userId).get(),
                this.db.collection('pending_withdrawals').where('userId', '==', userId).get(),
                this.db.collection('tournament_participants').where('userId', '==', userId).get(),
                this.db.collection('tournament_results').where('userId', '==', userId).get()
            ]);
            const transactions = [];
            let totalDeposits = 0;
            let totalWithdrawals = 0;
            let totalWinnings = 0;
            let totalEntryFees = 0;
            // Process wallet transactions (approved deposits/withdrawals, winnings)
            walletTransactions.docs.forEach(doc => {
                const data = doc.data();
                const transaction = {
                    id: doc.id,
                    type: data.type,
                    amount: data.amount || 0,
                    currency: data.currency || 'INR',
                    status: data.status || 'completed',
                    description: data.description || '',
                    reference: data.reference || data.upiRefId || '',
                    tournamentId: data.tournamentId,
                    tournamentName: data.tournamentName,
                    createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt)
                };
                transactions.push(transaction);
                if (data.type === 'deposit')
                    totalDeposits += transaction.amount;
                if (data.type === 'withdrawal')
                    totalWithdrawals += transaction.amount;
                if (data.type === 'winning' || data.type === 'prize')
                    totalWinnings += transaction.amount;
            });
            // Process pending deposits
            pendingDeposits.docs.forEach(doc => {
                const data = doc.data();
                const transaction = {
                    id: doc.id,
                    type: 'deposit',
                    amount: data.amount || 0,
                    currency: data.currency || 'INR',
                    status: data.status?.toLowerCase() || 'pending',
                    description: `UPI Deposit - ${data.status || 'Pending'}`,
                    reference: data.upiRefId || '',
                    createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt)
                };
                transactions.push(transaction);
                if (data.status === 'APPROVED') {
                    totalDeposits += transaction.amount;
                }
            });
            // Process pending withdrawals
            pendingWithdrawals.docs.forEach(doc => {
                const data = doc.data();
                const transaction = {
                    id: doc.id,
                    type: 'withdrawal',
                    amount: data.amount || 0,
                    currency: data.currency || 'INR',
                    status: data.status?.toLowerCase() || 'pending',
                    description: `UPI Withdrawal - ${data.status || 'Pending'}`,
                    reference: data.upiId || '',
                    createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt)
                };
                transactions.push(transaction);
                if (data.status === 'APPROVED') {
                    totalWithdrawals += transaction.amount;
                }
            });
            // Process tournament entries (entry fees)
            tournamentEntries.docs.forEach(doc => {
                const data = doc.data();
                const transaction = {
                    id: doc.id,
                    type: 'entry_fee',
                    amount: data.entryFee || 0,
                    currency: 'INR',
                    status: data.paymentStatus || 'completed',
                    description: `Tournament Entry Fee`,
                    tournamentId: data.tournamentId,
                    tournamentName: data.tournamentName || `Tournament ${data.tournamentId}`,
                    createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt)
                };
                transactions.push(transaction);
                totalEntryFees += transaction.amount;
            });
            // Process tournament results (winnings)
            tournamentResults.docs.forEach(doc => {
                const data = doc.data();
                if (data.reward && data.reward > 0) {
                    const transaction = {
                        id: doc.id,
                        type: 'winning',
                        amount: data.reward || 0,
                        currency: 'INR',
                        status: data.rewardStatus || 'completed',
                        description: `Tournament Reward - Position ${data.position || 'N/A'}`,
                        tournamentId: data.tournamentId,
                        tournamentName: data.tournamentName || `Tournament ${data.tournamentId}`,
                        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt)
                    };
                    transactions.push(transaction);
                    totalWinnings += transaction.amount;
                }
            });
            // Sort by date (newest first)
            transactions.sort((a, b) => {
                const dateA = new Date(a.createdAt);
                const dateB = new Date(b.createdAt);
                return dateB.getTime() - dateA.getTime();
            });
            return {
                userId,
                userName: user.name || 'Unknown',
                userEmail: user.email || '',
                walletBalance: user.walletBalance || 0,
                transactions,
                totalDeposits,
                totalWithdrawals,
                totalWinnings,
                totalEntryFees
            };
        }
        catch (error) {
            console.error('Error fetching user all transactions:', error);
            throw error;
        }
    }
    async getAllKycDocuments() {
        try {
            const snapshot = await db.collection('kyc_documents').get();
            return snapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    createdAt: this.formatTimestamp(data.createdAt),
                    updatedAt: this.formatTimestamp(data.updatedAt),
                    submittedAt: this.formatTimestamp(data.submittedAt) || this.formatTimestamp(data.createdAt) || new Date(),
                    verifiedAt: this.formatTimestamp(data.verifiedAt)
                };
            });
        }
        catch (error) {
            console.error('Error fetching all KYC documents:', error);
            return [];
        }
    }
    // Helper method to handle different timestamp formats
    formatTimestamp(timestamp) {
        if (!timestamp)
            return null;
        // Handle Firebase Timestamp objects
        if (timestamp && typeof timestamp.toDate === 'function') {
            return timestamp.toDate();
        }
        // Handle numeric timestamps (milliseconds since epoch)
        if (typeof timestamp === 'number') {
            return new Date(timestamp);
        }
        // Handle ISO string dates or other string formats
        if (typeof timestamp === 'string') {
            const date = new Date(timestamp);
            if (!isNaN(date.getTime())) {
                return date;
            }
        }
        // Handle JS Date objects
        if (timestamp instanceof Date) {
            return timestamp;
        }
        return null;
    }
    async getKycDocument(docId) {
        try {
            const doc = await db.collection('kyc_documents').doc(docId).get();
            if (!doc.exists) {
                return null;
            }
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: this.formatTimestamp(data?.createdAt) || new Date(),
                updatedAt: this.formatTimestamp(data?.updatedAt),
                submittedAt: this.formatTimestamp(data?.submittedAt) || this.formatTimestamp(data?.createdAt) || new Date(),
                verifiedAt: this.formatTimestamp(data?.verifiedAt)
            };
        }
        catch (error) {
            console.error('Error fetching KYC document:', error);
            return null;
        }
    }
    // Credit user wallet for tournament prize payout
    async creditUserWallet(userId, amount, currency, description) {
        const userRef = this.db.collection('users').doc(userId.toString());
        const userDoc = await userRef.get();
        if (!userDoc.exists)
            throw new Error('User not found');
        const userData = userDoc.data();
        const currentBalance = userData?.walletBalance || 0;
        const newBalance = currentBalance + amount;
        await userRef.update({ walletBalance: newBalance, updatedAt: new Date() });
        await this.db.collection('wallet_transactions').add({
            userId,
            amount,
            currency,
            type: 'prize',
            status: 'completed',
            description,
            createdAt: new Date(),
            updatedAt: new Date()
        });
    }
}
// Export a single instance of the storage
export const storage = new FirestoreStorage();
