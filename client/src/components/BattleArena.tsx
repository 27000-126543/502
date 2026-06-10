import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store';
import type { Rune, BattleState } from '../types';

const ELEMENT_ICONS: Record<string, string> = {
  FIRE: '🔥', WATER: '💧', EARTH: '🌍', WIND: '🌪️',
  LIGHT: '☀️', DARK: '🌑', THUNDER: '⚡', ICE: '❄️'
};

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
  const eventsRef = useRef<HTMLDivElement>(null);

  const me = battle.me;
  const opp = battle.opponent;

  useEffect(() => {
    if (!socket) return;

    const handleEnd = (data: any) => {
      setPointChange(data.points);
      setBattleResult(data.win ? 'win' : 'lose');
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
              积分 {pointChange > 0 ? '+' : ''}{pointChange}
            </p>
          )}
          <button className="btn mt-10" onClick={handleExit}>返回大厅</button>
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
                {me.arrayResult?.resonance && (
                  <div className="effect-badge effect-resonance mt-10">
                    ✨ {me.arrayResult.resonance.name}
                  </div>
                )}
                {me.arrayResult?.backlash && (
                  <div className="effect-badge effect-backlash mt-10">
                    💥 反噬
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
                {opp.arrayResult?.resonance && (
                  <div className="effect-badge effect-resonance mt-10">
                    ✨ {opp.arrayResult.resonance.name}
                  </div>
                )}
                {opp.arrayResult?.backlash && (
                  <div className="effect-badge effect-backlash mt-10">
                    💥 反噬
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
  );
}

export default function BattleArena() {
  const { player, socket, battle, setBattle, refreshPlayer } = useStore();
  const [queuePosition, setQueuePosition] = useState(-1);

  const clearBattle = useCallback(() => {
    setBattle(null);
    setQueuePosition(-1);
    refreshPlayer();
  }, [setBattle, refreshPlayer]);

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

  return (
    <div>
      <div className="grid-2 mb-20">
        <div className="card">
          <div className="card-title">⚔️ 每日阵法竞技联赛</div>
          <div className="grid-2 mb-20">
            <div className="stats-card">
              <div className="stats-value">{player?.battlePoints || 0}</div>
              <div className="stats-label">⭐ 竞技积分</div>
            </div>
            <div className="stats-card">
              <div className="stats-value">{player?.battleWins || 0} / {player?.battleLosses || 0}</div>
              <div className="stats-label">🎯 胜/负</div>
            </div>
          </div>
          <p style={{ color: '#aabbcc', fontSize: 13, marginBottom: 20, lineHeight: 1.8 }}>
            • 系统根据阵法强度自动匹配实力相近的对手<br />
            • 实时对战中可激活符文技能干扰对手<br />
            • 胜利获得积分、金币和稀有符文石奖励<br />
            • 每日开放，排名靠前获得额外奖励
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
    </div>
  );
}
