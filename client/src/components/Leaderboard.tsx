import { useState, useEffect } from 'react';
import { statsApi, systemApi } from '../api';
import type { SeasonRank, SeasonInfo } from '../types';

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

export default function Leaderboard() {
  const [data, setData] = useState<any>(null);
  const [seasonInfo, setSeasonInfo] = useState<SeasonInfo | null>(null);
  const [tab, setTab] = useState<'rune' | 'battle' | 'guild'>('rune');

  useEffect(() => {
    statsApi.leaderboard().then(setData);
    systemApi.seasonInfo().then(setSeasonInfo).catch(() => {});
    const interval = setInterval(() => {
      statsApi.leaderboard().then(setData);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  if (!data) {
    return <div className="card loading">🏆 加载排行榜...</div>;
  }

  const rankClass = (i: number) => i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : '';
  const rankIcon = (i: number) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;

  const renderTable = (list: any[], columns: { key: string; label: string; render?: (row: any) => React.ReactNode }[]) => (
    <table className="table">
      <thead>
        <tr>
          <th style={{ width: 80 }}>排名</th>
          {columns.map(c => <th key={c.key}>{c.label}</th>)}
        </tr>
      </thead>
      <tbody>
        {list.map((item, i) => (
          <tr key={item.id}>
            <td className={rankClass(i)} style={{ fontWeight: 'bold', fontSize: 18 }}>
              {rankIcon(i)}
            </td>
            {columns.map(c => <td key={c.key}>{c.render ? c.render(item) : item[c.key]}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div>
      <div className="card mb-20">
        <div className="card-title">🏆 全服排行榜</div>
        <div className="flex gap-10 flex-wrap">
          <button
            className={`btn ${tab === 'rune' ? '' : 'btn-secondary'}`}
            onClick={() => setTab('rune')}
          >
            🎒 符文收藏榜
          </button>
          <button
            className={`btn ${tab === 'battle' ? '' : 'btn-secondary'}`}
            onClick={() => setTab('battle')}
          >
            ⚔️ 竞技积分榜
          </button>
          <button
            className={`btn ${tab === 'guild' ? '' : 'btn-secondary'}`}
            onClick={() => setTab('guild')}
          >
            🏰 公会贡献榜
          </button>
        </div>
        {seasonInfo && tab === 'battle' && (
          <div className="mt-4 p-3 rounded-xl bg-slate-800/50 flex items-center justify-between flex-wrap gap-3">
            <div className="text-sm text-slate-300">
              <span className="font-semibold text-white">段位规则：</span>
              <span className="ml-2">
                {seasonInfo.ranks.map((r, i) => (
                  <span key={r.id} className="mr-3" style={{ color: r.color }}>
                    {RANK_ICONS[r.id] || '🏆'} {r.name} ({r.minPoints}+)
                  </span>
                ))}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        {tab === 'rune' && renderTable(data.runeCollection || [], [
          { key: 'name', label: '玩家' },
          { key: 'value', label: '符文数量' },
          { key: 'uniqueCount', label: '稀有种类' }
        ])}
        {tab === 'battle' && renderTable(data.battlePoints || [], [
          { key: 'name', label: '玩家' },
          {
            key: 'rank',
            label: '段位',
            render: (row) => {
              if (!seasonInfo) return '-';
              const r = getRankInfo(row.value, seasonInfo.ranks);
              return (
                <span className="inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full text-sm"
                  style={{ backgroundColor: `${r.color}22`, color: r.color, border: `1px solid ${r.color}55` }}>
                  {RANK_ICONS[r.id] || '🏆'} {r.name}
                </span>
              );
            }
          },
          {
            key: 'value',
            label: '积分',
            render: (row) => <span className="font-bold text-yellow-300">{row.value}</span>
          },
          { key: 'wins', label: '胜场' },
          { key: 'losses', label: '负场' },
          {
            key: 'winRate',
            label: '胜率',
            render: (row) => {
              const total = (row.wins || 0) + (row.losses || 0);
              if (total === 0) return <span className="text-slate-500">0%</span>;
              const wr = ((row.wins || 0) * 100 / total).toFixed(1);
              return <span className={parseFloat(wr) >= 50 ? 'text-green-400' : 'text-red-400'}>{wr}%</span>;
            }
          }
        ])}
        {tab === 'guild' && renderTable(data.guildContribution || [], [
          { key: 'name', label: '公会' },
          { key: 'value', label: '总贡献' },
          { key: 'members', label: '成员数' },
          { key: 'level', label: '等级' }
        ])}
      </div>
    </div>
  );
}
