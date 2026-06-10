import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { tradeApi } from '../api';
import type { Rune, TradeItem } from '../types';

const ELEMENT_ICONS: Record<string, string> = {
  FIRE: '🔥', WATER: '💧', EARTH: '🌍', WIND: '🌪️',
  LIGHT: '☀️', DARK: '🌑', THUNDER: '⚡', ICE: '❄️'
};

export default function TradeMarket() {
  const { player, refreshPlayer } = useStore();
  const [trades, setTrades] = useState<TradeItem[]>([]);
  const [tab, setTab] = useState<'market' | 'sell'>('market');
  const [selectedRune, setSelectedRune] = useState<string | null>(null);
  const [price, setPrice] = useState(0);
  const [suggestion, setSuggestion] = useState<{ min: number; max: number; avg: number } | null>(null);
  const [filterElement, setFilterElement] = useState('all');

  const loadTrades = () => {
    tradeApi.list().then(setTrades);
  };

  useEffect(() => {
    loadTrades();
    const interval = setInterval(loadTrades, 5000);
    return () => clearInterval(interval);
  }, []);

  const selectRuneForSale = async (rune: Rune) => {
    setSelectedRune(rune.id);
    const sug = await tradeApi.getSuggestion(rune.element, rune.rarity);
    setSuggestion(sug);
    setPrice(sug.avg);
  };

  const listForSale = async () => {
    if (!player || !selectedRune || price <= 0) return;
    const result = await tradeApi.listRune(player.id, selectedRune, price);
    if (result.success) {
      setSelectedRune(null);
      setSuggestion(null);
      await refreshPlayer();
      loadTrades();
    }
  };

  const cancelSale = async (runeId: string) => {
    if (!player) return;
    const result = await tradeApi.cancel(player.id, runeId);
    if (result.success) {
      await refreshPlayer();
      loadTrades();
    }
  };

  const buyRune = async (runeId: string, price: number) => {
    if (!player || player.coins < price) return;
    const result = await tradeApi.buy(player.id, runeId);
    if (result.success) {
      await refreshPlayer();
      loadTrades();
    }
  };

  const myListings = (player?.runes || []).filter(r => r.listedForSale);
  const sellable = (player?.runes || []).filter(r => !r.listedForSale);
  const filteredTrades = trades.filter(t => filterElement === 'all' || t.rune.element === filterElement);

  return (
    <div>
      <div className="card mb-20">
        <div className="flex gap-10 mb-20">
          <button className={`btn ${tab === 'market' ? '' : 'btn-secondary'}`} onClick={() => setTab('market')}>
            🛒 交易市场
          </button>
          <button className={`btn ${tab === 'sell' ? '' : 'btn-secondary'}`} onClick={() => setTab('sell')}>
            📤 出售符文
          </button>
        </div>

        {tab === 'market' && (
          <div>
            <div className="flex justify-between items-center mb-20 flex-wrap gap-10">
              <div className="card-title" style={{ marginBottom: 0 }}>🛒 交易市场 ({filteredTrades.length})</div>
              <select className="input" value={filterElement} onChange={e => setFilterElement(e.target.value)}>
                <option value="all">全部元素</option>
                {['FIRE', 'WATER', 'EARTH', 'WIND', 'LIGHT', 'DARK', 'THUNDER', 'ICE'].map(e => (
                  <option key={e} value={e}>{ELEMENT_ICONS[e]} {e}</option>
                ))}
              </select>
            </div>

            {filteredTrades.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🛒</div>
                暂无出售中的符文
              </div>
            ) : (
              <div className="rune-grid">
                {filteredTrades.map(t => (
                  <div key={t.runeId} className={`rune-card rarity-${t.rune.rarity.toLowerCase()}`}>
                    <div className="rune-icon">{ELEMENT_ICONS[t.rune.element]}</div>
                    <div className="rune-name">{t.rune.name}</div>
                    <div className="rune-power">⚡ {t.rune.power}</div>
                    <div style={{ fontSize: 12, color: '#aabbcc' }}>卖家: {t.seller?.name}</div>
                    <div style={{ color: '#ffdd44', fontWeight: 'bold', margin: '8px 0' }}>
                      💰 {t.price.toLocaleString()}
                    </div>
                    {t.sellerId !== player?.id ? (
                      <button
                        className="btn btn-success"
                        style={{ padding: '8px 12px', fontSize: 12, width: '100%' }}
                        onClick={() => buyRune(t.runeId, t.price)}
                        disabled={!player || player.coins < t.price}
                      >
                        购买
                      </button>
                    ) : (
                      <button
                        className="btn btn-danger"
                        style={{ padding: '8px 12px', fontSize: 12, width: '100%' }}
                        onClick={() => cancelSale(t.runeId)}
                      >
                        取消上架
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'sell' && (
          <div>
            <div className="grid-2">
              <div>
                <div className="card-title">🎒 我的符文 (点击选择出售)</div>
                {sellable.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">📭</div>
                    没有可出售的符文
                  </div>
                ) : (
                  <div className="rune-grid">
                    {sellable.map((rune: Rune) => (
                      <div
                        key={rune.id}
                        className={`rune-card rarity-${rune.rarity.toLowerCase()} ${selectedRune === rune.id ? 'selected' : ''}`}
                        onClick={() => selectRuneForSale(rune)}
                      >
                        <div className="rune-icon">{ELEMENT_ICONS[rune.element]}</div>
                        <div className="rune-name">{rune.name}</div>
                        <div className="rune-power">⚡ {rune.power}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="card-title">💰 定价出售</div>
                {selectedRune ? (
                  <div>
                    {suggestion && (
                      <div style={{ background: 'rgba(102,68,255,0.1)', padding: 16, borderRadius: 12, marginBottom: 16 }}>
                        <h4 style={{ color: '#ffdd88', marginBottom: 10 }}>📊 系统定价建议（近7天）</h4>
                        <p>最低价: <span style={{ color: '#88ffaa' }}>{suggestion.min.toLocaleString()}</span></p>
                        <p>均价: <span style={{ color: '#ffdd44' }}>{suggestion.avg.toLocaleString()}</span></p>
                        <p>最高价: <span style={{ color: '#ff88aa' }}>{suggestion.max.toLocaleString()}</span></p>
                      </div>
                    )}
                    <div className="form-group">
                      <label className="label">出售价格（金币）</label>
                      <input
                        type="number"
                        className="input"
                        style={{ width: '100%' }}
                        value={price}
                        onChange={e => setPrice(parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <p style={{ fontSize: 12, color: '#8899bb' }}>
                      交易手续费: 5% | 实际收入: {Math.floor(price * 0.95).toLocaleString()}
                    </p>
                    <button className="btn btn-warning mt-10" style={{ width: '100%' }} onClick={listForSale} disabled={price <= 0}>
                      📤 上架出售
                    </button>
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-state-icon">👈</div>
                    请从左侧选择要出售的符文
                  </div>
                )}

                {myListings.length > 0 && (
                  <div className="mt-20">
                    <h4 style={{ marginBottom: 12 }}>📋 正在出售</h4>
                    {myListings.map((rune: Rune) => (
                      <div key={rune.id} className="flex justify-between items-center" style={{
                        padding: 12,
                        background: 'rgba(40,40,80,0.5)',
                        borderRadius: 8,
                        marginBottom: 8
                      }}>
                        <span>
                          {ELEMENT_ICONS[rune.element]} {rune.name} - 💰 {rune.price.toLocaleString()}
                        </span>
                        <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => cancelSale(rune.id)}>
                          取消
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
