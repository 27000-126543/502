import type { Player } from '../types';

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

export default function Nav({ player, currentView, onChangeView, onLogout }: NavProps) {
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
        <span>👤 {player.name}</span>
        <span className="coin-display">💰 {player.coins.toLocaleString()}</span>
        <span className="points-display">⭐ {player.battlePoints}</span>
        <span>🎯 {player.battleWins}胜 {player.battleLosses}负</span>
        <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={onLogout}>
          退出
        </button>
      </div>
    </div>
  );
}
