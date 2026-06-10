import React, { useEffect, useState } from 'react';
import { battleApi, playerApi, runeApi } from '../api';
import type { BattleReport as BR, Rune, SeasonRank, SeasonInfo } from '../types';
import { systemApi } from '../api';

const ELEMENT_COLORS: Record<string, string> = {
  FIRE: '#ef4444', WATER: '#3b82f6', EARTH: '#84cc16', WIND: '#22d3ee',
  THUNDER: '#a855f7', ICE: '#06b6d4', LIGHT: '#fbbf24', DARK: '#6b7280'
};

const RARITY_COLORS: Record<string, string> = {
  COMMON: '#9ca3af', UNCOMMON: '#22c55e', RARE: '#3b82f6',
  EPIC: '#a855f7', LEGENDARY: '#f59e0b'
};

const RARITY_NAMES: Record<string, string> = {
  COMMON: '普通', UNCOMMON: '精良', RARE: '稀有', EPIC: '史诗', LEGENDARY: '传说'
};

function formatTime(ms: number) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDuration(s: number) {
  const secs = Math.floor(s);
  const m = Math.floor(secs / 60);
  const ss = secs % 60;
  return `${m}分${ss}秒`;
}

function formatCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (d > 0) return `${d}天${h}小时`;
  if (h > 0) return `${h}小时${m}分`;
  return `${m}分`;
}

export function getRankInfo(points: number, ranks: SeasonRank[]) {
  for (let i = ranks.length - 1; i >= 0; i--) {
    if (points >= ranks[i].minPoints) return ranks[i];
  }
  return ranks[0];
}

interface ReportProps {
  reportId?: string;
  onClose: () => void;
  initialReport?: BR;
}

