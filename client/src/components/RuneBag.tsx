import { useState, useMemo } from 'react';
import { useStore } from '../store';
import { arrayApi } from '../api';
import type { Rune } from '../types';

const ELEMENT_ICONS: Record<string, string> = {
  FIRE: '🔥', WATER: '💧', EARTH: '🌍', WIND: '🌪️',
  LIGHT: '☀️', DARK: '🌑', THUNDER: '⚡', ICE: '❄️'
};

export default function RuneBag() {
  const { player, refreshPlayer } = useStore();
  const [filterElement, setFilterElement] = useState<string>('all');
  const [filterRarity, setFilterRarity] = useState<string>('all');
  const [selectedForSynth, setSelectedForSynth] = useState<string[]>([]);
  const [showSynth, setShowSynth] = useState(false);
  const [synthResult, setSynthResult] = useState<any>(null);

  const runes = useMemo(() => {
    if (!player?.runes) return [];
    return player.runes.filter(r => {
      if (filterElement !== 'all' && r.element !== filterElement) return false;
      if (filterRarity !== 'all' && r.rarity !== filterRarity) return false;
      return true;
    });
  }, [player?.runes, filterElement, filterRarity]);

  const toggleSynth = (id: string) => {
    setSelectedForSynth(prev => {
      if (prev.includes(id)) return prev.filter(i => i !== id);
      if (prev.length >= 5) return prev;
      return [...prev, id];
    });
  };

  const doSynthesize = async () => {
    if (!player || selectedForSynth.length < 3) return;
    const result = await arrayApi.synthesize(selectedForSynth, player.id);
    setSynthResult(result);
    if (result.success) {
      setSelectedForSynth([]);
      setShowSynth(false);
      await refreshPlayer();
      setTimeout(() => setSynthResult(null), 5000);
    }
  };

  return (
    <div>
      <div className="card mb-20">
        <div className="flex justify-between items-center flex-wrap gap-10">
          <div className="card-title" style={{ marginBottom: 0 }}>
            🎒 符文背包 ({player?.runes?.length || 0})
          </div>
          <div className="flex gap-10 flex-wrap">
            <select className="input" value={filterElement} onChange={e => setFilterElement(e.target.value)}>
              <option value="all">全部元素</option>
              {['FIRE', 'WATER', 'EARTH', 'WIND', 'LIGHT', 'DARK', 'THUNDER', 'ICE'].map(e => (
                <option key={e} value={e}>{ELEMENT_ICONS[e]} {e}</option>
              ))}
            </select>
            <select className="input" value={filterRarity} onChange={e => setFilterRarity(e.target.value)}>
              <option value="all">全部稀有度</option>
              {['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'].map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <button className="btn btn-warning" onClick={() => setShowSynth(!showSynth)}>
              🔮 符文合成 {selectedForSynth.length > 0 ? `(${selectedForSynth.length})` : ''}
            </button>
          </div>
        </div>

        {showSynth && (
          <div className="card mt-20" style={{ background: 'rgba(50,30,70,0.8)' }}>
            <h4>🔮 符文合成</h4>
            <p style={{ fontSize: 13, color: '#aabbcc', margin: '10px 0' }}>
              选择3-5个符文进行合成，有几率获得更高稀有度的符文。公会工坊等级提升可增加成功率。
            </p>
            <p style={{ fontSize: 13, color: '#ffdd88', margin: '10px 0' }}>
              已选择: {selectedForSynth.length}/5
            </p>
            <div className="flex gap-10 mb-10">
              <button className="btn btn-success" onClick={doSynthesize} disabled={selectedForSynth.length < 3}>
                开始合成
              </button>
              <button className="btn btn-secondary" onClick={() => setSelectedForSynth([])}>
                清除选择
              </button>
            </div>
            {synthResult?.success && (
              <div className="effect-badge effect-resonance">
                🎉 合成成功！获得 {synthResult.rune?.name}
              </div>
            )}
            {synthResult?.error && (
              <div className="effect-badge effect-backlash">
                ❌ {synthResult.error}
              </div>
            )}
          </div>
        )}
      </div>

      {runes.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">🎒</div>
          暂无符合条件的符文
        </div>
      ) : (
        <div className="rune-grid">
          {runes.map((rune: Rune) => (
            <div
              key={rune.id}
              className={`rune-card rarity-${rune.rarity.toLowerCase()} ${selectedForSynth.includes(rune.id) ? 'selected' : ''}`}
              onClick={() => showSynth && toggleSynth(rune.id)}
            >
              <div className="rune-icon">{ELEMENT_ICONS[rune.element]}</div>
              <div className="rune-name">{rune.name}</div>
              <div className="rune-power">⚡ 威力: {rune.power}</div>
              <div className="rune-power">⏱️ 冷却: {(rune.cooldown / 1000).toFixed(1)}s</div>
              <div className="rune-skill">
                {rune.skill.name} ({rune.skill.type === 'damage' ? `${rune.skill.value}伤害` :
                  rune.skill.type === 'disrupt' ? `${rune.skill.value}秒干扰` :
                  rune.skill.type === 'shield' ? `${rune.skill.value}护盾` :
                  `${rune.skill.value}%威力`})
              </div>
              {rune.listedForSale && (
                <div style={{ marginTop: 8, color: '#88ff88', fontSize: 12, fontWeight: 'bold' }}>
                  💰 在售 {rune.price}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
