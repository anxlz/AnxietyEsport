'use client';

import type { ReactElement } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

export interface PlayerStatData {
  matchLabel: string;
  kills: number;
  deaths: number;
  kd: number;
  assists: number;
  objTime: number;
  objTimeLabel?: string;
  points: number;
  isMvp: boolean;
}

interface StatsChartsProps {
  stats: PlayerStatData[];
}

interface StatCardProps {
  value: string | number;
  label: string;
}

function StatCard({ value, label }: StatCardProps): ReactElement {
  return (
    <div className="rounded-card border border-white/[0.07] bg-surface-card p-4 text-center">
      <p className="text-2xl font-bold text-[#FAFAFA]">{value}</p>
      <p className="mt-1 text-xs text-[rgba(250,250,250,0.5)]">{label}</p>
    </div>
  );
}

export function StatsCharts({ stats }: StatsChartsProps): ReactElement {
  if (stats.length === 0) {
    return (
      <p className="text-sm text-[rgba(250,250,250,0.4)]">
        No match data yet. Stats will appear after your first recorded match.
      </p>
    );
  }

  const totalKills = stats.reduce((sum, s) => sum + s.kills, 0);
  const totalDeaths = stats.reduce((sum, s) => sum + s.deaths, 0);
  const totalPoints = stats.reduce((sum, s) => sum + s.points, 0);
  const mvpCount = stats.filter((s) => s.isMvp).length;
  const avgKd = totalDeaths === 0 ? totalKills : Number((totalKills / totalDeaths).toFixed(2));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard value={totalKills} label="Total kills" />
        <StatCard value={avgKd} label="Avg K/D" />
        <StatCard value={totalPoints} label="Total points" />
        <StatCard value={mvpCount} label="MVP count" />
      </div>

      <div className="rounded-card border border-white/[0.07] bg-surface-card p-4">
        <h3 className="mb-3 text-sm font-semibold text-[#FAFAFA]">K/D ratio over matches</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={stats}>
            <CartesianGrid stroke="rgba(255,255,255,0.07)" />
            <XAxis dataKey="matchLabel" stroke="#FAFAFA" fontSize={12} />
            <YAxis stroke="#FAFAFA" fontSize={12} />
            <Tooltip contentStyle={{ backgroundColor: '#111114', border: '1px solid rgba(255,255,255,0.07)' }} />
            <Line type="monotone" dataKey="kd" stroke="#8943F9" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-card border border-white/[0.07] bg-surface-card p-4">
        <h3 className="mb-3 text-sm font-semibold text-[#FAFAFA]">Kills per match</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={stats}>
            <CartesianGrid stroke="rgba(255,255,255,0.07)" />
            <XAxis dataKey="matchLabel" stroke="#FAFAFA" fontSize={12} />
            <YAxis stroke="#FAFAFA" fontSize={12} />
            <Tooltip contentStyle={{ backgroundColor: '#111114', border: '1px solid rgba(255,255,255,0.07)' }} />
            <Bar dataKey="kills" fill="#8943F9" opacity={0.8} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
