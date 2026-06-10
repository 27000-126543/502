const { v4: uuidv4 } = require('uuid');
const gameState = require('./gameState');
const { calculateArray, calculateArrayScore } = require('./arrayEngine');
const { RARITY, SEASON_RANKS } = require('./constants');

class BattleManager {
  constructor(io) {
    this.io = io;
    this.battles = new Map();
  }

  processMatchQueue() {
    const queue = gameState.matchQueue;
    if (queue.length < 2) return;

    const matched = new Set();
    for (let i = 0; i < queue.length - 1; i++) {
      if (matched.has(queue[i])) continue;
      const p1 = gameState.getPlayer(queue[i]);
      if (!p1) { matched.add(queue[i]); continue; }

      for (let j = i + 1; j < queue.length; j++) {
        if (matched.has(queue[j])) continue;
        const p2 = gameState.getPlayer(queue[j]);
        if (!p2) { matched.add(queue[j]); continue; }

        const diff = Math.abs(p1.battlePoints - p2.battlePoints);
        if (diff < 300) {
          this.startBattle(p1.id, p2.id);
          matched.add(queue[i]);
          matched.add(queue[j]);
          break;
        }
      }
    }

    gameState.matchQueue = queue.filter(id => !matched.has(id));
  }

  getRankInfo(points) {
    for (const rank of SEASON_RANKS) {
      if (points >= rank.minPoints && points <= rank.maxPoints) {
        return rank;
      }
    }
    return SEASON_RANKS[0];
  }

  calculatePointChange(winner, loser) {
    const winnerRank = this.getRankInfo(winner.battlePoints);
    const loserRank = this.getRankInfo(loser.battlePoints);

    const diff = loser.battlePoints - winner.battlePoints;
    const strengthFactor = 1 + Math.max(0, diff / 1000);
    const baseWin = Math.floor((15 + winnerRank.minDeduct * 0.8) * strengthFactor);
    const baseDeduct = Math.floor(baseWin * (0.8 + diff / 2000));

    const protectLoss = loserRank.protectLoss;
    const actualDeduct = Math.floor(baseDeduct * (1 - protectLoss));
    const minDeduct = loserRank.minDeduct;
    const finalDeduct = Math.max(minDeduct, actualDeduct);

    const floorPoints = SEASON_RANKS[0].minPoints;
    return {
      winAdd: baseWin,
      loseDeduct: finalDeduct,
      floorPoints
    };
  }

  startBattle(player1Id, player2Id) {
    const p1 = gameState.getPlayer(player1Id);
    const p2 = gameState.getPlayer(player2Id);
    if (!p1 || !p2) return;

    const battleId = uuidv4();
    const battle = {
      id: battleId,
      player1Id,
      player2Id,
      player1Energy: 100,
      player2Energy: 100,
      player1Array: null,
      player2Array: null,
      player1ArrayResult: null,
      player2ArrayResult: null,
      player1Ready: false,
      player2Ready: false,
      phase: 'preparation',
      runeCooldowns: { [player1Id]: {}, [player2Id]: {} },
      disruptStatus: { [player1Id]: 0, [player2Id]: 0 },
      startTime: Date.now(),
      lastUpdate: Date.now(),
      events: [],
      energySnapshots: [],
      skillLogs: []
    };

    this.battles.set(battleId, battle);
    p1.currentBattleId = battleId;
    p2.currentBattleId = battleId;
    gameState.removeFromMatchQueue(player1Id);
    gameState.removeFromMatchQueue(player2Id);

    this.addBattleEvent(battleId, `⚔️ ${p1.name} VS ${p2.name} 对战开始！`);
    this.io.to(p1.socketId).emit('battle_start', this.getBattleState(battleId, player1Id));
    this.io.to(p2.socketId).emit('battle_start', this.getBattleState(battleId, player2Id));
  }

