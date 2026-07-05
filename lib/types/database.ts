// lib/types/database.ts
// Hand-written interfaces mirroring the Supabase schema in
// supabase/migrations/0001_init_schema.sql.
//
// If you later run `supabase gen types typescript`, you can replace this
// file with the generated Database type and derive these via
// Database['public']['Tables']['x']['Row'] instead. Kept hand-written for
// now so the shapes are easy to read and extend.

export type UserRole = 'player' | 'manager' | 'coach' | 'staff' | 'admin';
export type UserStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface User {
  id: string;
  email: string;
  username: string | null;
  fullName: string | null;
  role: UserRole | null;
  status: UserStatus;
  avatarUrl: string | null;
  bio: string | null;
  country: string | null;
  discordId: string | null;
  ign: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface Application {
  id: string;
  userId: string;
  role: UserRole | null;
  reason: string | null;
  experience: string | null;
  socialLinks: Record<string, string> | null;
  status: ApplicationStatus;
  adminNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Roster {
  id: string;
  name: string;
  game: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  region: string | null;
  active: boolean;
  managerId: string | null;
  accentColor: string;
  createdAt: string;
  updatedAt: string;
}

export interface RosterMember {
  id: string;
  rosterId: string;
  userId: string;
  ign: string | null;
  proImageUrl: string | null;
  position: string | null;
  jerseyNumber: number | null;
  isCaptain: boolean;
  createdAt: string;
  updatedAt: string;
}

export type MatchStatus = 'scheduled' | 'live' | 'completed' | 'cancelled';

export interface OpponentPlayer {
  name: string;
  ign?: string;
}

export interface Match {
  id: string;
  rosterId: string;
  createdBy: string | null;
  opponentName: string;
  opponentPlayers: OpponentPlayer[] | null;
  tournament: string | null;
  week: number | null;
  day: number | null;
  region: string | null;
  matchDate: string | null;
  teamScore: number;
  oppScore: number;
  status: MatchStatus;
  scoreboardImageUrl: string | null;
  ocrRawText: string | null;
  parsedScoreboard: ParsedScoreboard | null;
  createdAt: string;
  updatedAt: string;
}

export type CodmMode = 'Hardpoint' | 'Search & Destroy' | 'Control';
export type MatchMapStatus = 'pending' | 'played' | 'skipped';

export interface MatchMap {
  id: string;
  matchId: string;
  mapName: string;
  mode: CodmMode | null;
  teamScore: number | null;
  oppScore: number | null;
  orderNum: number;
  status: MatchMapStatus;
  vodUrl: string | null;
  mapImageUrl: string | null;
  scoreboardData: ParsedScoreboard | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlayerStat {
  id: string;
  matchId: string;
  userId: string;
  kills: number;
  deaths: number;
  assists: number;
  objTime: number;
  points: number;
  isMvp: boolean;
  rawData: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

// Shape returned by /api/ocr/scoreboard — see lib/types/ocr.ts for the
// authoritative version; re-exported here for convenience.
export interface ParsedScoreboardPlayer {
  playerName: string;
  kills: number;
  deaths: number;
  assists: number;
  objTime: number;
  mvp: boolean;
}

export interface ParsedScoreboard {
  players: ParsedScoreboardPlayer[];
}

export type TaskType = 'text' | 'video' | 'document' | 'link';
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'open' | 'in_progress' | 'done';

export interface Task {
  id: string;
  creatorId: string;
  title: string;
  content: string | null;
  type: TaskType | null;
  mediaUrl: string | null;
  assignedTo: string[];
  dueDate: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  targetRosterId: string | null;
  upvotes: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  upvotes: number;
  mentions: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export type NotificationType =
  | 'application_approved'
  | 'application_rejected'
  | 'new_task'
  | 'task_completed'
  | 'meeting_approved'
  | 'meeting_rejected'
  | 'new_message'
  | 'match_scheduled'
  | 'mention';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string | null;
  content: string | null;
  link: string | null;
  read: boolean;
  actorId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  read: boolean;
  mentions: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export type MeetingCategory = 'coaching' | 'strategy' | 'media' | 'admin' | 'other';
export type MeetingStatus = 'pending' | 'approved' | 'rejected' | 'rescheduled';

export interface MeetingRequest {
  id: string;
  requesterId: string;
  title: string;
  description: string | null;
  category: MeetingCategory | null;
  requestedDate: string;
  durationMinutes: number;
  status: MeetingStatus;
  adminNote: string | null;
  approvedDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminEvent {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  type: string | null;
  invitedUserIds: string[];
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUnavailable {
  id: string;
  startTime: string;
  endTime: string;
  reason: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Achievement {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  icon: string | null;
  awardedAt: string;
  createdAt: string;
  updatedAt: string;
}
