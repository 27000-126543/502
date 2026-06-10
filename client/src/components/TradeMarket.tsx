import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { tradeApi } from '../api';
import type { Rune, TradeItem, ArrayData, ArrayTradeItem } from '../types';

const ELEMENT_ICONS: Record<string, string> = {
  FIRE: '🔥', WATER: '💧', EARTH: '🌍', WIND: '🌪️',
  LIGHT: '☀️', DARK: '🌑', THUNDER: '⚡', ICE: '❄️'
};

export default function TradeMarket() {
  const { player, refreshPlayer } = useStore();
  const [trades, setTrades] = useState<TradeItem[]>([]);
  const [arrayTrades, setArrayTrades] = useState<ArrayTradeItem[]>([]);
  const [tab, setTab] = useState<'market' | 'sell'>('market');
  const [sellType, setSellType] = useState<'rune' | 'array'>('rune');
  const [marketType, setMarketType] = useState<'rune' | 'array'>('rune');
  const [selectedRune, setSelectedRune] = useState<string | null>(null);
  const [selectedArray, setSelectedArray] = useState<string | null>(null);
  const [price, setPrice] = useState<number>(0);
  const [suggestion, setSuggestion] = useState<{ min: number; max: number; avg: number } | null>(null);
  const [filterElement, setFilterElement] = useState('all');
  const [loading, setLoading] = useState(false);

  const loadTrades = () => {
    tradeApi.list().then(setTrades);
    tradeApi.listArrays().then(setArrayTrades);
  };

  useEffect(() => {
    loadTrades();
    const interval = setInterval(loadTrades, 5000);
    return () => clearInterval(interval);
  }, []);

  const selectRuneForSale = async (rune: Rune) => {
    setSelectedRune(rune.id);
    setSelectedArray(null);
    setLoading(true);
    try {
      const sug = await tradeApi.getSuggestion(rune.element, rune.rarity);
      const safeSug = {
        min: sug?.min || 100,
        max: sug?.max || 150,
        avg: sug?.avg || 100
      };
      setSuggestion(safeSug);
      setPrice(safeSug.avg);
    } catch (e) {
      const fallback = { min: 100, max: 150, avg: 100 };
      setSuggestion(fallback);
      setPrice(fallback.avg);
    } finally {
      setLoading(false);
    }
  };

  const selectArrayForSale = async (array: ArrayData) => {
    setSelectedArray(array.id);
    setSelectedRune(null);
    setLoading(true);
    try {
      const sug = await tradeApi.getArraySuggestion(array.power || 1000, array.totalRunes || 4);
      const safeSug = {
        min: sug?.min || 1000,
        max: sug?.max || 1500,
        avg: sug?.avg || 1000
      };
      setSuggestion(safeSug);
      setPrice(safeSug.avg);
    } catch (e) {
      const fallback = { min: 1000, max: 1500, avg: 1000 };
      setSuggestion(fallback);
      setPrice(fallback.avg);
    } finally {
      setLoading(false);
    }
  };

  const listForSale = async () => {
    if (!player || price <= 0) return;
    if (selectedRune) {
      const result = await tradeApi.listRune(player.id, selectedRune, price);
      if (result.success) {
        setSelectedRune(null);
        setSuggestion(null);
        setPrice(0);
        await refreshPlayer();
        loadTrades();
      }
    } else if (selectedArray) {
      const result = await tradeApi.listArray(player.id, selectedArray, price);
      if (result.success) {
        setSelectedArray(null);
        setSuggestion(null);
        setPrice(0);
        await refreshPlayer();
        loadTrades();
      }
    }
  };

  const cancelSale = async (runeId: string, type: 'rune' | 'array' = 'rune') => {
    if (!player) return;
    let result;
    if (type === 'rune') {
      result = await tradeApi.cancel(player.id, runeId);
    } else {
      result = await tradeApi.cancelArray(player.id, runeId);
    }
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

  const buyArray = async (arrayId: string, price: number) => {
    if (!player || player.coins < price) return;
    const result = await tradeApi.buyArray(player.id, arrayId);
    if (result.success) {
      await refreshPlayer();
      loadTrades();
    }
  };

  const myRuneListings = (player?.runes || []).filter(r => r.listedForSale);
  const myArrayListings = (player?.arrays || []).filter(a => a.listedForSale);
  const sellableRunes = (player?.runes || []).filter(r => !r.listedForSale);
  const sellableArrays = (player?.arrays || []).filter(a => !a.listedForSale);
  const filteredTrades = trades.filter(t => filterElement === 'all' || t.rune.element === filterElement);

  const displayPrice = price || 0;

  return (
    <div>
      <div className="card mb-20">
        <div className="flex gap-10 mb-20 flex-wrap">
          <button className={`btn ${tab === 'market' ? '' : 'btn-secondary'}`} onClick={() => { setTab('market'); setSelectedRune(null); setSelectedArray(null); }}>
            🛒 交易市场
          </button>
          <button className={`btn ${tab === 'sell' ? '' : 'btn-secondary'}`} onClick={() => { setTab('sell'); setSelectedRune(null); setSelectedArray(null); }}>
            📤 出售
          </button>
        </div>

        {tab === 'market' && (
          <div>
            <div className="flex justify-between items-center mb-20 flex-wrap gap-10">
              <div className="flex gap-10">
                <button className={`btn ${marketType === 'rune' ? '' : 'btn-secondary'}`} onClick={() => setMarketType('rune')}>
                  � 符文石
                </button>
                <button className={`btn ${marketType === 'array' ? '' : 'btn-secondary'}`} onClick={() => setMarketType('array')}>
                  📜 法阵阵图
                </button>
              </div>
              {marketType === 'rune' && (
                <select className="input" value={filterElement} onChange={e => setFilterElement(e.target.value)}>
                  <option value="all">全部元素</option>
                  {['FIRE', 'WATER', 'EARTH', 'WIND', 'LIGHT', 'DARK', 'THUNDER', 'ICE'].map(e => (
                    <option key={e} value={e}>{ELEMENT_ICONS[e]} {e}</option>
                  ))}
                </select>
              )}
            </div>

            {marketType === 'rune' && (
              <div>
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
                            onClick={() => cancelSale(t.runeId, 'rune')}
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

            {marketType === 'array' && (
              <div>
                {arrayTrades.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">📜</div>
                    暂无出售中的阵图
                  </div>
                ) : (
                  <div className="rune-grid">
                    {arrayTrades.map((t: any) => (
                      <div key={t.arrayId} className="rune-card rarity-epic" style={{ borderColor: '#ffaa44', color: '#ffaa44' }}>
                        <div className="rune-icon">📜</div>
                        <div className="rune-name">{t.array.name}</div>
                        <div className="rune-power">⚡ 威力: {t.array.power}</div>
                        <div className="rune-power">🎯 符文数: {t.array.totalRunes || t.array.runeIds.length}</div>
                        <div style={{ fontSize: 12, color: '#aabbcc' }}>卖家: {t.seller?.name}</div>
                        {t.array.resonance && (
                          <div className="effect-badge effect-resonance mt-10" style={{ fontSize: 10 }}>
                            ✨ {t.array.resonance.name}
                          </div>
                        )}
                        <div style={{ color: '#ffdd44', fontWeight: 'bold', margin: '8px 0' }}>
                          💰 {t.price.toLocaleString()}
                        </div>
                        {t.sellerId !== player?.id ? (
                          <button
                            className="btn btn-success"
                            style={{ padding: '8px 12px', fontSize: 12, width: '100%' }}
                            onClick={() => buyArray(t.arrayId, t.price)}
                            disabled={!player || player.coins < t.price}
                          >
                            购买
                          </button>
                        ) : (
                          <button
                            className="btn btn-danger"
                            style={{ padding: '8px 12px', fontSize: 12, width: '100%' }}
                            onClick={() => cancelSale(t.arrayId, 'array')}
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
          </div>
        )}

        {tab === 'sell' && (
          <div>
            <div className="flex gap-10 mb-20">
              <button className={`btn ${sellType === 'rune' ? '' : 'btn-secondary'}`} onClick={() => { setSellType('rune'); setSelectedRune(null); setSelectedArray(null); setSuggestion(null); }}>
                💎 出售符文
              </button>
              <button className={`btn ${sellType === 'array' ? '' : 'btn-secondary'}`} onClick={() => { setSellType('array'); setSelectedRune(null); setSelectedArray(null); setSuggestion(null); }}>
                📜 出售阵图
              </button>
            </div>

            <div className="grid-2">
              <div>
                <div className="card-title">
                  {sellType === 'rune' ? '🎒 我的符文 (点击选择出售)' : '📜 我的阵法 (点击选择出售)'}
                </div>
                {sellType === 'rune' && (
                  <div>
                    {sellableRunes.length === 0 ? (
                      <div className="empty-state">
                        <div className="empty-state-icon">📭</div>
                        没有可出售的符文
                      </div>
                    ) : (
                      <div className="rune-grid">
                        {sellableRunes.map((rune: Rune) => (
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
                )}

                {sellType === 'array' && (
                  <div>
                    {sellableArrays.length === 0 ? (
                      <div className="empty-state">
                        <div className="empty-state-icon">📭</div>
                        没有可出售的阵法，请先在阵法台构建并保存阵法
                      </div>
                    ) : (
                      <div className="rune-grid">
                        {sellableArrays.map((array: ArrayData) => (
                          <div
                            key={array.id}
                            className={`rune-card rarity-epic ${selectedArray === array.id ? 'selected' : ''}`}
                            style={{ borderColor: '#ffaa44', color: '#ffaa44' }}
                            onClick={() => selectArrayForSale(array)}
                          >
                            <div className="rune-icon">�</div>
                            <div className="rune-name">{array.name}</div>
                            <div className="rune-power">⚡ {array.power}</div>
                            <div className="rune-power">🎯 {(array.totalRunes || array.runeIds.length)}个符文</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <div className="card-title">�💰 定价出售</div>
                {(selectedRune || selectedArray) ? (
                  <div>
                    {loading && <div className="loading">获取定价建议中...</div>}
                    {!loading && suggestion && (
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
                        value={displayPrice}
                        onChange={e => setPrice(parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <p style={{ fontSize: 12, color: '#8899bb' }}>
                      交易手续费: 5% | 实际收入: {Math.floor(displayPrice * 0.95).toLocaleString()}
                    </p>
                    <button
                      className="btn btn-warning mt-10"
                      style={{ width: '100%' }}
                      onClick={listForSale}
                      disabled={displayPrice <= 0 || loading}
                    >
                      📤 上架出售
                    </button>
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-state-icon">👈</div>
                    请从左侧选择要出售的{sellType === 'rune' ? '符文' : '阵法'}
                  </div>
                )}

                {(myRuneListings.length > 0 && sellType === 'rune') && (
                  <div className="mt-20">
                    <h4 style={{ marginBottom: 12 }}>📋 正在出售的符文</h4>
                    {myRuneListings.map((rune: Rune) => (
                      <div key={rune.id} className="flex justify-between items-center" style={{
                        padding: 12,
                        background: 'rgba(40,40,80,0.5)',
                        borderRadius: 8,
                        marginBottom: 8
                      }}>
                        <span>
                          {ELEMENT_ICONS[rune.element]} {rune.name} - 💰 {rune.price.toLocaleString()}
                        </span>
                        <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => cancelSale(rune.id, 'rune')}>
                          取消
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {(myArrayListings.length > 0 && sellType === 'array') && (
                  <div className="mt-20">
                    <h4 style={{ marginBottom: 12 }}>📋 正在出售的阵图</h4>
                    {myArrayListings.map((array: ArrayData) => (
                      <div key={array.id} className="flex justify-between items-center" style={{
                        padding: 12,
                        background: 'rgba(40,40,80,0.5)',
                        borderRadius: 8,
                        marginBottom: 8
                      }}>
                        <span>
                          📜 {array.name} - 💰 {array.price?.toLocaleString()}
                        </span>
                        <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => cancelSale(array.id, 'array')}>
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