  getBattleState(battleId, playerId) {
    const battle = this.battles.get(battleId);
    if (!battle) return null;

    const isP1 = battle.player1Id === playerId;
    const opponentId = isP1 ? battle.player2Id : battle.player1Id;
    const player = gameState.getPlayer(playerId);
    const opponent = gameState.getPlayer(opponentId);

    return {
      battleId,
      phase: battle.phase,
      me: {
        id: playerId,
        name: player?.name,
        energy: isP1 ? battle.player1Energy : battle.player2Energy,
        array: isP1 ? battle.player1Array : battle.player2Array,
        arrayResult: isP1 ? battle.player1ArrayResult : battle.player2ArrayResult,
        ready: isP1 ? battle.player1Ready : battle.player2Ready,
        cooldowns: battle.runeCooldowns[playerId] || {},
        disrupted: battle.disruptStatus[playerId] || 0
      },
      opponent: {
        id: opponentId,
        name: opponent?.name,
        energy: isP1 ? battle.player2Energy : battle.player1Energy,
        array: isP1 ? battle.player2Array : battle.player1Array,
        arrayResult: isP1 ? battle.player2ArrayResult : battle.player1ArrayResult,
        ready: isP1 ? battle.player2Ready : battle.player1Ready,
        cooldowns: battle.runeCooldowns[opponentId] || {},
        disrupted: battle.disruptStatus[opponentId] || 0
      },
      events: battle.events.slice(-20),
      startTime: battle.startTime
    };
  }

  setArray(playerId, runeIds, name) {
    const player = gameState.getPlayer(playerId);
    if (!player?.currentBattleId) return { success: false, error: '不在对战中' };

    const battle = this.battles.get(player.currentBattleId);
    if (!battle || battle.phase !== 'preparation') return { success: false, error: '布阵阶段已结束' };

    const result = calculateArray(runeIds, playerId);
    if (result.error) return { success: false, error: result.error };

    const arrayData = gameState.createArray(playerId, runeIds, name);
    Object.assign(arrayData, result);

    const isP1 = battle.player1Id === playerId;
    if (isP1) {
      battle.player1Array = arrayData;
      battle.player1ArrayResult = result;
    } else {
      battle.player2Array = arrayData;
      battle.player2ArrayResult = result;
    }

    const resonanceText = result.resonance ? `（✨共鸣: ${result.resonance.name}）` : '';
    const backlashText = result.backlash ? `（💥反噬: ${result.backlash.name}）` : '';
    this.addBattleEvent(battle.id, `${player.name} 布置了阵法「${arrayData.name}」${resonanceText}${backlashText}`);
    this.broadcastBattleState(battle.id);

    return { success: true, array: arrayData, result };
  }

  setReady(playerId, ready = true) {
    const player = gameState.getPlayer(playerId);
    if (!player?.currentBattleId) return false;
    const battle = this.battles.get(player.currentBattleId);
    if (!battle || battle.phase !== 'preparation') return false;

    const isP1 = battle.player1Id === playerId;
    if (isP1) battle.player1Ready = ready;
    else battle.player2Ready = ready;

    this.addBattleEvent(battle.id, `${player.name} ${ready ? '已准备就绪' : '取消准备'}`);

    if (battle.player1Ready && battle.player2Ready) {
      this.startFightingPhase(battle.id);
    } else {
      this.broadcastBattleState(battle.id);
    }
    return true;
  }

