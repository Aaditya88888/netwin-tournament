import { BaseDocument } from './index';


export interface User {
  id?: string;
  email?: string;
  displayName?: string;
  name?: string;
  username?: string;
  photoURL?: string;
  phoneNumber?: string;
  isAdmin?: boolean;
  status?: string;
  kycStatus?: 'pending' | 'approved' | 'rejected' | 'not_submitted';
  walletBalance?: number;
  createdAt?: string | Date;
  updatedAt?: Date;
}

export interface Tournament {
  id?: string;
  title?: string;
  description?: string;
  gameType?: string;
  entryFee?: number;
  prizePool?: number;
  maxParticipants?: number;
  maxTeams?: number;
  currentParticipants?: number;
  registeredTeams?: number;
  startTime?: string | Date;
  endTime?: Date;
  status?: 'upcoming' | 'ongoing' | 'completed' | 'cancelled' | 'live' | 'draft';
  rules?: string[];
  coverImage?: string;
  bannerImage?: string;
  map?: string;
  matchType?: string;
  companyCommissionPercentage?: number;
  createdAt?: Date;
  updatedAt?: Date;
  calculatedKillRewardDistribution?: any[];
  killReward?: number;
  rewardsDistribution?: any[];
}

export interface Match {
  id?: string;
  tournamentId?: string;
  participants?: string[]; // User IDs
  winnerId?: string;
  status?: 'scheduled' | 'ongoing' | 'completed' | 'cancelled' | 'live';
  startTime?: Date;
  endTime?: Date;
  result?: {
    winner: string;
    score: string;
    screenshots: string[];
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Participant extends BaseDocument {
  userId: string;
  tournamentId: string;
  status: 'registered' | 'playing' | 'eliminated' | 'winner';
  position?: number;
  prizeMoney?: number;
}

export interface Transaction {
  id?: string;
  userId?: number;
  type?: 'deposit' | 'withdrawal' | 'entry_fee' | 'prize_money';
  amount?: number;
  status?: 'pending' | 'completed' | 'failed';
  reference?: string;
  description?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Announcement {
  id?: string;
  title?: string;
  content?: string;
  message?: string;
  type?: 'general' | 'tournament' | 'maintenance';
  priority?: 'low' | 'medium' | 'high';
  startDate?: Date;
  endDate?: Date;
  isActive?: boolean;
  createdBy?: number;
  tournamentId?: number | null;
  targetAudience?: string;
  sendAsPush?: boolean;
  sendAsEmail?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface KYCRequest extends BaseDocument {
  userId: string;
  fullName: string;
  dateOfBirth: Date;
  idType: 'passport' | 'national_id' | 'drivers_license';
  idNumber: string;
  idFrontImage: string;
  idBackImage: string;
  selfieImage: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
}

export interface PayoutRequest {
  id?: string;
  userId?: number;
  amount?: number;
  status?: 'pending' | 'approved' | 'rejected';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DashboardStats {
  overview?: {
    totalUsers?: number;
    totalTournaments?: number;
    totalRevenue?: number;
    activeTournaments?: number;
  };
  recentActivity?: any[];
  systemHealth?: any;
  upcomingEvents?: any[];
}

export interface FinancialStats {
  totalRevenue?: number;
  monthlyRevenue?: number;
  weeklyRevenue?: number;
  dailyRevenue?: number;
  totalTransactions?: number;
  pendingPayouts?: number;
  revenueGrowth?: number;
  transactionGrowth?: number;
  averageTransactionValue?: number;
  topSpenders?: any[];
}

export interface SystemSettings {
  general?: any;
  tournament?: any;
  notifications?: any;
  security?: any;
  integrations?: any;
}

// Type aliases for common status types
export type TournamentStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled' | 'live' | 'draft';
export type MatchStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled' | 'live';
export type UserStatus = 'active' | 'inactive' | 'banned' | 'pending';

// Helper function types
export interface SelectItem {
  id?: string | number;
  value?: string;
  label?: string;
}

export interface MatchResult {
  id?: string;
  registrationId?: number;
  tournamentId?: string;
  position?: number;
  kills?: number;
  screenshot?: string;
  isVerified?: boolean;
  reward?: number;
  rewardStatus?: string;
  submittedAt?: Date;
  verifiedAt?: Date;
  verifiedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TeamRegistration {
  id?: number;
  teamId?: number;
  teamName?: string;
  tournamentId?: string;
  userId?: number;
  registrationDate?: Date;
  status?: string;
  paymentStatus?: string;
  entryFee?: number;
  teamMembers?: any[];
  createdAt?: Date;
  updatedAt?: Date;
}
