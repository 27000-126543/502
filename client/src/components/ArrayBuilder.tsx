import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { arrayApi } from '../api';
import type { Rune, ArrayResult } from '../types';
import ReactECharts from 'echarts-for-react';

const ELEMENT_ICONS: Record<string, string> = {
  FIRE: '🔥', WATER: '💧', EARTH: '🌍', WIND: '🌪️',
  LIGHT: '☀️', DARK: '🌑', THUNDER: '⚡', ICE: '❄️'
};

const MAX_SLOTS = 8;

export default function ArrayBuilder() {
  const { player } = useStore();
  const [slots, setSlots] = useState<(Rune | null)[]>(Array(MAX_SLOTS).fill(null));
  const [result, setResult] = useState<ArrayResult | null>(null);
  const [arrayName, setArrayName] = useState('');

  useEffect(() => {
    const runeIds = slots.filter(Boolean).map(s => s!.id);
    if (runeIds.length >= 2 && player) {
      arrayApi.calculate(runeIds, player.id).then(setResult);
    } else {
      setResult(null);
    }
  }, [slots, player]);

  const addRune = (rune: Rune) => {
    const idx = slots.findIndex(s => s === null);
    if (idx === -1) return;
    if (slots.some(s => s?.id === rune.id)) return;
    const newSlots = [...slots];
    newSlots[idx] = rune;
    setSlots(newSlots);
  };

  const removeRune = (idx: number) => {
    const newSlots = [...slots];
    newSlots[idx] = null;
    setSlots(newSlots);
  };

  const clearAll = () => setSlots(Array(MAX_SLOTS).fill(null));

  const availableRunes = (player?.runes || []).filter(r =>
    !slots.some(s => s?.id === r.id)
  );

  const radarOption = result && player?.radarData ? {
    tooltip: {},
    radar: {
      indicator: player.radarData.indicators.map((n: string, i: number) => ({
        name: n,
        max: 100
      })),
      splitArea: {
        areaStyle: {
          color: ['rgba(102,68,255,0.05)', 'rgba(102,68,255,0.1)']
        }
      }
    },
    series: [{
      type: 'radar',
      data: [{
        value: [
          Math.min(100, result.power / 100),
          Math.min(100, result.range),
          Math.min(100, result.duration / 1000),
          result.triggerChance * 100,
          result.resonance ? 100 : 0,
          result.backlash ? 30 : 100
        ],
        name: '当前阵法',
        areaStyle: { color: 'rgba(102,68,255,0.3)' },
        lineStyle: { color: '#6644ff' },
        itemStyle: { color: '#aa88ff' }
      }]
    }]
  } : null;

  return (
    <div>
      <div className="card mb-20">
        <div className="flex justify-between items-center flex-wrap gap-10">
          <div className="card-title" style={{ marginBottom: 0 }}>⚗️ 阵法构建台</div>
          <div className="flex gap-10">
            <input
              className="input"
              placeholder="阵法名称..."
              value={arrayName}
              onChange={e => setArrayName(e.target.value)}
            />
            <button className="btn btn-secondary" onClick={clearAll}>清除全部</button>
          </div>
        </div>

        <p style={{ color: '#8899bb', fontSize: 13, margin: '16px 0' }}>
          将符文按顺序放入阵法槽中（至少2个），系统自动计算阵法属性。特定元素组合会触发共鸣或反噬。
        </p>

        <div className="array-slot">
          {slots.map((rune, idx) => (
            <div
              key={idx}
              className={`slot ${rune ? 'filled' : ''}`}
              onClick={() => rune && removeRune(idx)}
              style={rune ? { borderColor: getComputedStyle(document.documentElement).getPropertyValue('--c') || '#6644ff' } : {}}
            >
              <div className="slot-number">{idx + 1}</div>
              {rune ? (
                <div style={{ textAlign: 'center', padding: 10 }}>
                  <div style={{ fontSize: 36 }}>{ELEMENT_ICONS[rune.element]}</div>
                  <div style={{ fontSize: 12, fontWeight: 'bold' }}>{rune.name}</div>
                </div>
              ) : (
                <span style={{ color: '#556688' }}>空槽</span>
              )}
            </div>
          ))}
        </div>

        {result && !result.error && (
          <div>
            <div className="array-result">
              <div className="result-item">
                <div className="result-label">⚡ 威力</div>
                <div className="result-value">{result.power.toLocaleString()}</div>
              </div>
              <div className="result-item">
                <div className="result-label">🎯 范围</div>
                <div className="result-value">{result.range}</div>
              </div>
              <div className="result-item">
                <div className="result-label">⏱️ 持续时间</div>
                <div className="result-value">{(result.duration / 1000).toFixed(1)}s</div>
              </div>
              <div className="result-item">
                <div className="result-label">💫 触发概率</div>
                <div className="result-value">{(result.triggerChance * 100).toFixed(1)}%</div>
              </div>
            </div>

            <div className="text-center mb-10">
              {result.resonance && (
                <span className="effect-badge effect-resonance">
                  ✨ 共鸣触发: {result.resonance.name} (威力×{result.resonance.powerBoost})
                </span>
              )}
              {result.backlash && (
                <span className="effect-badge effect-backlash">
                  💥 反噬触发: {result.backlash.name}
                </span>
              )}
            </div>

            <div style={{ maxWidth: 400, margin: '0 auto' }}>
              {radarOption && <ReactECharts option={radarOption} style={{ height: 300 }} />}
            </div>
          </div>
        )}

        {result?.error && (
          <div className="text-center" style={{ color: '#ff6666', padding: 20 }}>
            ⚠️ {result.error}
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title">🎒 可用符文 (点击添加到阵法)</div>
        {availableRunes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            没有可用的符文
          </div>
        ) : (
          <div className="rune-grid">
            {availableRunes.map((rune: Rune) => (
              <div
                key={rune.id}
                className={`rune-card rarity-${rune.rarity.toLowerCase()}`}
                onClick={() => addRune(rune)}
              >
                <div className="rune-icon">{ELEMENT_ICONS[rune.element]}</div>
                <div className="rune-name">{rune.name}</div>
                <div className="rune-power">⚡ {rune.power}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