  startFightingPhase(battleId) {
    const battle = this.battles.get(battleId);
    if (!battle) return;

    battle.phase = 'fighting';
    battle.lastUpdate = Date.now();
    battle.energySnapshots.push({
      timestamp: Date.now(),
      player1Energy: battle.player1Energy,
      player2Energy: battle.player2Energy
    });

    const p1 = gameState.getPlayer(battle.player1Id);
    const p2 = gameState.getPlayer(battle.player2Id);

    this.addBattleEvent(battle.id, `🔥 双方准备完毕，战斗正式开始！`);
    if (battle.player1ArrayResult?.resonance) {
      this.addBattleEvent(battle.id, `✨ ${p1?.name} 的阵法触发共鸣：${battle.player1ArrayResult.resonance.name}，威力×${battle.player1ArrayResult.resonance.powerBoost}！`);
    }
    if (battle.player2ArrayResult?.resonance) {
      this.addBattleEvent(battle.id, `✨ ${p2?.name} 的阵法触发共鸣：${battle.player2ArrayResult.resonance.name}，威力×${battle.player2ArrayResult.resonance.powerBoost}！`);
    }
    if (battle.player1ArrayResult?.backlash) {
      this.addBattleEvent(battle.id, `💥 ${p1?.name} 的阵法遭遇元素反噬，威力削弱！`);
    }
    if (battle.player2ArrayResult?.backlash) {
      this.addBattleEvent(battle.id, `💥 ${p2?.name} 的阵法遭遇元素反噬，威力削弱！`);
    }

    this.broadcastBattleState(battleId);
    this.battleTickInterval(battleId);
  }

  battleTickInterval(battleId) {
    const tick = () => {
      const battle = this.battles.get(battleId);
      if (!battle || battle.phase !== 'fighting') return;

      const now = Date.now();
      const delta = (now - battle.lastUpdate) / 1000;
      battle.lastUpdate = now;

      const score1 = calculateArrayScore(battle.player1ArrayResult) || 1;
      const score2 = calculateArrayScore(battle.player2ArrayResult) || 1;
      const totalScore = score1 + score2;

      const baseDrain = 3 * delta;
      battle.player1Energy -= baseDrain * (score2 / totalScore);
      battle.player2Energy -= baseDrain * (score1 / totalScore);

      if (Math.random() < 0.1) {
        battle.energySnapshots.push({
          timestamp: now,
          player1Energy: Math.max(0, battle.player1Energy),
          player2Energy: Math.max(0, battle.player2Energy)
        });
      }

      Object.keys(battle.disruptStatus).forEach(pid => {
        if (battle.disruptStatus[pid] > 0) {
          battle.disruptStatus[pid] = Math.max(0, battle.disruptStatus[pid] - delta * 1000);
        }
      });

      Object.keys(battle.runeCooldowns).forEach(pid => {
        Object.keys(battle.runeCooldowns[pid]).forEach(rid => {
          if (battle.runeCooldowns[pid][rid] > 0) {
            battle.runeCooldowns[pid][rid] = Math.max(0, battle.runeCooldowns[pid][rid] - delta * 1000);
          }
        });
      });

      if (battle.player1Energy <= 0 || battle.player2Energy <= 0) {
        this.endBattle(battleId);
        return;
      }

      this.broadcastBattleState(battleId);
      setTimeout(tick, 100);
    };
    tick();
  }

