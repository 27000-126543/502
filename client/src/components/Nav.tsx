import { useState, useEffect } from 'react';
import type { Player, SeasonInfo, SeasonRank } from '../types';
import { systemApi } from '../api';

interface NavProps {
  player: Player;
  currentView: string;
  onChangeView: (v: string) => void;
  onLogout: () => void;
  runeStorm: any;
}

const MENU = [
  { id: 'home', label: '🏠 主页' },
  { id: 'bag', label: '🎒 符文背包' },
  { id: 'array', label: '⚗️ 阵法构建台' },
  { id: 'battle', label: '⚔️ 竞技联赛' },
  { id: 'trade', label: '💰 交易市场' },
  { id: 'guild', label: '🏰 公会' },
  { id: 'stats', label: '📊 研究报告' },
  { id: 'leaderboard', label: '🏆 排行榜' }
];

const RANK_ICONS: Record<string, string> = {
  BRONZE: '🥉', SILVER: '🥈', GOLD: '🥇',
  PLATINUM: '💎', DIAMOND: '🔷', MASTER: '👑'
};

function getRankInfo(points: number, ranks: SeasonRank[]) {
  for (let i = ranks.length - 1; i >= 0; i--) {
    if (points >= ranks[i].minPoints) return ranks[i];
  }
  return ranks[0];
}

export default function Nav({ player, currentView, onChangeView, onLogout }: NavProps) {
  const [seasonInfo, setSeasonInfo] = useState<SeasonInfo | null>(null);

  useEffect(() => {
    systemApi.seasonInfo().then(setSeasonInfo).catch(() => {});
  }, []);

  const points = player?.battlePoints || 0;
  const wins = player?.battleWins || 0;
  const losses = player?.battleLosses || 0;
  const winRate = wins + losses > 0 ? (wins * 100 / (wins + losses)).toFixed(1) : '0.0';
  const rank = seasonInfo ? getRankInfo(points, seasonInfo.ranks) : null;

  return (
    <div className="nav">
      <div className="nav-title" onClick={() => onChangeView('home')}>
        🔮 符文阵法世界
      </div>
      <div className="nav-menu">
        {MENU.map(m => (
          <button
            key={m.id}
            className={`nav-btn ${currentView === m.id ? 'active' : ''}`}
            onClick={() => onChangeView(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="player-info">
        {rank && (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-semibold"
            style={{
              backgroundColor: `${rank.color}22`,
              color: rank.color,
              border: `1px solid ${rank.color}55`,
              marginRight: 8
            }}
            title={`赛季段位：${rank.name}（积分 ${points} / 胜率 ${winRate}%）`}
          >
            {RANK_ICONS[rank.id] || '🏆'} {rank.name}
            <span className="text-xs opacity-80 ml-1">⭐{points}</span>
          </span>
        )}
        <span>👤 {player.name}</span>
        <span className="coin-display">💰 {player.coins.toLocaleString()}</span>
        <span className="points-display" style={{ display: rank ? 'none' : 'inline-block' }}>⭐ {points}</span>
        <span>🎯 {wins}胜{losses}负</span>
        <span className="text-xs opacity-70" style={{ color: '#aabbcc' }}>{winRate}%</span>
        <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={onLogout}>
          退出
        </button>
      </div>
    </div>
  );
}