export default function BattleReportView({ reportId, onClose, initialReport }: ReportProps) {
  const [report, setReport] = useState<BR | null>(initialReport || null);
  const [loading, setLoading] = useState(!initialReport);
  const [seasonInfo, setSeasonInfo] = useState<SeasonInfo | null>(null);

  useEffect(() => {
    systemApi.seasonInfo().then(setSeasonInfo).catch(() => {});
  }, []);

  useEffect(() => {
    if (initialReport) return;
    if (!reportId) return;
    setLoading(true);
    battleApi.getReport(reportId).then(r => {
      setReport(r);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [reportId, initialReport]);

  if (loading) return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-slate-900 p-8 rounded-2xl text-white text-center">加载战报中...</div>
    </div>
  );
  if (!report) return null;

  const isWinner = report.winnerId === report.player1Id;
  const winnerName = isWinner ? report.player1Name : report.player2Name;
  const loserName = isWinner ? report.player2Name : report.player1Name;
  const winAdd = report.pointChange?.winAdd || 0;
  const loseDeduct = report.pointChange?.loseDeduct || 0;
  const energySnapshots = report.energySnapshots || [];
  const skillLogs = report.skillLogs || [];
  const events = report.events || [];
  const timestamp = report.timestamp || report.createdAt || Date.now();

  const renderRunes = (arr: any) => {
    if (!arr || !arr.runeIds) return null;
    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {arr.runeIds.map((rid: string, i: number) => (
          <span key={i} className="px-2 py-0.5 rounded bg-slate-700 text-xs">
            {rid.slice(0, 6)}
          </span>
        ))}
      </div>
    );
  };

  const renderResonanceBacklash = (r: any) => {
    if (!r) return null;
    const items = [];
    if (r.resonance?.triggered) {
      items.push(<span key="r" className="inline-block px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs mr-1">✨共鸣：{r.resonance.name}</span>);
    }
    if (r.backlash?.triggered) {
      items.push(<span key="b" className="inline-block px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 text-xs">💥反噬：{r.backlash.name}</span>);
    }
    if (items.length === 0) items.push(<span key="n" className="text-xs text-slate-400">无特殊效果</span>);
    return <div className="mt-1">{items}</div>;
  };

  const maxEnergy = Math.max(1, ...energySnapshots.map(s => Math.max(s.p1, s.p2)));
  const width = 480, height = 160;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-700 flex items-center justify-between sticky top-0 bg-slate-900 z-10">
          <div>
            <div className="text-2xl font-bold text-white flex items-center gap-3">
              {isWinner ? '🏆 胜利战报' : '💔 战败战报'}
              <span className="text-lg font-normal text-slate-400">#{report.id.slice(0, 8)}</span>
            </div>
            <div className="text-sm text-slate-400 mt-1">
              {new Date(report.createdAt).toLocaleString()} · 历时 {formatDuration(report.duration / 1000)}
            </div>
          </div>
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition">关闭</button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-5 rounded-xl border-2 ${isWinner ? 'bg-amber-950/30 border-amber-500' : 'bg-red-950/30 border-red-500'}`}>
              <div className="text-sm text-slate-300">我方 <span className={`ml-2 px-2 py-0.5 rounded text-xs ${isWinner ? 'bg-amber-500/30 text-amber-300' : 'bg-red-500/30 text-red-300'}`}>{isWinner ? '胜' : '败'}</span></div>
              <div className="text-2xl font-bold text-white mt-1">{report.player1Name}</div>
              <div className="mt-3 space-y-1 text-sm text-slate-300">
                <div>阵法：<span className="text-cyan-300 font-semibold">{report.player1Array?.name || '-'}</span></div>
                <div>威力: {report.player1ArrayResult?.power || 0} · 范围: {report.player1ArrayResult?.range || 0} · 持续: {report.player1ArrayResult?.duration || 0}</div>
                <div>触发率: {((report.player1ArrayResult?.triggerChance || 0) * 100).toFixed(0)}%</div>
                {renderResonanceBacklash(report.player1ArrayResult)}
                {renderRunes(report.player1Array)}
              </div>
              <div className={`mt-3 text-xl font-bold ${isWinner ? 'text-green-400' : 'text-red-400'}`}>
                {isWinner ? `+${winAdd}` : `-${loseDeduct}`} 赛季积分
              </div>
            </div>
            <div className={`p-5 rounded-xl border-2 ${!isWinner ? 'bg-amber-950/30 border-amber-500' : 'bg-red-950/30 border-red-500'}`}>
              <div className="text-sm text-slate-300">对手 <span className={`ml-2 px-2 py-0.5 rounded text-xs ${!isWinner ? 'bg-amber-500/30 text-amber-300' : 'bg-red-500/30 text-red-300'}`}>{!isWinner ? '胜' : '败'}</span></div>
              <div className="text-2xl font-bold text-white mt-1">{report.player2Name}</div>
              <div className="mt-3 space-y-1 text-sm text-slate-300">
                <div>阵法：<span className="text-cyan-300 font-semibold">{report.player2Array?.name || '-'}</span></div>
                <div>威力: {report.player2ArrayResult?.power || 0} · 范围: {report.player2ArrayResult?.range || 0} · 持续: {report.player2ArrayResult?.duration || 0}</div>
                <div>触发率: {((report.player2ArrayResult?.triggerChance || 0) * 100).toFixed(0)}%</div>
                {renderResonanceBacklash(report.player2ArrayResult)}
                {renderRunes(report.player2Array)}
              </div>
              <div className={`mt-3 text-xl font-bold ${!isWinner ? 'text-green-400' : 'text-red-400'}`}>
                {!isWinner ? `+${winAdd}` : `-${loseDeduct}`} 赛季积分
              </div>
            </div>
          </div>

          {energySnapshots.length > 1 && (
            <div className="p-5 rounded-xl bg-slate-800/50 border border-slate-700">
              <div className="text-lg font-semibold text-white mb-3">⚡ 能量变化曲线</div>
              <div className="flex justify-center">
                <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
                  <defs>
                    <linearGradient id="p1grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="p2grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {[0, 0.25, 0.5, 0.75, 1].map(p => (
                    <line key={p} x1="40" x2={width - 20} y1={height - 20 - (height - 40) * p} y2={height - 20 - (height - 40) * p} stroke="#334155" strokeDasharray="3 3" />
                  ))}
                  <polyline
                    fill="url(#p1grad)"
                    points={`40,${height - 20} ` + energySnapshots.map((s, i) => {
                      const x = 40 + (width - 60) * (i / (energySnapshots.length - 1));
                      const y = height - 20 - ((height - 40) * s.p1 / maxEnergy);
                      return `${x},${y}`;
                    }).join(' ') + ` ${width - 20},${height - 20}`}
                  />
                  <polyline
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    points={energySnapshots.map((s, i) => {
                      const x = 40 + (width - 60) * (i / (energySnapshots.length - 1));
                      const y = height - 20 - ((height - 40) * s.p1 / maxEnergy);
                      return `${x},${y}`;
                    }).join(' ')}
                  />
                  <polyline
                    fill="url(#p2grad)"
                    points={`40,${height - 20} ` + energySnapshots.map((s, i) => {
                      const x = 40 + (width - 60) * (i / (energySnapshots.length - 1));
                      const y = height - 20 - ((height - 40) * s.p2 / maxEnergy);
                      return `${x},${y}`;
                    }).join(' ') + ` ${width - 20},${height - 20}`}
                  />
                  <polyline
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="2"
                    points={energySnapshots.map((s, i) => {
                      const x = 40 + (width - 60) * (i / (energySnapshots.length - 1));
                      const y = height - 20 - ((height - 40) * s.p2 / maxEnergy);
                      return `${x},${y}`;
                    }).join(' ')}
                  />
                  <text x="50" y="15" fill="#3b82f6" fontSize="12">● {report.player1Name}</text>
                  <text x="180" y="15" fill="#ef4444" fontSize="12">● {report.player2Name}</text>
                </svg>
              </div>
            </div>
          )}

          {skillLogs.length > 0 && (
            <div className="p-5 rounded-xl bg-slate-800/50 border border-slate-700">
              <div className="text-lg font-semibold text-white mb-3">💫 技能释放记录</div>
              <div className="space-y-2">
                {skillLogs.map((log, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-slate-700/40">
                    <span className="text-xs text-slate-400 font-mono w-16 shrink-0">{formatTime(log.timestamp - timestamp)}</span>
                    <div className="flex-1 text-sm">
                      <span className="text-cyan-300 font-semibold">{log.casterName}</span>
                      <span className="text-slate-300"> 释放 </span>
                      <span className="text-amber-300 font-semibold">【{log.skillName}】</span>
                      <span className="text-slate-400"> {log.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-5 rounded-xl bg-slate-800/50 border border-slate-700">
            <div className="text-lg font-semibold text-white mb-3">📜 战斗时间线</div>
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-2">
              {events.map((e, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-xs text-slate-500 font-mono w-16 shrink-0 pt-0.5">{formatTime(e.timestamp - timestamp)}</span>
                  <span className="text-slate-200 flex-1">{e.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 rounded-xl bg-gradient-to-r from-amber-950/40 to-cyan-950/40 border border-amber-700/50">
            <div className="text-lg font-semibold text-white mb-3">🎁 奖励结算</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/60 rounded-lg p-4">
                <div className="text-xs text-slate-400">我方获得金币</div>
                <div className="text-2xl font-bold text-yellow-300 mt-1">{report.rewards?.coins || 0} 💰</div>
              </div>
              <div className="bg-slate-800/60 rounded-lg p-4">
                <div className="text-xs text-slate-400">符文掉落</div>
                <div className="mt-1">
                  {report.rewards?.rune ? (
                    <div className="inline-block px-3 py-1 rounded text-sm font-semibold"
                      style={{ backgroundColor: `${RARITY_COLORS[report.rewards.rune.rarity] || '#9ca3af'}30`, color: RARITY_COLORS[report.rewards.rune.rarity] || '#fff' }}>
                      <span style={{ color: ELEMENT_COLORS[report.rewards.rune.element] }}>●</span> {report.rewards.rune.name}
                      <span className="text-xs ml-2 opacity-75">{RARITY_NAMES[report.rewards.rune.rarity]}</span>
                    </div>
                  ) : (
                    <span className="text-slate-500 text-sm">本次战斗未掉落符文</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {seasonInfo && (
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700 text-sm text-slate-400 text-center">
              ⏳ 赛季剩余时间：<span className="text-white font-semibold">{formatCountdown(seasonInfo.seasonEndTimestamp - Date.now())}</span>
              · 结算后段位奖励将通过邮件发放
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