  activateRuneSkill(playerId, runeId, targetId) {
    const player = gameState.getPlayer(playerId);
    if (!player?.currentBattleId) return { success: false, error: '不在对战中' };

    const battle = this.battles.get(player.currentBattleId);
    if (!battle || battle.phase !== 'fighting') return { success: false, error: '不在战斗阶段' };

    const rune = gameState.getRune(runeId);
    if (!rune || rune.ownerId !== playerId) return { success: false, error: '符文不存在或不属于你' };

    if ((battle.runeCooldowns[playerId]?.[runeId] || 0) > 0) {
      return { success: false, error: '符文冷却中' };
    }

    if ((battle.disruptStatus[playerId] || 0) > 0) {
      return { success: false, error: '被干扰，无法施放技能' };
    }

    const target = targetId || (battle.player1Id === playerId ? battle.player2Id : battle.player1Id);
    const targetPlayer = gameState.getPlayer(target);

    battle.runeCooldowns[playerId][runeId] = rune.cooldown;

    const skill = rune.skill;
    let skillDetail = '';
    switch (skill.type) {
      case 'damage':
        if (battle.player1Id === target) {
          battle.player1Energy = Math.max(0, battle.player1Energy - skill.value);
        } else {
          battle.player2Energy = Math.max(0, battle.player2Energy - skill.value);
        }
        skillDetail = `对 ${targetPlayer?.name} 造成 ${skill.value} 点能量伤害`;
        break;

      case 'disrupt':
        battle.disruptStatus[target] = skill.value * 1000;
        skillDetail = `干扰 ${targetPlayer?.name} ${skill.value} 秒`;
        break;

      case 'shield':
        if (battle.player1Id === playerId) {
          battle.player1Energy = Math.min(100, battle.player1Energy + skill.value);
        } else {
          battle.player2Energy = Math.min(100, battle.player2Energy + skill.value);
        }
        skillDetail = `恢复自身 ${skill.value} 点能量`;
        break;

      case 'energy_boost':
        if (battle.player1Id === playerId) {
          battle.player1ArrayResult.power = Math.floor(battle.player1ArrayResult.power * (1 + skill.value / 100));
        } else {
          battle.player2ArrayResult.power = Math.floor(battle.player2ArrayResult.power * (1 + skill.value / 100));
        }
        skillDetail = `阵法威力提升 ${skill.value}%`;
        break;
    }

    this.addBattleEvent(battle.id, `💫 ${player.name} 释放【${skill.name}】，${skillDetail}！`);
    battle.skillLogs.push({
      timestamp: Date.now(),
      casterId: playerId,
      casterName: player.name,
      targetId: target,
      targetName: targetPlayer?.name,
      skillName: skill.name,
      detail: skillDetail
    });
    battle.energySnapshots.push({
      timestamp: Date.now(),
      player1Energy: Math.max(0, battle.player1Energy),
      player2Energy: Math.max(0, battle.player2Energy)
    });

    this.broadcastBattleState(battle.id);
    return { success: true };
  }

