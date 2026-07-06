// lib/codm/points.ts
// Mirrors the Discord bot's point calculation logic exactly.
// Used by the player stats page and leaderboard to compute web-side points.

import { POINTS } from './constants';
import type { ParsedScoreboardPlayer } from '@/lib/types/database';

export interface PlayerPoints {
  playerName: string;
  kills: number;
  deaths: number;
  assists: number;
  objTime: number;
  mvp: boolean;
  points: number;
  breakdown: {
    killPoints: number;
    deathPoints: number;
    assistPoints: number;
    mvpBonus: number;
    resultBonus: number;
  };
}

export function calculatePoints(
  player: ParsedScoreboardPlayer,
  won: boolean
): PlayerPoints {
  const killPoints = player.kills * POINTS.kill;
  const deathPoints = player.deaths * POINTS.death;
  const assistPoints = player.assists * POINTS.assist;
  const mvpBonus = player.mvp ? POINTS.mvp : 0;
  const resultBonus = won ? POINTS.win : POINTS.loss;

  const points = Math.max(0, killPoints + deathPoints + assistPoints + mvpBonus + resultBonus);

  return {
    playerName: player.playerName,
    kills: player.kills,
    deaths: player.deaths,
    assists: player.assists,
    objTime: player.objTime,
    mvp: player.mvp,
    points,
    breakdown: { killPoints, deathPoints, assistPoints, mvpBonus, resultBonus },
  };
}

export function calculateTeamPoints(
  players: ParsedScoreboardPlayer[],
  won: boolean
): PlayerPoints[] {
  return players.map((player) => calculatePoints(player, won));
}

/** Format objective time from seconds to mm:ss string (mirrors bot's formatObjTime) */
export function formatObjTime(seconds: number): string {
  if (!seconds) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

/** K/D ratio rounded to 2 decimal places */
export function kd(kills: number, deaths: number): string {
  if (deaths === 0) return kills.toFixed(2);
  return (kills / deaths).toFixed(2);
}
