// Tournament Scheduler Service - Automatic Tournament Status Management
import { firestore } from './firebase.js';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import { storage } from './storage.js';
const db = firestore;
/**
 * Tournament Status Manager
 * Handles automatic tournament status transitions and notifications
 */
export class TournamentStatusManager {
    /**
     * Check and update tournament statuses based on current time
     */
    static async checkAndUpdateTournamentStatuses() {
        try {
            logger.info('Starting tournament status check...');
            // Get all upcoming tournaments
            const upcomingTournaments = await storage.getUpcomingTournaments();
            const now = new Date();
            logger.info(`Found ${upcomingTournaments.length} upcoming tournaments to check`);
            for (const tournament of upcomingTournaments) {
                await this.processTournament(tournament, now);
            }
            logger.info('Tournament status check completed');
        }
        catch (error) {
            logger.error('Error in tournament status check:', error);
            throw error;
        }
    }
    /**
     * Process individual tournament and update status if needed
     */
    static async processTournament(tournament, currentTime) {
        try {
            const startTime = new Date(tournament.startTime);
            // Check if tournament should go live
            if (currentTime >= startTime && tournament.status === 'upcoming') {
                logger.info(`Tournament ${tournament.id} (${tournament.title}) should go live`);
                // Update tournament status to live
                await storage.updateTournament(tournament.id, {
                    status: 'live'
                });
                // Send room credentials to registered users
                await this.sendRoomCredentialsToUsers(tournament);
                logger.info(`Tournament ${tournament.id} status updated to live and notifications sent`);
            }
            // Check if tournament should be marked as completed (1 hour after start time)
            const completionTime = new Date(startTime.getTime() + (60 * 60 * 1000)); // 1 hour after start
            if (currentTime >= completionTime && tournament.status === 'live') {
                logger.info(`Tournament ${tournament.id} (${tournament.title}) should be marked as completed`);
                await storage.updateTournament(tournament.id, {
                    status: 'completed'
                });
                logger.info(`Tournament ${tournament.id} status updated to completed`);
            }
        }
        catch (error) {
            logger.error(`Error processing tournament ${tournament.id}:`, error);
        }
    }
    /**
     * Send room credentials to all registered users for a tournament
     */
    static async sendRoomCredentialsToUsers(tournament) {
        try {
            // Get all registrations for this tournament
            const registrations = await storage.getRegistrationsByTournament(tournament.id);
            if (registrations.length === 0) {
                logger.info(`No registrations found for tournament ${tournament.id}`);
                return;
            }
            logger.info(`Sending room credentials to ${registrations.length} registered users for tournament ${tournament.id}`);
            // Create notifications for each registered user
            const notificationPromises = registrations.map(registration => this.createUserNotification(registration, tournament));
            await Promise.all(notificationPromises);
            // Create a general announcement for the tournament
            await this.createTournamentAnnouncement(tournament);
            logger.info(`Room credentials sent to all registered users for tournament ${tournament.id}`);
        }
        catch (error) {
            logger.error(`Error sending room credentials for tournament ${tournament.id}:`, error);
        }
    }
    /**
     * Create individual notification for a user
     */
    static async createUserNotification(registration, tournament) {
        try {
            const message = this.generateRoomCredentialsMessage(tournament);
            // Create notification in Firestore
            await db.collection('notifications').add({
                userId: registration.userId,
                title: `Tournament ${tournament.title} is Now Live!`,
                message: message,
                type: 'tournament',
                tournamentId: tournament.id,
                isRead: false,
                createdAt: new Date(),
                priority: 'high'
            });
            // TODO: Send push notification via FCM
            // TODO: Send SMS notification if phone number available
            // TODO: Send email notification
        }
        catch (error) {
            logger.error(`Error creating notification for user ${registration.userId}:`, error);
        }
    }
    /**
     * Create tournament announcement
     */
    static async createTournamentAnnouncement(tournament) {
        try {
            const message = this.generateRoomCredentialsMessage(tournament);
            await storage.createAnnouncement({
                title: `${tournament.title} - Tournament Live`,
                message: message,
                type: 'tournament',
                tournamentId: parseInt(tournament.id),
                targetAudience: 'specific',
                sendAsPush: true,
                sendAsEmail: false,
                createdBy: 1, // System user
                isActive: true,
                createdAt: new Date()
            });
        }
        catch (error) {
            logger.error(`Error creating tournament announcement for ${tournament.id}:`, error);
        }
    }
    /**
     * Generate room credentials message
     */
    static generateRoomCredentialsMessage(tournament) {
        let message = `🎮 Tournament "${tournament.title}" has started!\n\n`;
        if (tournament.roomId && tournament.roomPassword) {
            message += `🏠 Room Details:\n`;
            message += `📍 Room ID: ${tournament.roomId}\n`;
            message += `🔑 Password: ${tournament.roomPassword}\n\n`;
        }
        message += `⏰ Tournament is now LIVE!\n`;
        message += `👥 ${tournament.registeredTeams}/${tournament.maxTeams} teams registered\n\n`;
        message += `Good luck and have fun! 🏆`;
        return message;
    }
    /**
     * Manual trigger for testing - updates specific tournament status
     */
    static async manuallyStartTournament(tournamentId) {
        try {
            const tournament = await storage.getTournament(tournamentId);
            if (!tournament) {
                throw new Error(`Tournament ${tournamentId} not found`);
            }
            if (tournament.status !== 'upcoming') {
                throw new Error(`Tournament ${tournamentId} is not in upcoming status`);
            }
            // Update status to live
            await storage.updateTournament(tournamentId, {
                status: 'live'
            });
            // Send notifications
            await this.sendRoomCredentialsToUsers(tournament);
            logger.info(`Tournament ${tournamentId} manually started`);
        }
        catch (error) {
            logger.error(`Error manually starting tournament ${tournamentId}:`, error);
            throw error;
        }
    }
}
/**
 * Firebase Cloud Function - Scheduled tournament status checker
 * Runs every 5 minutes to check for tournaments that should go live
 */
export const tournamentStatusChecker = onSchedule({
    schedule: 'every 5 minutes',
    timeZone: 'Asia/Kolkata',
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 300
}, async (event) => {
    logger.info('Tournament status checker triggered', { eventTime: event.scheduleTime });
    try {
        await TournamentStatusManager.checkAndUpdateTournamentStatuses();
        logger.info('Tournament status check completed successfully');
    }
    catch (error) {
        logger.error('Tournament status check failed:', error);
        throw error;
    }
});
/**
 * Firebase Cloud Function - Manual tournament starter
 * HTTP endpoint for manually starting tournaments
 */
export const startTournamentManually = onSchedule({
    schedule: 'every 24 hours', // Dummy schedule, this will be triggered manually
    timeZone: 'Asia/Kolkata',
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 300
}, async (event) => {
    // This function can be triggered manually via Firebase Console or CLI
    // firebase functions:call startTournamentManually --data='{"tournamentId":"TOURNAMENT_ID"}'
    logger.info('Manual tournament starter triggered');
    try {
        // In a real manual trigger, you'd pass the tournament ID in the event data
        // For now, this is just a placeholder
        logger.info('Manual tournament start completed');
    }
    catch (error) {
        logger.error('Manual tournament start failed:', error);
        throw error;
    }
});
