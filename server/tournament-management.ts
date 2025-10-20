// Tournament Management HTTP Functions
import { onRequest } from 'firebase-functions/v2/https';
import { onCall } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { TournamentStatusManager } from './tournament-scheduler.js';
import { NotificationService } from './notification-service.js';
import { storage } from './storage.js';
import express from 'express';
import cors from 'cors';

// Express app for HTTP endpoints
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

/**
 * Manual Tournament Management Endpoints
 */

// Manually start a tournament
app.post('/start-tournament/:tournamentId', async (req, res) => {
  try {
    const { tournamentId } = req.params;
    
    logger.info(`Manual tournament start requested for ${tournamentId}`);
    
    await TournamentStatusManager.manuallyStartTournament(tournamentId);
    
    res.status(200).json({
      success: true,
      message: `Tournament ${tournamentId} started successfully`,
      timestamp: new Date().toISOString()
    });
      } catch (error: any) {
    logger.error('Error in manual tournament start:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to start tournament'
    });
  }
});

// Complete a tournament manually
app.post('/complete-tournament/:tournamentId', async (req, res) => {
  try {
    const { tournamentId } = req.params;
    
    logger.info(`Manual tournament completion requested for ${tournamentId}`);
    
    const tournament = await storage.getTournament(tournamentId);
    if (!tournament) {
      return res.status(404).json({
        success: false,
        error: 'Tournament not found'
      });
    }
    
    if (tournament.status !== 'live') {
      return res.status(400).json({
        success: false,
        error: 'Tournament is not currently live'
      });
    }
    
    // Update tournament status
    await storage.updateTournament(tournamentId, {
      status: 'completed',
      updatedAt: new Date()
    });
    
    // Send completion notification
    await NotificationService.sendTournamentNotification(
      tournamentId,
      `Tournament ${tournament.title} Completed`,
      'Thank you for participating! Results will be announced soon.',
      'normal'
    );
    
    res.status(200).json({
      success: true,
      message: `Tournament ${tournamentId} completed successfully`,
      timestamp: new Date().toISOString()
    });
      } catch (error: any) {
    logger.error('Error in manual tournament completion:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to complete tournament'
    });
  }
});

// Check tournament statuses manually
app.post('/check-tournament-statuses', async (req, res) => {
  try {
    logger.info('Manual tournament status check requested');
    
    await TournamentStatusManager.checkAndUpdateTournamentStatuses();
    
    res.status(200).json({
      success: true,
      message: 'Tournament status check completed successfully',
      timestamp: new Date().toISOString()
    });
      } catch (error) {
    logger.error('Error in manual tournament status check:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message || 'Failed to check tournament statuses'
    });
  }
});

// Send test notification to specific user
app.post('/send-test-notification', async (req, res) => {
  try {
    const { userId, title, message, type = 'system' } = req.body;
    
    if (!userId || !title || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, title, message'
      });
    }
    
    logger.info(`Sending test notification to user ${userId}`);
    
    await NotificationService.sendNotification({
      userId,
      title,
      message,
      type,
      priority: 'normal'
    });
    
    res.status(200).json({
      success: true,
      message: `Test notification sent to user ${userId}`,
      timestamp: new Date().toISOString()
    });
      } catch (error) {
    logger.error('Error sending test notification:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message || 'Failed to send test notification'
    });
  }
});

// Send tournament-specific notification
app.post('/send-tournament-notification/:tournamentId', async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { title, message, priority = 'normal' } = req.body;
    
    if (!title || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, message'
      });
    }
    
    logger.info(`Sending tournament notification for ${tournamentId}`);
    
    await NotificationService.sendTournamentNotification(tournamentId, title, message, priority);
    
    res.status(200).json({
      success: true,
      message: `Tournament notification sent for ${tournamentId}`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Error sending tournament notification:', error);    res.status(500).json({
      success: false,
      error: (error as Error).message || 'Failed to send tournament notification'
    });
  }
});

