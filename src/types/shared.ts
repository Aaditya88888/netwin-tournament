// Shared types between user app and admin dashboard

export type TournamentStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled' | 'live' | 'draft';
export type MatchStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled' | 'live';
export type ParticipantStatus = 'registered' | 'playing' | 'eliminated' | 'winner';
export type TransactionType = 'deposit' | 'withdrawal' | 'entry_fee' | 'prize_money';
export type TransactionStatus = 'pending' | 'completed' | 'failed';
export type Currency = 'INR' | 'NGN' | 'USD';
export type GameMode = 'PUBG' | 'BGMI';
export type UserRole = 'admin' | 'moderator' | 'player';
export type KYCStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface BaseDocument {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tournament extends BaseDocument {
  title: string;
  description: string;
  gameMode: GameMode;
  type: 'solo' | 'duo' | 'squad';
  entryFee: number;
  currency: Currency;
  prizePool: number;
  maxParticipants: number;
  currentParticipants: number;
  startTime: Date;
  endTime?: Date;
  status: TournamentStatus;
  rules: string[];
  coverImage?: string;
  roomDetails?: {
    roomId: string;
    password: string;
  };
  createdBy: string;
}

export interface Match extends BaseDocument {
  tournamentId: string;
  participants: string[]; // User IDs
  winnerId?: string;
  status: MatchStatus;
  startTime: Date;
  endTime?: Date;
  result?: {
    winner: string;
    score: string;
    screenshots: string[];
  };
}

export interface Participant extends BaseDocument {
  userId: string;
  tournamentId: string;
  status: ParticipantStatus;
  position?: number;
  prizeMoney?: number;
}

export interface Transaction extends BaseDocument {
  userId: string;
  type: TransactionType;
  amount: number;
  currency: Currency;
  status: TransactionStatus;
  reference?: string;
  description: string;
  metadata?: Record<string, any>;
}

export interface Announcement extends BaseDocument {
  title: string;
  content: string;
  type: 'general' | 'tournament' | 'maintenance';
  priority: 'low' | 'medium' | 'high';
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
}

export interface Notification extends BaseDocument {
  userId: string;
  title: string;
  message: string;
  type: 'tournament' | 'match' | 'wallet' | 'system';
  read: boolean;
  data?: Record<string, any>;
}

export interface UserProfile extends BaseDocument {
  email?: string;
  phoneNumber?: string;
  displayName: string;
  photoURL?: string;
  gameId?: string;
  gameMode: GameMode;
  currency: Currency;
  country?: string;
  role: UserRole;
  kycStatus: KYCStatus;
  walletBalance: number;
}

// Utility types for filtering and querying
export interface TournamentFilters {
  gameMode?: GameMode;
  entryFee?: {
    min?: number;
    max?: number;
  };
  type?: 'solo' | 'duo' | 'squad';
  status?: TournamentStatus;
  currency?: Currency;
  dateRange?: {
    start?: Date;
    end?: Date;
  };
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}