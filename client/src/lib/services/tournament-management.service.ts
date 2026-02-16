import { apiRequest } from '@/lib/queryClient';
// import { getFunctions, httpsCallable } from 'firebase/functions';
// import app from '@/lib/firebase/index';

// Tournament Management Service for Client

// const functions = getFunctions(app);

export interface TournamentStatusInfo {
  tournament: {
    id: string;
    title: string;
    status: string;
    startTime: string;
    registeredTeams: number;
    maxTeams: number;
    hasRoomCredentials: boolean;
    roomId?: string;
    roomPassword?: string;
  };
  scheduling: {
    currentTime: string;
    startTime: string;
    timeUntilStart: number;
    shouldBeLive: boolean;
    canStart: boolean;
  };
  registrations: number;
  players: Array<{
    registrationId: number;
    userId: number | null;
    userName: string;
    teamName: string;
    gameId: string;
    isTeamLeader: boolean;
    paymentStatus: string;
  }>;
}

export interface TournamentManagementResponse {
  success: boolean;
  message: string;
  timestamp: string;
  error?: string;
}

/**
 * Tournament Management Service
 * Provides client-side functions for managing tournaments
 */
export class TournamentManagementService {

  /**
   * Start a tournament manually (Admin only)
   */
  static async startTournament(tournamentId: string): Promise<TournamentManagementResponse> {
    try {
      const response = await apiRequest('POST', `/tournament-management/start-tournament/${tournamentId}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to start tournament');
      }

      return result;
    } catch (error) {
      console.error('Error starting tournament:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to start tournament');
    }
  }

  /**
   * Complete a tournament manually (Admin only)
   */
  static async completeTournament(tournamentId: string): Promise<TournamentManagementResponse> {
    try {
      const response = await apiRequest('POST', `/tournament-management/complete-tournament/${tournamentId}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to complete tournament');
      }

      return result;
    } catch (error) {
      console.error('Error completing tournament:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to complete tournament');
    }
  }

  /**
   * Trigger manual tournament status check (Admin only)
   */
  static async checkTournamentStatuses(): Promise<TournamentManagementResponse> {
    try {
      const response = await apiRequest('POST', '/tournament-management/check-tournament-statuses');
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to check tournament statuses');
      }

      return result;
    } catch (error) {
      console.error('Error checking tournament statuses:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to check tournament statuses');
    }
  }

  /**
   * Get tournament status and scheduling information
   */
  static async getTournamentStatus(tournamentId: string): Promise<TournamentStatusInfo> {
    try {
      const response = await apiRequest('GET', `/tournament-management/tournament-status/${tournamentId}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to get tournament status');
      }

      return result.data;
    } catch (error) {
      console.error('Error getting tournament status:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to get tournament status');
    }
  }

  /**
   * Send custom notification to tournament participants
   */
  static async sendTournamentNotification(
    tournamentId: string,
    title: string,
    message: string,
    priority: 'low' | 'normal' | 'high' = 'normal'
  ): Promise<TournamentManagementResponse> {
    try {
      const response = await apiRequest('POST', `/tournament-management/send-tournament-notification/${tournamentId}`, {
        title,
        message,
        priority
      });
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to send tournament notification');
      }

      return result;
    } catch (error) {
      console.error('Error sending tournament notification:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to send tournament notification');
    }
  }

  /**
   * Send test notification to a specific user (Admin only)
   */
  static async sendTestNotification(
    userId: string,
    title: string,
    message: string,
    type: 'tournament' | 'system' | 'announcement' = 'system'
  ): Promise<TournamentManagementResponse> {
    try {
      const response = await apiRequest('POST', '/tournament-management/send-test-notification', {
        userId,
        title,
        message,
        type
      });
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to send test notification');
      }

      return result;
    } catch (error) {
      console.error('Error sending test notification:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to send test notification');
    }
  }

  /**
   * Format time until tournament start
   */
  static formatTimeUntilStart(timeUntilStart: number): string {
    if (timeUntilStart <= 0) {
      return 'Tournament should be live';
    }

    const hours = Math.floor(timeUntilStart / (1000 * 60 * 60));
    const minutes = Math.floor((timeUntilStart % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  /**
   * Get tournament status badge color
   */
  static getStatusBadgeColor(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
    switch (status) {
      case 'upcoming':
        return 'default';
      case 'live':
        return 'secondary';
      case 'completed':
        return 'outline';
      default:
        return 'default';
    }
  }

  /**
   * Check if tournament can be started manually
   */
  static canStartTournament(statusInfo: TournamentStatusInfo): boolean {
    return statusInfo.scheduling.canStart && statusInfo.registrations > 0;
  }

  /**
   * Check if tournament can be completed manually
   */
  static canCompleteTournament(statusInfo: TournamentStatusInfo): boolean {
    return statusInfo.tournament.status === 'ongoing';
  }

  /**
   * Get tournament scheduling recommendations
   */
  static getSchedulingRecommendations(statusInfo: TournamentStatusInfo): string[] {
    const recommendations: string[] = [];

    if (!statusInfo.tournament.hasRoomCredentials) {
      recommendations.push('Add room ID and password before starting the tournament');
    }

    if (statusInfo.registrations === 0) {
      recommendations.push('No users registered for this tournament');
    }

    if (statusInfo.scheduling.timeUntilStart > 0 && statusInfo.scheduling.timeUntilStart < 300000) { // 5 minutes
      recommendations.push('Tournament will start automatically in less than 5 minutes');
    }

    if (statusInfo.scheduling.shouldBeLive && statusInfo.tournament.status === 'scheduled') {
      recommendations.push('Tournament should be live but status is still upcoming - consider manual start');
    }

    return recommendations;
  }
}
