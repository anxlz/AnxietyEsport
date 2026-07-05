// lib/types/database-rows.ts
//
// Supabase/Postgres returns snake_case column names. The rest of the app
// (lib/types/database.ts) uses camelCase per our naming convention. Rather
// than fighting Postgres naming or hand-mapping every query, use these
// thin "Row" types for what comes back over the wire, and the mapXFromRow
// helpers to convert into the camelCase domain types.
//
// Usage:
//   const { data } = await supabase.from('users').select('*').single();
//   const user: User = mapUserFromRow(data);

import type {
  User,
  Application,
  Roster,
  RosterMember,
  Match,
  MatchMap,
  PlayerStat,
  Task,
  TaskComment,
  Notification,
  Message,
  MeetingRequest,
  AdminEvent,
  AdminUnavailable,
  Achievement,
} from './database';

export interface UserRow {
  id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  role: User['role'];
  status: User['status'];
  avatar_url: string | null;
  bio: string | null;
  country: string | null;
  discord_id: string | null;
  ign: string | null;
  created_at: string;
  updated_at: string;
}

export function mapUserFromRow(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    fullName: row.full_name,
    role: row.role,
    status: row.status,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    country: row.country,
    discordId: row.discord_id,
    ign: row.ign,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface ApplicationRow {
  id: string;
  user_id: string;
  role: Application['role'];
  reason: string | null;
  experience: string | null;
  social_links: Record<string, string> | null;
  status: Application['status'];
  admin_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export function mapApplicationFromRow(row: ApplicationRow): Application {
  return {
    id: row.id,
    userId: row.user_id,
    role: row.role,
    reason: row.reason,
    experience: row.experience,
    socialLinks: row.social_links,
    status: row.status,
    adminNote: row.admin_note,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface RosterRow {
  id: string;
  name: string;
  game: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  region: string | null;
  active: boolean;
  manager_id: string | null;
  accent_color: string;
  created_at: string;
  updated_at: string;
}

export function mapRosterFromRow(row: RosterRow): Roster {
  return {
    id: row.id,
    name: row.name,
    game: row.game,
    slug: row.slug,
    description: row.description,
    logoUrl: row.logo_url,
    coverUrl: row.cover_url,
    region: row.region,
    active: row.active,
    managerId: row.manager_id,
    accentColor: row.accent_color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface RosterMemberRow {
  id: string;
  roster_id: string;
  user_id: string;
  ign: string | null;
  pro_image_url: string | null;
  position: string | null;
  jersey_number: number | null;
  is_captain: boolean;
  created_at: string;
  updated_at: string;
}

export function mapRosterMemberFromRow(row: RosterMemberRow): RosterMember {
  return {
    id: row.id,
    rosterId: row.roster_id,
    userId: row.user_id,
    ign: row.ign,
    proImageUrl: row.pro_image_url,
    position: row.position,
    jerseyNumber: row.jersey_number,
    isCaptain: row.is_captain,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface MatchRow {
  id: string;
  roster_id: string;
  created_by: string | null;
  opponent_name: string;
  opponent_players: Match['opponentPlayers'];
  tournament: string | null;
  week: number | null;
  day: number | null;
  region: string | null;
  match_date: string | null;
  team_score: number;
  opp_score: number;
  status: Match['status'];
  scoreboard_image_url: string | null;
  ocr_raw_text: string | null;
  parsed_scoreboard: Match['parsedScoreboard'];
  created_at: string;
  updated_at: string;
}

export function mapMatchFromRow(row: MatchRow): Match {
  return {
    id: row.id,
    rosterId: row.roster_id,
    createdBy: row.created_by,
    opponentName: row.opponent_name,
    opponentPlayers: row.opponent_players,
    tournament: row.tournament,
    week: row.week,
    day: row.day,
    region: row.region,
    matchDate: row.match_date,
    teamScore: row.team_score,
    oppScore: row.opp_score,
    status: row.status,
    scoreboardImageUrl: row.scoreboard_image_url,
    ocrRawText: row.ocr_raw_text,
    parsedScoreboard: row.parsed_scoreboard,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface MatchMapRow {
  id: string;
  match_id: string;
  map_name: string;
  mode: MatchMap['mode'];
  team_score: number | null;
  opp_score: number | null;
  order_num: number;
  status: MatchMap['status'];
  vod_url: string | null;
  map_image_url: string | null;
  scoreboard_data: MatchMap['scoreboardData'];
  created_at: string;
  updated_at: string;
}

export function mapMatchMapFromRow(row: MatchMapRow): MatchMap {
  return {
    id: row.id,
    matchId: row.match_id,
    mapName: row.map_name,
    mode: row.mode,
    teamScore: row.team_score,
    oppScore: row.opp_score,
    orderNum: row.order_num,
    status: row.status,
    vodUrl: row.vod_url,
    mapImageUrl: row.map_image_url,
    scoreboardData: row.scoreboard_data,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface PlayerStatRow {
  id: string;
  match_id: string;
  user_id: string;
  kills: number;
  deaths: number;
  assists: number;
  obj_time: number;
  points: number;
  is_mvp: boolean;
  raw_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export function mapPlayerStatFromRow(row: PlayerStatRow): PlayerStat {
  return {
    id: row.id,
    matchId: row.match_id,
    userId: row.user_id,
    kills: row.kills,
    deaths: row.deaths,
    assists: row.assists,
    objTime: row.obj_time,
    points: row.points,
    isMvp: row.is_mvp,
    rawData: row.raw_data,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface TaskRow {
  id: string;
  creator_id: string;
  title: string;
  content: string | null;
  type: Task['type'];
  media_url: string | null;
  assigned_to: string[];
  due_date: string | null;
  priority: Task['priority'];
  status: Task['status'];
  target_roster_id: string | null;
  upvotes: number;
  created_at: string;
  updated_at: string;
}

export function mapTaskFromRow(row: TaskRow): Task {
  return {
    id: row.id,
    creatorId: row.creator_id,
    title: row.title,
    content: row.content,
    type: row.type,
    mediaUrl: row.media_url,
    assignedTo: row.assigned_to,
    dueDate: row.due_date,
    priority: row.priority,
    status: row.status,
    targetRosterId: row.target_roster_id,
    upvotes: row.upvotes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface TaskCommentRow {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  upvotes: number;
  mentions: string[] | null;
  created_at: string;
  updated_at: string;
}

export function mapTaskCommentFromRow(row: TaskCommentRow): TaskComment {
  return {
    id: row.id,
    taskId: row.task_id,
    userId: row.user_id,
    content: row.content,
    upvotes: row.upvotes,
    mentions: row.mentions,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface NotificationRow {
  id: string;
  user_id: string;
  type: Notification['type'];
  title: string | null;
  content: string | null;
  link: string | null;
  read: boolean;
  actor_id: string | null;
  created_at: string;
  updated_at: string;
}

export function mapNotificationFromRow(row: NotificationRow): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    content: row.content,
    link: row.link,
    read: row.read,
    actorId: row.actor_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface MessageRow {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  mentions: string[] | null;
  created_at: string;
  updated_at: string;
}

export function mapMessageFromRow(row: MessageRow): Message {
  return {
    id: row.id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    content: row.content,
    read: row.read,
    mentions: row.mentions,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface MeetingRequestRow {
  id: string;
  requester_id: string;
  title: string;
  description: string | null;
  category: MeetingRequest['category'];
  requested_date: string;
  duration_minutes: number;
  status: MeetingRequest['status'];
  admin_note: string | null;
  approved_date: string | null;
  created_at: string;
  updated_at: string;
}

export function mapMeetingRequestFromRow(row: MeetingRequestRow): MeetingRequest {
  return {
    id: row.id,
    requesterId: row.requester_id,
    title: row.title,
    description: row.description,
    category: row.category,
    requestedDate: row.requested_date,
    durationMinutes: row.duration_minutes,
    status: row.status,
    adminNote: row.admin_note,
    approvedDate: row.approved_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface AdminEventRow {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  type: string | null;
  invited_user_ids: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function mapAdminEventFromRow(row: AdminEventRow): AdminEvent {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    startTime: row.start_time,
    endTime: row.end_time,
    type: row.type,
    invitedUserIds: row.invited_user_ids,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface AdminUnavailableRow {
  id: string;
  start_time: string;
  end_time: string;
  reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function mapAdminUnavailableFromRow(row: AdminUnavailableRow): AdminUnavailable {
  return {
    id: row.id,
    startTime: row.start_time,
    endTime: row.end_time,
    reason: row.reason,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface AchievementRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  icon: string | null;
  awarded_at: string;
  created_at: string;
  updated_at: string;
}

export function mapAchievementFromRow(row: AchievementRow): Achievement {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    icon: row.icon,
    awardedAt: row.awarded_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
