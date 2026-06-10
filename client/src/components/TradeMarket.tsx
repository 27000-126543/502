import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { tradeApi } from '../api';
import type { Rune, TradeItem, ArrayData, ArrayTradeItem, ArrayPriceHistory } from '../types';

const ELEMENT_ICONS: Record<string, string> = {
  FIRE: '🔥', WATER: '💧', EARTH: '🌍', WIND: '🌪️',
  LIGHT: '☀️', DARK: '🌑', THUNDER: '⚡', ICE: '❄️'
};

const ELEMENT_NAMES: Record<string, string> = {
  FIRE: '火', WATER: '水', EARTH: '土', WIND: '风',
  LIGHT: '光', DARK: '暗', THUNDER: '雷', ICE: '冰'
};

const ELEMENT_COLORS: Record<string, string> = {
  FIRE: '#ef4444', WATER: '#3b82f6', EARTH: '#84cc16', WIND: '#22d3ee',
  THUNDER: '#a855f7', ICE: '#06b6d4', LIGHT: '#fbbf24', DARK: '#6b7280'
};

function ArrayDetailModal({
  array,
  runeObjects,
  priceInfo,
  onClose,
  action,
  actionLabel,
  actionDisabled,
  onAction,
  showRuneDetails = true
}: {
  array: ArrayData;
  runeObjects?: Record<string, Rune>;
  priceInfo?: { price: number; fee: number; net: number; history: ArrayPriceHistory | null };
  onClose: () => void;
  action?: 'buy' | 'list';
  actionLabel?: string;
  actionDisabled?: boolean;
  onAction?: () => void;
  showRuneDetails?: boolean;
}) {
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-900 rounded-2xl border border-slate-700 max-w-3xl w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-700 flex items-center justify-between sticky top-0 bg-slate-900 z-10">
          <div className="flex items-center gap-2">
            <div className="text-3xl">📜</div>
            <div>
              <div className="text-xl font-bold text-white">{array.name}</div>
              <div className="text-xs text-slate-400">
                威力 {array.power} · 范围 {array.range} · 持续 {array.duration}
                {array.source === 'purchased' && <span className="ml-2 px-2 py-0.5 rounded bg-cyan-900/40 text-cyan-300">购买所得</span>}
                {array.source === 'created' && <span className="ml-2 px-2 py-0.5 rounded bg-amber-900/40 text-amber-300">自建阵法</span>}
              </div>
            </div>
          </div>
          <button className="px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm" onClick={onClose}>×关闭</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-slate-800/60 rounded-lg p-3 text-center">
              <div className="text-xs text-slate-400">⚡ 威力</div>
              <div className="text-xl font-bold text-yellow-300 mt-1">{array.power}</div>
            </div>
            <div className="bg-slate-800/60 rounded-lg p-3 text-center">
              <div className="text-xs text-slate-400">🎯 范围</div>
              <div className="text-xl font-bold text-blue-300 mt-1">{array.range}</div>
            </div>
            <div className="bg-slate-800/60 rounded-lg p-3 text-center">
              <div className="text-xs text-slate-400">⏱️ 持续</div>
              <div className="text-xl font-bold text-green-300 mt-1">{array.duration}</div>
            </div>
            <div className="bg-slate-800/60 rounded-lg p-3 text-center">
              <div className="text-xs text-slate-400">🔥 触发率</div>
              <div className="text-xl font-bold text-pink-300 mt-1">{((array.triggerChance || 0) * 100).toFixed(0)}%</div>
            </div>
          </div>

          <div className="bg-slate-800/40 rounded-lg p-4">
            <div className="text-sm font-semibold text-white mb-3">✨ 共鸣 / 反噬效果</div>
            <div className="flex flex-wrap gap-2">
              {array.resonance?.triggered ? (
                <div className="px-3 py-2 rounded-full bg-amber-500/20 text-amber-300 text-sm flex items-center gap-1">
                  ✨ 共鸣：<span className="font-bold">{array.resonance.name}</span>
                  <span className="text-xs opacity-75 ml-1">(威力 x{array.resonance.powerBoost})</span>
                </div>
              ) : (
                <div className="px-3 py-2 rounded-full bg-slate-700/40 text-slate-500 text-sm">✨ 无共鸣效果</div>
              )}
              {array.backlash?.triggered ? (
                <div className="px-3 py-2 rounded-full bg-red-500/20 text-red-300 text-sm flex items-center gap-1">
                  💥 反噬：<span className="font-bold">{array.backlash.name}</span>
                  <span className="text-xs opacity-75 ml-1">(威力 -{((array.backlash.powerReduction || 0) * 100).toFixed(0)}%)</span>
                </div>
              ) : (
                <div className="px-3 py-2 rounded-full bg-slate-700/40 text-slate-500 text-sm">💥 无反噬效果</div>
              )}
            </div>
          </div>

          {showRuneDetails && (
            <div className="bg-slate-800/40 rounded-lg p-4">
              <div className="text-sm font-semibold text-white mb-3">💎 符文组成 ({array.runeIds.length}个)</div>
              <div className="grid grid-cols-2 gap-2">
                {(() => {
                  const inlineRuneMap: Record<string, any> = {};
                  (array.runes || []).forEach((r: any) => { inlineRuneMap[r.id] = r; });
                  return array.runeIds.map(rid => {
                    const r = inlineRuneMap[rid] || runeObjects?.[rid];
                    const el = r?.element || '?';
                    return (
                    <div key={rid} className="flex items-center gap-2 p-2 rounded-lg bg-slate-700/40">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg shrink-0"
                        style={{ background: `${ELEMENT_COLORS[el] || '#666'}30` }}>
                        {ELEMENT_ICONS[el] || '❓'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white font-medium truncate">{r?.name || ELEMENT_NAMES[el] || '未知符文'}</div>
                        <div className="text-xs text-slate-400">
                          {ELEMENT_NAMES[el] || el} · ⚡{r?.power || '?'}
                        </div>
                      </div>
                    </div>
                  );
                  });
                })()}
              </div>
            </div>
          )}

          {array.elementDistribution && Object.keys(array.elementDistribution).length > 0 && (
            <div className="bg-slate-800/40 rounded-lg p-4">
              <div className="text-sm font-semibold text-white mb-3">🎨 元素分布</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(array.elementDistribution).map(([el, count]) => (
                  <div key={el} className="px-3 py-1.5 rounded-full text-sm"
                    style={{ background: `${ELEMENT_COLORS[el] || '#666'}25`, color: ELEMENT_COLORS[el] || '#fff', border: `1px solid ${ELEMENT_COLORS[el] || '#666'}44` }}>
                    {ELEMENT_ICONS[el]} {ELEMENT_NAMES[el] || el} ×{count as number}
                  </div>
                ))}
              </div>
            </div>
          )}

          {priceInfo && (
            <div className="bg-gradient-to-r from-amber-950/40 to-cyan-950/40 rounded-lg p-4 border border-amber-700/40">
              <div className="text-sm font-semibold text-white mb-3">💰 交易信息</div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-lg bg-slate-800/60">
                  <div className="text-xs text-slate-400">售价</div>
                  <div className="text-2xl font-bold text-yellow-300 mt-1">{priceInfo.price.toLocaleString()}</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-slate-800/60">
                  <div className="text-xs text-slate-400">手续费 (5%)</div>
                  <div className="text-2xl font-bold text-red-300 mt-1">-{priceInfo.fee.toLocaleString()}</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-slate-800/60">
                  <div className="text-xs text-slate-400">{action === 'list' ? '实际收入' : '支付金额'}</div>
                  <div className="text-2xl font-bold text-green-300 mt-1">{priceInfo.net.toLocaleString()}</div>
                </div>
              </div>
              {priceInfo.history && (
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <div className="text-xs text-slate-400 mb-2">📊 最近7天同类阵法成交</div>
                  {priceInfo.history.totalSales > 0 ? (
                    <>
                      <div className="flex gap-6 text-sm">
                        <span className="text-slate-300">均价：<span className="text-yellow-300 font-bold">{priceInfo.history.avgPrice.toLocaleString()}</span></span>
                        <span className="text-slate-300">最低：<span className="text-green-300 font-bold">{priceInfo.history.minPrice.toLocaleString()}</span></span>
                        <span className="text-slate-300">最高：<span className="text-red-300 font-bold">{priceInfo.history.maxPrice.toLocaleString()}</span></span>
                        <span className="text-slate-300">成交：<span className="text-cyan-300 font-bold">{priceInfo.history.totalSales}单</span></span>
                      </div>
                      {priceInfo.history.recent.length > 0 && (
                        <div className="mt-3 flex gap-1 items-end h-10">
                          {priceInfo.history.recent.map((t: any, i: number) => {
                            const max = Math.max(1, priceInfo.history!.maxPrice);
                            const h = Math.max(8, t.price / max * 100);
                            return (
                              <div key={i} className="flex-1 min-w-0 rounded-t bg-cyan-500/50 relative group cursor-pointer" style={{ height: `${h}%` }}>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-800 rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition z-10 pointer-events-none">
                                  {t.price.toLocaleString()}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-xs text-slate-500">暂无历史成交数据，建议参考系统定价建议</div>
                  )}
                </div>
              )}
            </div>
          )}

          {action && actionLabel && (
            <div>
              {!confirm ? (
                <button
                  className={`btn w-full py-4 text-lg font-bold ${action === 'buy' ? 'btn-success' : 'btn-warning'}`}
                  onClick={() => setConfirm(true)}
                  disabled={actionDisabled}
                >
                  {actionLabel}
                </button>
              ) : (
                <div className="p-4 rounded-xl bg-red-950/40 border border-red-700/50">
                  <div className="text-center text-sm text-red-300 mb-3">确认要{actionLabel}？</div>
                  <div className="flex gap-2">
                    <button className="btn flex-1 btn-secondary" onClick={() => setConfirm(false)}>取消</button>
                    <button className={`btn flex-1 ${action === 'buy' ? 'btn-success' : 'btn-warning'}`} onClick={onAction}>确认{action === 'buy' ? '购买' : '上架'}</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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

  const [arrayPriceHistory, setArrayPriceHistory] = useState<ArrayPriceHistory | null>(null);
  const [previewArray, setPreviewArray] = useState<ArrayData | null>(null);
  const [previewPrice, setPreviewPrice] = useState(0);
  const [previewAction, setPreviewAction] = useState<'buy' | 'list' | undefined>(undefined);
  const [previewTradeId, setPreviewTradeId] = useState<string | null>(null);

  const loadTrades = () => {
    tradeApi.list().then(setTrades);
    tradeApi.listArrays().then(setArrayTrades);
  };

  useEffect(() => {
    loadTrades();
    const interval = setInterval(loadTrades, 5000);
    return () => clearInterval(interval);
  }, []);

  const getRuneMap = () => {
    const m: Record<string, Rune> = {};
    (player?.runes || []).forEach(r => m[r.id] = r);
    trades.forEach(t => m[t.runeId] = t.rune);
    return m;
  };

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
      const [sug, history] = await Promise.all([
        tradeApi.getArraySuggestion(array.power || 1000, array.totalRunes || 4),
        tradeApi.getArrayPriceHistory(array.power || 1000, array.totalRunes || 4)
      ]);
      const safeSug = {
        min: sug?.min || 1000,
        max: sug?.max || 1500,
        avg: sug?.avg || 1000
      };
      setSuggestion(safeSug);
      setArrayPriceHistory(history || null);
      setPrice(safeSug.avg);
    } catch (e) {
      const fallback = { min: 1000, max: 1500, avg: 1000 };
      setSuggestion(fallback);
      setArrayPriceHistory(null);
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
        setArrayPriceHistory(null);
        setPrice(0);
        setPreviewArray(null);
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

  const openPreview = (array: ArrayData, p: number, action: 'buy' | 'list', tradeId?: string) => {
    setPreviewArray(array);
    setPreviewPrice(p);
    setPreviewAction(action);
    setPreviewTradeId(tradeId || null);
    if (action === 'buy') {
      tradeApi.getArrayPriceHistory(array.power || 1000, array.totalRunes || 4)
        .then(setArrayPriceHistory).catch(() => setArrayPriceHistory(null));
    }
  };

  const confirmBuyArray = async () => {
    if (!player || !previewTradeId || player.coins < previewPrice) return;
    const result = await tradeApi.buyArray(player.id, previewTradeId);
    if (result.success) {
      setPreviewArray(null);
      setPreviewTradeId(null);
      await refreshPlayer();
      loadTrades();
    }
  };

  const myRuneListings = (player?.runes || []).filter(r => r.listedForSale);
  const myArrayListings = (player?.arrays || []).filter(a => a.listedForSale);
  const sellableRunes = (player?.runes || []).filter(r => !r.listedForSale);
  const sellableArrays = (player?.arrays || []).filter(a => !a.listedForSale);
  const filteredTrades = trades.filter(t => filterElement === 'all' || t.rune.element === filterElement);
  const runeMap = getRuneMap();

  const displayPrice = price || 0;
  const fee = Math.floor(displayPrice * 0.05);
  const net = displayPrice - fee;

  return (
    <div>
      {previewArray && (
        <ArrayDetailModal
          array={previewArray}
          runeObjects={runeMap}
          priceInfo={previewAction ? {
            price: previewPrice,
            fee: previewAction === 'list' ? fee : 0,
            net: previewAction === 'list' ? net : previewPrice,
            history: arrayPriceHistory
          } : undefined}
          action={previewAction}
          actionLabel={previewAction === 'buy' ? '🛒 购买阵图' : previewAction === 'list' ? '📤 上架出售' : undefined}
          actionDisabled={previewAction === 'buy' ? !player || player.coins < previewPrice : displayPrice <= 0 || loading}
          onAction={previewAction === 'buy' ? confirmBuyArray : listForSale}
          onClose={() => { setPreviewArray(null); setPreviewTradeId(null); }}
        />
      )}

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
                  💎 符文石
                </button>
                <button className={`btn ${marketType === 'array' ? '' : 'btn-secondary'}`} onClick={() => setMarketType('array')}>
                  📜 法阵阵图
                </button>
              </div>
              {marketType === 'rune' && (
                <select className="input" value={filterElement} onChange={e => setFilterElement(e.target.value)}>
                  <option value="all">全部元素</option>
                  {['FIRE', 'WATER', 'EARTH', 'WIND', 'LIGHT', 'DARK', 'THUNDER', 'ICE'].map(e => (
                    <option key={e} value={e}>{ELEMENT_ICONS[e]} {ELEMENT_NAMES[e]}</option>
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
                        <div className="flex gap-1 mt-2 justify-center flex-wrap">
                          {t.array.resonance?.triggered && (
                            <div className="effect-badge effect-resonance" style={{ fontSize: 10, margin: 0 }}>
                              ✨ 共鸣
                            </div>
                          )}
                          {t.array.backlash?.triggered && (
                            <div className="effect-badge effect-backlash" style={{ fontSize: 10, margin: 0 }}>
                              💥 反噬
                            </div>
                          )}
                        </div>
                        <div style={{ color: '#ffdd44', fontWeight: 'bold', margin: '8px 0' }}>
                          💰 {t.price.toLocaleString()}
                        </div>
                        {t.sellerId !== player?.id ? (
                          <div className="flex gap-1">
                            <button
                              className="btn btn-secondary flex-1"
                              style={{ padding: '8px 8px', fontSize: 12 }}
                              onClick={() => openPreview(t.array, t.price, 'buy', t.arrayId)}
                            >
                              详情
                            </button>
                            <button
                              className="btn btn-success flex-1"
                              style={{ padding: '8px 8px', fontSize: 12 }}
                              onClick={() => openPreview(t.array, t.price, 'buy', t.arrayId)}
                              disabled={!player || player.coins < t.price}
                            >
                              购买
                            </button>
                          </div>
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
                            style={{ borderColor: array.source === 'purchased' ? '#06b6d4' : '#ffaa44', color: array.source === 'purchased' ? '#06b6d4' : '#ffaa44' }}
                            onClick={() => selectArrayForSale(array)}
                          >
                            <div className="rune-icon">📜</div>
                            <div className="rune-name">{array.name}</div>
                            <div className="rune-power">⚡ {array.power}</div>
                            <div className="rune-power">🎯 {(array.totalRunes || array.runeIds.length)}个符文</div>
                            <div style={{ fontSize: 10, opacity: 0.7 }}>
                              {array.source === 'purchased' ? '🛒 购买' : '🛠️ 自建'}
                              {array.resonance?.triggered && ' · ✨共鸣'}
                              {array.backlash?.triggered && ' · 💥反噬'}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <div className="card-title">� 定价出售</div>
                {(selectedRune || selectedArray) ? (
                  <div>
                    {loading && <div className="loading">获取定价建议中...</div>}

                    {!loading && sellType === 'array' && selectedArray && sellableArrays.find(a => a.id === selectedArray) && (
                      <button
                        className="btn btn-secondary w-full mb-4"
                        style={{ padding: '10px', fontSize: 13 }}
                        onClick={() => {
                          const arr = sellableArrays.find(a => a.id === selectedArray);
                          if (arr) openPreview(arr, price, 'list');
                        }}
                      >
                        👁️ 预览阵图详情（符文组成/共鸣反噬/历史成交价）
                      </button>
                    )}

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
                      交易手续费: 5%（-{fee.toLocaleString()}）| 实际收入: <span className="text-green-400 font-bold">{net.toLocaleString()}</span>
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
                          📜 {array.name}
                          {array.source === 'purchased' && <span className="text-cyan-300 text-xs ml-2">购买</span>}
                          <span className="ml-2" style={{ color: '#ffdd44' }}>💰 {array.price?.toLocaleString()}</span>
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
