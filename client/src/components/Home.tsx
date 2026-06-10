import { useState, useEffect } from 'react';
import { useStore } from '../store';
import type { SeasonInfo } from '../types';
import { systemApi } from '../api';

interface HomeProps {
  constants: any;
  announcements: any[];
}

const ELEMENT_ICONS: Record<string, string> = {
  FIRE: '🔥', WATER: '💧', EARTH: '🌍', WIND: '🌪️',
  LIGHT: '☀️', DARK: '🌑', THUNDER: '⚡', ICE: '❄️'
};

function getRankInfo(points: number, ranks: any[]) {
  for (let i = ranks.length - 1; i >= 0; i--) {
    if (points >= ranks[i].minPoints) return ranks[i];
  }
  return ranks[0];
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

export default function Home({ constants, announcements }: HomeProps) {
  const { player, setCurrentView } = useStore();
  const [seasonInfo, setSeasonInfo] = useState<SeasonInfo | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    systemApi.seasonInfo().then(setSeasonInfo).catch(() => {});
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  const points = player?.battlePoints || 0;
  const wins = player?.battleWins || 0;
  const losses = player?.battleLosses || 0;
  const winRate = wins + losses > 0 ? (wins * 100 / (wins + losses)).toFixed(1) : '0.0';
  const rank = seasonInfo ? getRankInfo(points, seasonInfo.ranks) : null;
  const nextRank = rank && seasonInfo ? seasonInfo.ranks[seasonInfo.ranks.indexOf(rank) + 1] : null;
  const progress = rank && nextRank
    ? Math.min(100, (points - rank.minPoints) * 100 / Math.max(1, nextRank.minPoints - rank.minPoints))
    : rank
      ? ((points - rank.minPoints) * 100 / Math.max(1, rank.maxPoints - rank.minPoints))
      : 0;

  return (
    <div>
      <div className="card mb-20" style={{
        background: rank ? `linear-gradient(135deg, ${rank.color}22, #0f172a, ${rank.color}11)` : undefined,
        border: rank ? `1px solid ${rank.color}44` : undefined
      }}>
        <div className="card-title">🏆 当前赛季段位</div>
        <div className="grid-3 gap-4">
          <div className="text-center p-4 rounded-xl bg-slate-800/50">
            {rank ? (
              <>
                <div className="text-xs text-slate-400 mb-1">段位</div>
                <div className="text-3xl font-bold flex items-center justify-center gap-2" style={{ color: rank.color }}>
                  🏆 {rank.name}
                </div>
              </>
            ) : (
              <>
                <div className="text-xs text-slate-400 mb-1">竞技积分</div>
                <div className="text-3xl font-bold text-yellow-400">{points}</div>
              </>
            )}
          </div>
          <div className="text-center p-4 rounded-xl bg-slate-800/50">
            <div className="text-xs text-slate-400 mb-1">积分 / 胜率</div>
            <div className="text-2xl font-bold text-white">
              {points} <span className="text-base text-slate-400">·</span> <span className="text-cyan-300">{winRate}%</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">{wins}胜 / {losses}负</div>
            {rank && (
              <div className="mt-3">
                <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: rank.color }} />
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {nextRank ? `距离 ${nextRank.name} 还差 ${nextRank.minPoints - points} 分` : '已达最高段位，冲刺排行榜！'}
                </div>
              </div>
            )}
          </div>
          <div className="text-center p-4 rounded-xl bg-slate-800/50">
            <div className="text-xs text-slate-400 mb-1">赛季结算倒计时</div>
            <div className="text-2xl font-bold text-amber-300">
              {seasonInfo ? formatCountdown(seasonInfo.seasonEndTimestamp - now) : '--'}
            </div>
            <button
              className="btn btn-warning mt-3"
              style={{ padding: '8px 16px', fontSize: 13 }}
              onClick={() => setCurrentView('battle')}
            >
              ⚔️ 去打比赛
            </button>
          </div>
        </div>
      </div>

      <div className="grid-3 mb-20">
        <div className="card stats-card">
          <div className="stats-value">{player?.runes?.length || 0}</div>
          <div className="stats-label">🎒 符文收藏</div>
        </div>
        <div className="card stats-card">
          <div className="stats-value">{player?.arrays?.length || 0}</div>
          <div className="stats-label">⚗️ 已构建阵法</div>
        </div>
        <div className="card stats-card">
          <div className="stats-value">{player?.coins || 0}</div>
          <div className="stats-label">💰 金币余额</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-title">✨ 八大元素符文</div>
          <div className="grid-3">
            {constants?.ELEMENTS && Object.entries(constants.ELEMENTS).map(([key, e]: any) => (
              <div key={key} style={{
                padding: 16,
                background: `linear-gradient(135deg, ${e.color}22, transparent)`,
                borderRadius: 12,
                textAlign: 'center',
                border: `1px solid ${e.color}44`
              }}>
                <div style={{ fontSize: 36 }}>{ELEMENT_ICONS[key]}</div>
                <div style={{ color: e.color, fontWeight: 'bold' }}>{e.name}</div>
                <div style={{ fontSize: 12, color: '#8899bb' }}>基础威力 {e.basePower}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-title">📢 全服公告</div>
          {announcements.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              暂无公告
            </div>
          ) : (
            announcements.slice(0, 10).map((a, i) => (
              <div key={i} className="announcement" style={{ margin: '8px 0' }}>
                {a.text}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="grid-2 mt-20">
        <div className="card">
          <div className="card-title">⚡ 快捷入口</div>
          <div className="grid-2">
            <button className="btn" onClick={() => setCurrentView('bag')}>
              🎒 查看符文背包
            </button>
            <button className="btn" onClick={() => setCurrentView('array')}>
              ⚗️ 构建魔法阵法
            </button>
            <button className="btn btn-warning" onClick={() => setCurrentView('battle')}>
              ⚔️ 参加竞技联赛
            </button>
            <button className="btn btn-success" onClick={() => setCurrentView('trade')}>
              💰 符文交易市场
            </button>
            <button className="btn btn-secondary" onClick={() => setCurrentView('guild')}>
              🏰 公会系统
            </button>
            <button className="btn btn-secondary" onClick={() => setCurrentView('stats')}>
              📊 查看研究报告
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-title">💡 游戏指南</div>
          <div style={{ lineHeight: 1.8, color: '#aabbcc', fontSize: 14 }}>
            <p>1. 在<strong>符文背包</strong>查看和管理你收集的符文石</p>
            <p>2. 在<strong>阵法构建台</strong>排列符文，系统自动计算阵法属性</p>
            <p>3. 特定元素组合会触发<strong>共鸣效果</strong>（火+风=烈焰风暴等）大幅增强威力</p>
            <p>4. 对立元素同时使用可能触发<strong>反噬效果</strong>削弱阵法</p>
            <p>5. 在<strong>竞技联赛</strong>匹配对手，实时对战赢取稀有符文</p>
            <p>6. 在<strong>交易市场</strong>购买出售符文和阵图，参考系统价格建议</p>
            <p>7. 加入<strong>公会</strong>共同升级阵法塔和符文工坊</p>
            <p>8. 每周<strong>研究报告</strong>展示元素使用率和价格走势</p>
          </div>
        </div>
      </div>
    </div>
  );
}
