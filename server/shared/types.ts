import { type InferModel } from 'drizzle-orm';
import { tournaments, users, registrations, results, transactions, announcements } from './schema.js';
import { z } from 'zod';

export interface Tournament {
  id: string;
  name: string;
  title: string;  // Used in frontend as display name
  description?: string;
  gameType: string;
  matchType: string;
  map: string;
  startTime: string | Date;  // Allow both formats for flexibility
  entryFee: number;
  prizePool: number;
  maxTeams: number;
  maxPlayers: number;  // Same as maxTeams, used in frontend
  currentRegistrations: number;
  registeredTeams: number;
  status: string;
  rules?: string;
  bannerImage?: string;
  rewardsDistribution?: {
    position: number;
    percentage: number;
  }[];
  createdAt: string | Date;  // Allow both formats for flexibility
  killReward?: number;
  roomId?: string;
  roomPassword?: string;
  actualStartTime?: string | Date;
  completedAt?: string | Date;
  country?: string;
  companyCommissionPercentage: number;
}

export type User = InferModel<typeof users>;
export type UserInsert = InferModel<typeof users, 'insert'>;

export type Registration = InferModel<typeof registrations>;
export type RegistrationInsert = InferModel<typeof registrations, 'insert'>;

export type Result = InferModel<typeof results>;
export type ResultInsert = InferModel<typeof results, 'insert'>;

export type Transaction = InferModel<typeof transactions>;
export type TransactionInsert = InferModel<typeof transactions, 'insert'>;

export type Announcement = InferModel<typeof announcements>;
export type AnnouncementInsert = InferModel<typeof announcements, 'insert'>;

export type Notification = {
  id: string;
  title: string;
  message: string;
  type: 'general' | 'tournament';
  isActive: boolean;
  tournamentId?: string;
  createdAt: string;
};

export const insertNotificationSchema = z.object({
  title: z.string().min(1).max(100),
  message: z.string().min(1).max(1000)
});

export type KycDocument = {
  id: string;
  type: 'id-proof' | 'address-proof' | 'selfie';
  frontImage?: string;
  frontImageUrl?: string; // Same as frontImage
  backImage?: string;
  backImageUrl?: string; // Same as backImage
  selfie?: string;
  selfieUrl?: string; // Same as selfie
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  rejectionReason?: string;
  documentType?: string;
  documentNumber?: string;
  userId?: string;
  notes?: string;
};

export type AdminUser = {
  uid: string;
  name?: string;
  email: string;
  role: 'admin' | 'moderator';
  createdAt: string;
  displayName?: string;
  photoURL?: string;
};

export type SupportTicketBase = {
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
};

export interface SupportTicket extends SupportTicketBase {
  responses?: SupportTicketResponse[];
};

export type SupportTicketResponse = {
  id: string;
  ticketId: string;
  userId: string;
  message: string;
  createdAt: string;
  isAdmin: boolean;
  isInternal?: boolean;
  responderName?: string;
};

export enum SupportTicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in-progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  PENDING = 'pending'
}

export type SupportTicketStatusType = 'open' | 'in-progress' | 'resolved' | 'closed' | 'pending';

export enum SupportTicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface PrizeDistributionRule {
  firstPlacePercent: number;
  squadSplit: boolean;
  firstPrize: number;
  perKillReward: number;
  adminOverride?: boolean;
  overrideDistribution?: RewardDistribution[];
};

export type RewardDistribution = {
  position: number;
  percentage: number;
};

export type TeamRegistration = {
  id: number;
  teamName: string;
  teamMembers: {
    username: string;
    inGameId: string;
  }[];
  userId: string;
  createdAt: string;
};

export type MatchResult = {
  id: string;
  registrationId: number;
  teamId: string;
  position: number;
  kills: number;
  screenshot: string;
  isVerified: boolean;
  verified: boolean; // Will be set to same value as isVerified
  reward?: number;
  createdAt: string;
};
