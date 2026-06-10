import { useState, useEffect } from 'react';
import { statsApi } from '../api';

export default function Leaderboard() {
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<'rune' | 'battle' | 'guild'>('rune');

  useEffect(() => {
    statsApi.leaderboard().then(setData);
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

  const renderTable = (list: any[], columns: { key: string; label: string }[]) => (
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
            {columns.map(c => <td key={c.key}>{item[c.key]}</td>)}
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
      </div>

      <div className="card">
        {tab === 'rune' && renderTable(data.runeCollection || [], [
          { key: 'name', label: '玩家' },
          { key: 'value', label: '符文数量' },
          { key: 'uniqueCount', label: '稀有种类' }
        ])}
        {tab === 'battle' && renderTable(data.battlePoints || [], [
          { key: 'name', label: '玩家' },
          { key: 'value', label: '积分' },
          { key: 'wins', label: '胜场' },
          { key: 'losses', label: '负场' }
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