  endBattle(battleId) {
    const battle = this.battles.get(battleId);
    if (!battle) return;

    battle.phase = 'ended';
    let winnerId, loserId;

    if (battle.player1Energy <= 0) {
      winnerId = battle.player2Id;
      loserId = battle.player1Id;
    } else {
      winnerId = battle.player1Id;
      loserId = battle.player2Id;
    }

    const winner = gameState.getPlayer(winnerId);
    const loser = gameState.getPlayer(loserId);

    gameState.recordBattleResult(winnerId, loserId, battle.player1Array, battle.player2Array);

    const { winAdd, loseDeduct, floorPoints } = this.calculatePointChange(winner, loser);
    const winnerOldPoints = winner.battlePoints;
    const loserOldPoints = loser.battlePoints;

    winner.battlePoints = winner.battlePoints + winAdd;
    loser.battlePoints = Math.max(floorPoints, loser.battlePoints - loseDeduct);
    const actualLoseDeduct = loserOldPoints - loser.battlePoints;

    const rewards = this.calculateRewards(winnerId);

    this.addBattleEvent(battle.id, `🏆 ${winner?.name} 获得最终胜利！`);
    this.addBattleEvent(battle.id, `⭐ 积分结算：${winner?.name} +${winAdd}分（${winnerOldPoints}→${winner.battlePoints}），${loser?.name} -${actualLoseDeduct}分（${loserOldPoints}→${loser.battlePoints}）`);
    this.addBattleEvent(battle.id, `🎁 奖励：金币+${rewards.coins}${rewards.rune ? `，获得符文【${rewards.rune.name}】` : ''}`);

    if (winner) {
      winner.coins += rewards.coins;
      if (rewards.rune) {
        gameState.addRuneToPlayer(winnerId, rewards.rune.id);
      }
      winner.currentBattleId = null;
    }
    if (loser) {
      loser.currentBattleId = null;
    }

    const reportId = gameState.createBattleReport({
      battleId,
      winnerId,
      loserId,
      player1Id: battle.player1Id,
      player2Id: battle.player2Id,
      player1Name: gameState.getPlayer(battle.player1Id)?.name,
      player2Name: gameState.getPlayer(battle.player2Id)?.name,
      player1Array: battle.player1Array,
      player2Array: battle.player2Array,
      player1ArrayResult: battle.player1ArrayResult,
      player2ArrayResult: battle.player2ArrayResult,
      player1FinalEnergy: Math.max(0, battle.player1Energy),
      player2FinalEnergy: Math.max(0, battle.player2Energy),
      events: battle.events,
      energySnapshots: (battle.energySnapshots || []).map(s => ({
        t: s.timestamp || Date.now(),
        p1: s.player1Energy,
        p2: s.player2Energy
      })),
      skillLogs: battle.skillLogs || [],
      pointChange: { winAdd, loseDeduct: actualLoseDeduct },
      rewards,
      duration: Date.now() - battle.startTime,
      timestamp: battle.startTime
    });

    [battle.player1Id, battle.player2Id].forEach(pid => {
      const p = gameState.getPlayer(pid);
      if (!p) return;
      p.latestReportId = reportId;
      if (!p.recentReportIds) p.recentReportIds = [];
      p.recentReportIds.unshift(reportId);
      if (p.recentReportIds.length > 20) p.recentReportIds.length = 20;
    });

    if (winner?.socketId) {
      this.io.to(winner.socketId).emit('battle_end', {
        win: true,
        points: winAdd,
        rewards,
        reportId
      });
    }
    if (loser?.socketId) {
      this.io.to(loser.socketId).emit('battle_end', {
        win: false,
        points: -actualLoseDeduct,
        rewards: { coins: 0, rune: null },
        reportId
      });
    }

    this.broadcastBattleState(battleId);

    setTimeout(() => {
      this.battles.delete(battleId);
    }, 60000);
  }

  calculateRewards(winnerId) {
    const coins = 500 + Math.floor(Math.random() * 1500);
    let rune = null;

    if (Math.random() < 0.5) {
      const elements = ['FIRE', 'WATER', 'EARTH', 'WIND', 'LIGHT', 'DARK', 'THUNDER', 'ICE'];
      const rarityRoll = Math.random();
      let rarity;
      if (rarityRoll < 0.03) rarity = 'LEGENDARY';
      else if (rarityRoll < 0.12) rarity = 'EPIC';
      else if (rarityRoll < 0.35) rarity = 'RARE';
      else if (rarityRoll < 0.7) rarity = 'UNCOMMON';
      else rarity = 'COMMON';

      rune = gameState.createRune(
        elements[Math.floor(Math.random() * elements.length)],
        rarity
      );
    }

    return { coins, rune };
  }

  addBattleEvent(battleId, text) {
    const battle = this.battles.get(battleId);
    if (!battle) return;
    battle.events.push({ text, timestamp: Date.now() });
  }

  broadcastBattleState(battleId) {
    const battle = this.battles.get(battleId);
    if (!battle) return;

    [battle.player1Id, battle.player2Id].forEach(pid => {
      const player = gameState.getPlayer(pid);
      if (player?.socketId) {
        this.io.to(player.socketId).emit('battle_update', this.getBattleState(battleId, pid));
      }
    });
  }

  playerDisconnect(playerId) {
    const player = gameState.getPlayer(playerId);
    if (player?.currentBattleId) {
      const battle = this.battles.get(player.currentBattleId);
      if (battle && battle.phase === 'fighting') {
        if (battle.player1Id === playerId) {
          battle.player1Energy = 0;
        } else {
          battle.player2Energy = 0;
        }
        this.endBattle(battle.id);
      }
    }
    gameState.setPlayerOffline(playerId);
  }
}

module.exports = BattleManager;
