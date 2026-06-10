import { useStore } from '../store';
import type { Player } from '../types';

interface HomeProps {
  constants: any;
  announcements: any[];
}

const ELEMENT_ICONS: Record<string, string> = {
  FIRE: '🔥', WATER: '💧', EARTH: '🌍', WIND: '🌪️',
  LIGHT: '☀️', DARK: '🌑', THUNDER: '⚡', ICE: '❄️'
};

export default function Home({ constants, announcements }: HomeProps) {
  const { player, setCurrentView, refreshPlayer } = useStore();

  return (
    <div>
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
          <div className="stats-value">{player?.battlePoints || 0}</div>
          <div className="stats-label">⭐ 竞技积分</div>
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
            <p>3. 特定元素组合会触发<strong>共鸣效果</strong>大幅增强威力</p>
            <p>4. 对立元素同时使用可能触发<strong>反噬效果</strong>削弱阵法</p>
            <p>5. 在<strong>竞技联赛</strong>匹配对手，实时对战赢取稀有符文</p>
            <p>6. 在<strong>交易市场</strong>购买出售符文，参考系统价格建议</p>
            <p>7. 加入<strong>公会</strong>共同升级阵法塔和符文工坊</p>
            <p>8. 每周<strong>研究报告</strong>展示元素使用率和价格走势</p>
          </div>
        </div>
      </div>
    </div>
  );
}
