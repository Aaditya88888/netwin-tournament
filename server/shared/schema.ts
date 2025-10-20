import { pgTable, text, serial, integer, boolean, json, timestamp, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  profileImage: text("profile_image"),
  walletBalance: doublePrecision("wallet_balance").default(0).notNull(),
  isVerified: boolean("is_verified").default(false).notNull(),
  kycStatus: text("kyc_status").default("pending").notNull(),
  kycDocuments: json("kyc_documents").$type<{
    idProof?: string;
    addressProof?: string;
    selfie?: string;
  }>(),
  status: text("status").default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastLogin: timestamp("last_login"),
  location: text("location"),
});

// Tournaments table
export const tournaments = pgTable("tournaments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  gameType: text("game_type").notNull(),
  matchType: text("match_type").notNull(),
  map: text("map").notNull(),
  startTime: timestamp("start_time").notNull(),
  entryFee: doublePrecision("entry_fee").notNull(),
  prizePool: doublePrecision("prize_pool").notNull(),
  maxTeams: integer("max_teams").notNull(),
  registeredTeams: integer("registered_teams").default(0).notNull(),
  status: text("status").default("upcoming").notNull(),
  rules: text("rules"),
  bannerImage: text("banner_image"),
  rewardsDistribution: json("rewards_distribution").$type<{
    position: number;
    percentage: number;
  }[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  killReward: doublePrecision("kill_reward"),
  roomId: text("room_id"),
  roomPassword: text("room_password"),
  actualStartTime: timestamp("actual_start_time"),
  completedAt: timestamp("completed_at"),
});

// Registrations table
export const registrations = pgTable("registrations", {
  id: serial("id").primaryKey(),
  tournamentId: text("tournament_id").notNull(),
  userId: integer("user_id").notNull(),
  teamName: text("team_name").notNull(),
  teamMembers: json("team_members").$type<{
    username: string;
    inGameId: string;
  }[]>(),
  paymentStatus: text("payment_status").default("pending").notNull(),
  registeredAt: timestamp("registered_at").defaultNow().notNull(),
});

// Results table
export const results = pgTable("results", {
  id: serial("id").primaryKey(),
  tournamentId: text("tournament_id").notNull(),
  registrationId: integer("registration_id").notNull(),
  position: integer("position"),
  kills: integer("kills").default(0).notNull(),
  screenshot: text("screenshot"),
  isVerified: boolean("is_verified").default(false).notNull(),
  reward: doublePrecision("reward"),
  rewardStatus: text("reward_status").default("pending").notNull(),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  verifiedAt: timestamp("verified_at"),
});

// Transactions table
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  tournamentId: text("tournament_id"),
  amount: doublePrecision("amount").notNull(),
  type: text("type").notNull(),
  status: text("status").default("pending").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Announcements table
export * from './types.js';

export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").default("general").notNull(),
  tournamentId: integer("tournament_id"),
  targetAudience: text("target_audience").default("all").notNull(),
  sendAsPush: boolean("send_as_push").default(false).notNull(),
  sendAsEmail: boolean("send_as_email").default(false).notNull(),
  createdBy: integer("created_by").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ======= Form Schemas for Validation ======= //

// ======= Form Schemas for Validation ======= //

// Define Zod schemas for validation
export const insertUserSchema = z.object({
  username: z.string(),
  password: z.string(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string().nullable().optional(),
  profileImage: z.string().nullable().optional(),
  walletBalance: z.number().default(0),
  isVerified: z.boolean().default(false),
  kycStatus: z.string().default("pending"),
  kycDocuments: z.object({
    idProof: z.string().optional(),
    addressProof: z.string().optional(),
    selfie: z.string().optional(),
  }).optional(),
  status: z.string().default("active"),
  location: z.string().nullable().optional(),
});

export const insertTournamentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  gameType: z.string(),
  matchType: z.string(),
  map: z.string(),
  startTime: z.string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Please enter a valid date and time",
    })
    .transform((val) => new Date(val)),
  entryFee: z.number(),
  prizePool: z.number(),
  killReward: z.number().optional(),
  maxTeams: z.number(),
  status: z.string().default("upcoming"),
  rules: z.string().optional(),
  bannerImage: z.string().optional(),
  roomId: z.string().optional(),
  roomPassword: z.string().optional(),
  rewardsDistribution: z.array(z.object({
    position: z.number(),
    percentage: z.number(),
  })),
});

export const insertRegistrationSchema = z.object({
  tournamentId: z.string(),
  userId: z.number(),
  teamName: z.string(),
  teamMembers: z.array(z.object({
    username: z.string(),
    inGameId: z.string(),
  })).nullable().optional(),
  paymentStatus: z.string().default("pending"),
});

export const insertResultSchema = z.object({
  tournamentId: z.string(),
  registrationId: z.number(),
  position: z.number().nullable().optional(),
  kills: z.number().default(0),
  screenshot: z.string().nullable().optional(),
  isVerified: z.boolean().default(false),
  reward: z.number().nullable().optional(),
  rewardStatus: z.string().default("pending"),
});

export const insertTransactionSchema = z.object({
  userId: z.number(),
  tournamentId: z.string().optional(),
  amount: z.number(),
  type: z.string(),
  status: z.string().default("pending"),
  description: z.string().optional(),
});

export const insertAnnouncementSchema = z.object({
  title: z.string(),
  message: z.string(),
  type: z.string().default("general"),
  tournamentId: z.number().nullable().optional(),
  targetAudience: z.string().default("all"),
  sendAsPush: z.boolean().default(false),
  sendAsEmail: z.boolean().default(false),
  createdBy: z.number(),
  isActive: z.boolean().default(true),
});

export const insertKycDocumentSchema = z.object({
  userId: z.number(),
  documentType: z.string(),
  documentNumber: z.string().optional(),
  frontImage: z.string().optional(),
  backImage: z.string().optional(),
  selfie: z.string().optional(),
  status: z.string().default("pending"),
  submittedAt: z.date().default(() => new Date()),
  reviewedAt: z.date().optional(),
  rejectionReason: z.string().optional(),
});

// Type definitions
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = InsertUser & { 
  id: number; 
  createdAt: Date; 
  updatedAt: Date;
  lastLogin: Date | null;
  registeredTeams?: number;
  isBanned?: boolean;
  isVerified?: boolean;
  kycDocuments?: any;
};

export type InsertTournament = z.infer<typeof insertTournamentSchema>;
export type Tournament = InsertTournament & { 
  id: string; 
  createdAt: Date; 
  updatedAt: Date; 
  registeredTeams?: number;
  killReward?: number;
  roomId?: string;
  roomPassword?: string;
  actualStartTime?: Date;
  completedAt?: Date;
};

export type InsertRegistration = z.infer<typeof insertRegistrationSchema>;
export type Registration = InsertRegistration & { 
  id: number; 
  createdAt: Date; 
  updatedAt: Date; 
};

export type InsertResult = z.infer<typeof insertResultSchema>;
export type Result = InsertResult & { 
  id: number; 
  createdAt: Date; 
  updatedAt: Date; 
};

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = InsertTransaction & { 
  id: number; 
  createdAt: Date; 
  updatedAt: Date; 
};

export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type Announcement = InsertAnnouncement & { 
  id: number; 
  createdAt: Date; 
  updatedAt: Date; 
};

export type InsertKycDocument = z.infer<typeof insertKycDocumentSchema>;
export type KycDocument = InsertKycDocument & { 
  id: number; 
  createdAt: Date; 
  updatedAt: Date; 
};
