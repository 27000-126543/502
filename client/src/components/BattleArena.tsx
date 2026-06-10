import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store';
import type { Rune, BattleState, SeasonInfo, RecentReportSummary } from '../types';
import { systemApi, playerApi } from '../api';
import BattleReportView from './BattleReport';

const ELEMENT_ICONS: Record<string, string> = {
  FIRE: '🔥', WATER: '💧', EARTH: '🌍', WIND: '🌪️',
  LIGHT: '☀️', DARK: '🌑', THUNDER: '⚡', ICE: '❄️'
};

const RARITY_COLORS: Record<string, string> = {
  COMMON: '#9ca3af', UNCOMMON: '#22c55e', RARE: '#3b82f6',
  EPIC: '#a855f7', LEGENDARY: '#f59e0b'
};

function formatDuration(s: number) {
  const secs = Math.floor(s);
  const m = Math.floor(secs / 60);
  const ss = secs % 60;
  return `${m}分${ss}秒`;
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

function getRankInfo(points: number, ranks: any[]) {
  for (let i = ranks.length - 1; i >= 0; i--) {
    if (points >= ranks[i].minPoints) return ranks[i];
  }
  return ranks[0];
}

interface BattleViewProps {
  battle: BattleState;
  onExit: () => void;
  playerRunes: Rune[] | undefined;
}

function BattleView({ battle, onExit, playerRunes }: BattleViewProps) {
  const { player, socket, refreshPlayer } = useStore();
  const [localSelected, setLocalSelected] = useState<string[]>([]);
  const [pointChange, setPointChange] = useState<number | null>(null);
  const [battleResult, setBattleResult] = useState<'win' | 'lose' | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const eventsRef = useRef<HTMLDivElement>(null);

  const me = battle.me;
  const opp = battle.opponent;

  useEffect(() => {
    if (!socket) return;

    const handleEnd = (data: any) => {
      setPointChange(data.points);
      setBattleResult(data.win ? 'win' : 'lose');
      if (data.reportId) setReportId(data.reportId);
      refreshPlayer();
    };

    socket.on('battle_end', handleEnd);
    return () => socket.off('battle_end', handleEnd);
  }, [socket, refreshPlayer]);

  useEffect(() => {
    if (eventsRef.current) {
      eventsRef.current.scrollTop = eventsRef.current.scrollHeight;
    }
  }, [battle.events]);

  const toggleRuneLocal = (id: string) => {
    setLocalSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const doSetArray = () => {
    if (!player || !socket || localSelected.length < 2) return;
    socket.emit('set_array', {
      playerId: player.id,
      runeIds: localSelected,
      name: `战阵_${Date.now()}`
    });
  };

  const doSetReady = (ready: boolean) => {
    if (!player || !socket) return;
    socket.emit('set_ready', { playerId: player.id, ready });
  };

  const useSkill = (runeId: string) => {
    if (!player || !socket) return;
    socket.emit('activate_skill', { playerId: player.id, runeId });
  };

  const handleExit = async () => {
    await refreshPlayer();
    onExit();
  };

  return (
    <>
      {showReport && reportId && (
        <BattleReportView reportId={reportId} onClose={() => setShowReport(false)} />
      )}

      <div>
        {(battle.phase === 'ended' || battleResult) && (
          <div className="card text-center mb-20" style={{ background: 'rgba(50,40,30,0.9)' }}>
            <div style={{ fontSize: 48, margin: '10px 0' }}>
              {battleResult === 'lose' ? '😭' : '🏆'}
            </div>
            <h2 style={{ color: battleResult === 'lose' ? '#ff6666' : '#ffdd44' }}>
              {battleResult === 'lose' ? '战斗失败' : '战斗胜利！'}
            </h2>
            {pointChange !== null && (
              <p style={{ marginTop: 10, fontSize: 18 }}>
                赛季积分 {pointChange > 0 ? '+' : ''}{pointChange}
                {pointChange < 0 && battleResult === 'lose' && (
                  <span style={{ display: 'block', fontSize: 13, color: '#8899aa', marginTop: 6 }}>
                    已根据段位保护和最低分保底进行减免
                  </span>
                )}
              </p>
            )}
            <div className="flex gap-10 justify-center mt-10 flex-wrap">
              {reportId && (
                <button className="btn btn-success" onClick={() => setShowReport(true)}>📜 查看战报</button>
              )}
              <button className="btn" onClick={handleExit}>返回大厅</button>
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-title text-center">
            ⚔️ 对战中 - {battle.phase === 'preparation' ? '布阵阶段' : battle.phase === 'fighting' ? '战斗阶段' : '已结束'}
          </div>

          <div className="battle-arena">
            <div className="battle-player me">
              <h3>👤 {me.name}</h3>
              <div className="energy-bar">
                <div
                  className={`energy-fill ${me.energy < 30 ? 'low' : ''}`}
                  style={{ width: `${Math.max(0, me.energy)}%` }}
                />
                <div className="energy-text">{Math.max(0, Math.floor(me.energy))} / 100</div>
              </div>

              {me.array && (
                <div style={{ margin: '16px 0' }}>
                  <strong>阵法:</strong> {me.array.name}
                  {me.arrayResult?.resonance && me.arrayResult.resonance.triggered && (
                    <div className="effect-badge effect-resonance mt-10">
                      ✨ {me.arrayResult.resonance.name}
                    </div>
                  )}
                  {me.arrayResult?.backlash && me.arrayResult.backlash.triggered && (
                    <div className="effect-badge effect-backlash mt-10">
                      💥 {me.arrayResult.backlash.name}
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: '#aabbcc', marginTop: 8 }}>
                    ⚡ {me.arrayResult?.power || 0} | 🎯 {((me.arrayResult?.triggerChance || 0) * 100).toFixed(0)}%
                  </div>
                </div>
              )}

              {me.disrupted > 0 && (
                <div className="effect-badge effect-backlash">
                  🚫 被干扰中 {(me.disrupted / 1000).toFixed(1)}s
                </div>
              )}

              {battle.phase === 'fighting' && playerRunes && (
                <div className="skill-bar">
                  {playerRunes.slice(0, 6).map((rune: any) => {
                    const cd = (me.cooldowns?.[rune.id] || 0);
                    return (
                      <button
                        key={rune.id}
                        className="skill-btn"
                        onClick={() => useSkill(rune.id)}
                        disabled={cd > 0 || me.disrupted > 0 || battle.phase !== 'fighting'}
                      >
                        {ELEMENT_ICONS[rune.element]} {rune.skill.name}
                        {cd > 0 && <div className="cooldown-overlay">{(cd / 1000).toFixed(1)}s</div>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="battle-vs">VS</div>

            <div className="battle-player opponent">
              <h3>👤 {opp.name}</h3>
              <div className="energy-bar">
                <div
                  className={`energy-fill ${opp.energy < 30 ? 'low' : ''}`}
                  style={{ width: `${Math.max(0, opp.energy)}%`, background: 'linear-gradient(90deg, #ff6688, #ff8866)' }}
                />
                <div className="energy-text">{Math.max(0, Math.floor(opp.energy))} / 100</div>
              </div>

              {opp.array && (
                <div style={{ margin: '16px 0' }}>
                  <strong>阵法:</strong> {opp.array.name}
                  {opp.arrayResult?.resonance && opp.arrayResult.resonance.triggered && (
                    <div className="effect-badge effect-resonance mt-10">
                      ✨ {opp.arrayResult.resonance.name}
                    </div>
                  )}
                  {opp.arrayResult?.backlash && opp.arrayResult.backlash.triggered && (
                    <div className="effect-badge effect-backlash mt-10">
                      💥 {opp.arrayResult.backlash.name}
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: '#aabbcc', marginTop: 8 }}>
                    ⚡ {opp.arrayResult?.power || 0} | 🎯 {((opp.arrayResult?.triggerChance || 0) * 100).toFixed(0)}%
                  </div>
                </div>
              )}

              {opp.disrupted > 0 && (
                <div className="effect-badge effect-backlash">
                  🚫 被干扰中 {(opp.disrupted / 1000).toFixed(1)}s
                </div>
              )}
            </div>
          </div>

          {battle.phase === 'preparation' && playerRunes && (
            <div className="mt-20">
              <h4 style={{ marginBottom: 16 }}>📜 选择符文布置阵法 (至少2个):</h4>
              <div className="rune-grid mb-20">
                {playerRunes.map((rune: Rune) => (
                  <div
                    key={rune.id}
                    className={`rune-card rarity-${rune.rarity.toLowerCase()} ${localSelected.includes(rune.id) ? 'selected' : ''}`}
                    onClick={() => battle.phase === 'preparation' && toggleRuneLocal(rune.id)}
                  >
                    <div className="rune-icon">{ELEMENT_ICONS[rune.element]}</div>
                    <div className="rune-name">{rune.name}</div>
                    <div className="rune-power">⚡ {rune.power}</div>
                  </div>
                ))}
              </div>

              <div className="flex gap-10 justify-center flex-wrap">
                <button
                  className="btn"
                  onClick={doSetArray}
                  disabled={localSelected.length < 2 || battle.phase !== 'preparation'}
                >
                  确认布阵 ({localSelected.length})
                </button>
                {me.array && (
                  <button
                    className={`btn ${me.ready ? 'btn-secondary' : 'btn-success'}`}
                    onClick={() => doSetReady(!me.ready)}
                    disabled={battle.phase !== 'preparation'}
                  >
                    {me.ready ? '取消准备' : '准备就绪'}
                  </button>
                )}
                <span style={{ padding: '12px', color: '#aabbcc' }}>
                  {me.ready ? '✅ 已准备' : '⏳ 未准备'} | 对手: {opp.ready ? '✅ 已准备' : '⏳ 未准备'}
                </span>
              </div>
            </div>
          )}

          <div className="battle-events" ref={eventsRef}>
            <h4 style={{ marginBottom: 12 }}>📋 战斗日志</h4>
            {battle.events.map((e, i) => (
              <div key={i} className="battle-event">{e.text}</div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export default function BattleArena() {
  const { player, socket, battle, setBattle, refreshPlayer } = useStore();
  const [queuePosition, setQueuePosition] = useState(-1);
  const [seasonInfo, setSeasonInfo] = useState<SeasonInfo | null>(null);
  const [now, setNow] = useState(Date.now());
  const [recentReports, setRecentReports] = useState<RecentReportSummary[]>([]);
  const [viewReportId, setViewReportId] = useState<string | null>(null);

  useEffect(() => {
    systemApi.seasonInfo().then(setSeasonInfo).catch(() => {});
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!player?.id) return;
    playerApi.getRecentReports(player.id).then(setRecentReports).catch(() => {});
  }, [player?.id, battle]);

  const clearBattle = useCallback(() => {
    setBattle(null);
    setQueuePosition(-1);
    refreshPlayer();
    if (player?.id) {
      playerApi.getRecentReports(player.id).then(setRecentReports).catch(() => {});
    }
  }, [setBattle, refreshPlayer, player?.id]);

  useEffect(() => {
    if (!socket) return;

    const handleQueue = (data: any) => {
      setQueuePosition(data.queuePosition);
    };

    const handleBattleStart = (data: BattleState) => {
      setBattle(data);
      setQueuePosition(-1);
    };

    const handleBattleUpdate = (data: BattleState) => {
      setBattle({ ...data });
    };

    socket.on('match_queue_status', handleQueue);
    socket.on('battle_start', handleBattleStart);
    socket.on('battle_update', handleBattleUpdate);

    return () => {
      socket.off('match_queue_status', handleQueue);
      socket.off('battle_start', handleBattleStart);
      socket.off('battle_update', handleBattleUpdate);
    };
  }, [socket, setBattle]);

  const joinQueue = () => {
    if (!player || !socket) return;
    clearBattle();
    socket.emit('join_match_queue', player.id);
  };

  const leaveQueue = () => {
    if (!player || !socket) return;
    socket.emit('leave_match_queue', player.id);
    setQueuePosition(-1);
  };

  if (viewReportId) {
    return <BattleReportView reportId={viewReportId} onClose={() => setViewReportId(null)} />;
  }

  if (battle) {
    return <BattleView battle={battle} onExit={clearBattle} playerRunes={player?.runes} />;
  }

  if (queuePosition > 0) {
    return (
      <div className="card text-center">
        <div className="card-title">⏳ 匹配中...</div>
        <div style={{ fontSize: 48, margin: '30px 0' }}>⚔️</div>
        <p>队列位置: 第 {queuePosition} 位</p>
        <p style={{ color: '#8899bb', margin: '20px 0' }}>正在为你寻找实力相近的对手...</p>
        <button className="btn btn-danger" onClick={leaveQueue}>取消匹配</button>
      </div>
    );
  }

  const points = player?.battlePoints || 0;
  const wins = player?.battleWins || 0;
  const losses = player?.battleLosses || 0;
  const winRate = wins + losses > 0 ? (wins * 100 / (wins + losses)).toFixed(1) : '0.0';
  const rank = seasonInfo ? getRankInfo(points, seasonInfo.ranks) : null;
  const nextRank = rank && seasonInfo ? seasonInfo.ranks[seasonInfo.ranks.indexOf(rank) + 1] : null;
  const progress = rank && nextRank ? Math.min(100, (points - rank.minPoints) * 100 / Math.max(1, nextRank.minPoints - rank.minPoints)) : (rank ? ((points - rank.minPoints) * 100 / Math.max(1, rank.maxPoints - rank.minPoints)) : 0);

  return (
    <div>
      <div className="grid-2 mb-20">
        <div className="card">
          <div className="card-title">⚔️ 每日阵法竞技联赛</div>

          {rank && seasonInfo && (
            <div className="mb-20 p-4 rounded-xl"
              style={{ background: `linear-gradient(135deg, ${rank.color}22, ${rank.color}11)`, border: `1px solid ${rank.color}44` }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm text-slate-400">当前段位</div>
                  <div className="text-2xl font-bold flex items-center gap-2" style={{ color: rank.color }}>
                    🏆 {rank.name}
                    <span className="text-base text-white font-normal opacity-80">· {points} 分</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-slate-400">赛季剩余</div>
                  <div className="text-base font-semibold text-white">
                    {formatCountdown(seasonInfo.seasonEndTimestamp - now)}
                  </div>
                </div>
              </div>
              {nextRank && (
                <>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>{rank.minPoints}</span>
                    <span>晋级到{nextRank.name}需要 {nextRank.minPoints}</span>
                    <span>{nextRank.minPoints}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: rank.color }} />
                  </div>
                </>
              )}
              <div className="grid grid-cols-3 gap-2 mt-4 text-center text-sm">
                <div>
                  <div className="text-white font-bold text-lg">{points}</div>
                  <div className="text-slate-400 text-xs">赛季积分</div>
                </div>
                <div>
                  <div className="text-white font-bold text-lg">{winRate}%</div>
                  <div className="text-slate-400 text-xs">胜率</div>
                </div>
                <div>
                  <div className="text-white font-bold text-lg">{((rank.protectLoss || 0) * 100).toFixed(0)}%</div>
                  <div className="text-slate-400 text-xs">段位保护</div>
                </div>
              </div>
            </div>
          )}

          <div className="grid-2 mb-20">
            <div className="stats-card">
              <div className="stats-value">{wins} / {losses}</div>
              <div className="stats-label">🎯 胜/负</div>
            </div>
            <div className="stats-card">
              <div className="stats-value">{winRate}%</div>
              <div className="stats-label">📈 胜率</div>
            </div>
          </div>
          <p style={{ color: '#aabbcc', fontSize: 13, marginBottom: 20, lineHeight: 1.8 }}>
            • 系统根据阵法强度自动匹配实力相近的对手<br />
            • 实时对战中可激活符文技能干扰对手<br />
            • 胜利按对手强度加分，失败按段位保护扣分<br />
            • 每日开放，段位排名靠前获得额外奖励
          </p>
          <button
            className="btn btn-warning"
            style={{ width: '100%', padding: '16px', fontSize: 16 }}
            onClick={joinQueue}
            disabled={!!player?.currentBattleId}
          >
            🚀 开始匹配
          </button>
        </div>

        <div className="card">
          <div className="card-title">🎒 赛前准备</div>
          <p style={{ color: '#aabbcc', fontSize: 13, marginBottom: 16 }}>
            战斗中可使用的符文技能：
          </p>
          <div className="rune-grid">
            {(player?.runes || []).slice(0, 6).map((rune: Rune) => (
              <div key={rune.id} className={`rune-card rarity-${rune.rarity.toLowerCase()}`}>
                <div className="rune-icon">{ELEMENT_ICONS[rune.element]}</div>
                <div className="rune-name">{rune.name}</div>
                <div className="rune-skill">{rune.skill.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title flex items-center justify-between">
          <span>📜 最近战报</span>
          <span className="text-xs text-slate-400">最近{recentReports.length}场</span>
        </div>
        {recentReports.length === 0 ? (
          <div className="text-center text-slate-400 py-10">
            <div style={{ fontSize: 48 }}>📭</div>
            <p className="mt-3">暂无战报，去打一场比赛吧！</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
            {recentReports.map((r) => (
              <div
                key={r.id}
                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition hover:bg-slate-700/40 border ${r.isWinner ? 'border-amber-500/30 bg-amber-900/10' : 'border-red-500/30 bg-red-900/10'}`}
                onClick={() => setViewReportId(r.id)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${r.isWinner ? 'bg-amber-500/20' : 'bg-red-500/20'}`}>
                    {r.isWinner ? '🏆' : '💔'}
                  </div>
                  <div>
                    <div className="text-sm text-white">
                      {r.isWinner ? '战胜' : '不敌'} <span className="font-semibold text-cyan-300">{r.opponentName}</span>
                    </div>
                    <div className="text-xs text-slate-400">
                      {new Date(r.createdAt).toLocaleString()} · 历时 {formatDuration(r.duration / 1000)}
                    </div>
                  </div>
                </div>
                <div className={`text-lg font-bold ${r.pointChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {r.pointChange >= 0 ? '+' : ''}{r.pointChange}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