// Get tournament status and scheduling info
app.get('/tournament-status/:tournamentId', async (req, res) => {
  try {
    const { tournamentId } = req.params;
    
    const tournament = await storage.getTournament(tournamentId);
    if (!tournament) {
      return res.status(404).json({
        success: false,
        error: 'Tournament not found'
      });
    }
    
    const registrations = await storage.getRegistrationsByTournament(tournamentId);    const now = new Date();
    const startTime = tournament.startTime ? new Date(tournament.startTime) : new Date();
    
    const statusInfo = {
      tournament: {
        id: tournament.id,
        title: tournament.title,
        status: tournament.status,
        startTime: tournament.startTime,
        registeredTeams: registrations.length,
        maxTeams: tournament.maxTeams,
        hasRoomCredentials: !!((tournament as any).roomId && (tournament as any).roomPassword)
      },
      scheduling: {
        currentTime: now.toISOString(),
        startTime: startTime.toISOString(),
        timeUntilStart: startTime.getTime() - now.getTime(),
        shouldBeLive: now >= startTime,
        canStart: tournament.status === 'upcoming' && registrations.length > 0
      },
      registrations: registrations.length
    };
    
    res.status(200).json({
      success: true,
      data: statusInfo,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Error getting tournament status:', error);    res.status(500).json({
      success: false,
      error: (error as Error).message || 'Failed to get tournament status'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'tournament-management',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Prize distribution calculation and override
app.get('/tournaments/:id/prize-distribution', async (req, res) => {
  try {
    const { id } = req.params;
    const tournament = await storage.getTournament(id);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });
    // Default rule: 40% to 1st, rest split, allow override
    let rule = tournament.prizeDistributionRule || { firstPlacePercent: 40, squadSplit: tournament.matchType === 'squad', adminOverride: false };
    let distribution;
    if (rule.adminOverride && rule.overrideDistribution) {
      distribution = rule.overrideDistribution;
    } else {
      const pool = typeof tournament.prizePool === 'number' ? tournament.prizePool : 0;
      const first = Math.round(pool * (rule.firstPlacePercent / 100));
      let rest = pool - first;
      if (rule.squadSplit) {
        // Example: split rest among N squads (for demo, 2nd and 3rd place)
        distribution = [
          { position: 1, percentage: rule.firstPlacePercent, amount: first },
          { position: 2, percentage: pool ? Math.round((rest / pool) * 100 / 2) : 0, amount: Math.round(rest / 2) },
          { position: 3, percentage: pool ? Math.round((rest / pool) * 100 / 2) : 0, amount: Math.floor(rest / 2) }
        ];
      } else {
        // All to 1st
        distribution = [
          { position: 1, percentage: 100, amount: pool }
        ];
      }
    }
    res.json({ rule, distribution });
  } catch (e) {
    res.status(500).json({ error: 'Failed to calculate prize distribution' });
  }
});

app.post('/tournaments/:id/prize-distribution', async (req, res) => {
  try {
    const { id } = req.params;
    const { rule, overrideDistribution } = req.body;
    // Save override to tournament
    await storage.updateTournament(id, {
      prizeDistributionRule: { ...rule, adminOverride: true, overrideDistribution }
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to save prize distribution override' });
  }
});

// Backend enforcement: payout prizes to winners
app.post('/tournaments/:id/distribute-prizes', async (req, res) => {
  try {
    const { id } = req.params;
    const tournament = await storage.getTournament(id);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });
    // Get prize distribution rule
    const rule = tournament.prizeDistributionRule || { firstPlacePercent: 40, squadSplit: tournament.matchType === 'squad', adminOverride: false };
    let distribution;
    if (rule.adminOverride && rule.overrideDistribution) {
      distribution = rule.overrideDistribution;
    } else {
      const pool = typeof tournament.prizePool === 'number' ? tournament.prizePool : 0;
      const first = Math.round(pool * (rule.firstPlacePercent / 100));
      let rest = pool - first;
      if (rule.squadSplit) {
        distribution = [
          { position: 1, percentage: rule.firstPlacePercent, amount: first },
          { position: 2, percentage: pool ? Math.round((rest / pool) * 100 / 2) : 0, amount: Math.round(rest / 2) },
          { position: 3, percentage: pool ? Math.round((rest / pool) * 100 / 2) : 0, amount: Math.floor(rest / 2) }
        ];
      } else {
        distribution = [
          { position: 1, percentage: 100, amount: pool }
        ];
      }
    }
    // Get results for this tournament
    const results = await storage.getResultsByTournament(id);
    // Payout to winners
    for (const d of distribution) {
      const winners = results.filter(r => r.position === d.position && r.registrationId);
      if (winners.length > 0 && d.amount && d.amount > 0) {
        const amountPerWinner = Math.floor(d.amount / winners.length);
        for (const winner of winners) {
          try {
            if (!winner.registrationId) {
              logger.error(`Missing registrationId for result id ${winner.id}`);
              continue;
            }
            // Fetch registration to get userId
            const registration = await storage.getRegistration(winner.registrationId.toString());
            if (!registration || !registration.userId) {
              logger.error(`Missing userId for registration id ${winner.registrationId} (result id ${winner.id})`);
              continue;
            }
            const userId = registration.userId;
            // Tournament currency is not typed, so fallback to INR if missing
            const currency = (tournament as any).currency || 'INR';
            const tournamentTitle = tournament.title || tournament.id;
            await storage.creditUserWallet(
              userId,
              amountPerWinner,
              currency,
              `Tournament prize for position ${d.position} in ${tournamentTitle}`
            );
            // Mark result as paid
            await storage.updateResult(winner.id, { reward: amountPerWinner, rewardStatus: 'paid' });
          } catch (err) {
            logger.error(`Failed to payout for result id ${winner.id}: ${err}`);
          }
        }
      } else if (winners.length > 0 && (!d.amount || d.amount <= 0)) {
        logger.warn(`Prize amount for position ${d.position} is zero or negative. No payout.`);
      }
    }
    res.json({ success: true, distribution });
  } catch (e) {
    res.status(500).json({ error: 'Failed to distribute prizes' });
  }
});

/**
 * Export HTTP Cloud Function
 */
export const tournamentManagement = onRequest({
  region: 'us-central1',
  memory: '256MiB',
  timeoutSeconds: 300,
  cors: true
}, app);

/**
 * Callable Cloud Functions for client SDK
 */

// Start tournament (callable from client)
export const startTournament = onCall({
  region: 'us-central1',
  memory: '256MiB'
}, async (request) => {
  try {
    const { tournamentId } = request.data;
    
    if (!tournamentId) {
      throw new Error('Tournament ID is required');
    }
    
    // Check if user has admin permissions (implement your auth logic)
    // const { auth } = request;
    // if (!auth || !auth.token.admin) {
    //   throw new Error('Unauthorized: Admin access required');
    // }
    
    logger.info(`Callable function: Starting tournament ${tournamentId}`);
    
    await TournamentStatusManager.manuallyStartTournament(tournamentId);
    
    return {
      success: true,
      message: `Tournament ${tournamentId} started successfully`,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    logger.error('Error in callable startTournament:', error);
    throw error;
  }
});

// Complete tournament (callable from client)
export const completeTournament = onCall({
  region: 'us-central1',
  memory: '256MiB'
}, async (request) => {
  try {
    const { tournamentId } = request.data;
    
    if (!tournamentId) {
      throw new Error('Tournament ID is required');
    }
    
    logger.info(`Callable function: Completing tournament ${tournamentId}`);
    
    const tournament = await storage.getTournament(tournamentId);
    if (!tournament) {
      throw new Error('Tournament not found');
    }
    
    if (tournament.status !== 'live') {
      throw new Error('Tournament is not currently live');
    }
    
    await storage.updateTournament(tournamentId, {
      status: 'completed',
      updatedAt: new Date()
    });
    
    await NotificationService.sendTournamentNotification(
      tournamentId,
      `Tournament ${tournament.title} Completed`,
      'Thank you for participating! Results will be announced soon.',
      'normal'
    );
    
    return {
      success: true,
      message: `Tournament ${tournamentId} completed successfully`,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    logger.error('Error in callable completeTournament:', error);
    throw error;
  }
});
