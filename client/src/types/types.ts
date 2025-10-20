import type { SupportTicket as SharedSupportTicket, SupportTicketStatus, SupportTicketPriority, PrizeDistributionRule as SharedPrizeDistributionRule } from '@shared/types';

// Import shared types for server-client compatibility

// Client-side Tournament type that allows string dates
export interface Tournament {
  id: string;
  name: string;
  title: string;
  description?: string;
  gameType: string;
  matchType: string;
  map: string;
  startTime: string;
  entryFee: number;
  prizePool: number;
  maxTeams: number;
  maxPlayers: number;
  currentRegistrations: number;
  registeredTeams: number;
  status: string;
  rules?: string;
  bannerImage?: string;
  rewardsDistribution?: {
    position: number;
    percentage: number;
  }[];
  createdAt: string;
  killReward?: number;
  roomId?: string;
  roomPassword?: string;
  actualStartTime?: string;
  completedAt?: string;
  country?: string;
  companyCommissionPercentage: number;
}

// Client-side AdminUser type
export interface AdminUser {
  uid: string;
  name?: string;
  email: string;
  role: 'admin' | 'moderator';
  createdAt: string;
}

// Client-side KycDocument type
export interface KycDocument {
  id: string;
  type: 'id-proof' | 'address-proof' | 'selfie';
  frontImage: string;
  backImage?: string;
  selfie?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
  submittedAt: string;
  rejectionReason?: string;
  documentType: string;
  documentNumber?: string;
  userId: string;
  notes?: string;
}

// Client-side PrizeDistributionRule with additional fields
export interface PrizeDistributionRule extends SharedPrizeDistributionRule {
  firstPrize: number;
  perKillReward: number;
  squadSplit: boolean;
  adminOverride?: boolean;
  firstPlacePercent: number;
  overrideDistribution?: RewardDistribution[];
}

export interface RewardDistribution {
  position: number;
  percentage: number;
}

// Client-side Support ticket type
export interface SupportTicket {
  id: string;
  ticketId: string;
  userId: string;
  username: string;
  userEmail: string;
  subject: string;
  description: string;
  category: string;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  assignedTo?: string;
  assignedToName?: string;
  createdAt: string;
  updatedAt: string;
  firstResponseAt?: string;
  responses: SupportTicketResponse[];
}

export interface SupportTicketResponse {
  id: string;
  ticketId: string;
  userId: string;
  message: string;
  createdAt: string;
  isAdmin: boolean;
  isInternal?: boolean;
  responderName?: string;
}

// Default tournament rules
export const DEFAULT_TOURNAMENT_RULES = `
1. All participants must register before the tournament starts
2. Any form of cheating or hacking will result in immediate disqualification
3. Players must join the game room with the provided ID and password
4. Screenshots of final results must be submitted within 30 minutes
5. Tournament organizers' decisions are final
6. Respect all players and maintain good sportsmanship
7. Any technical issues should be reported immediately
`.trim();
