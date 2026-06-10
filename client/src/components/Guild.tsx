import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { guildApi } from '../api';

export default function Guild() {
  const { player, refreshPlayer } = useStore();
  const [guild, setGuild] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newGuildName, setNewGuildName] = useState('');
  const [contributeMat, setContributeMat] = useState(100);
  const [contributeCoins, setContributeCoins] = useState(1000);

  useEffect(() => {
    if (player?.guildId) {
      guildApi.get(player.guildId).then(setGuild);
    }
  }, [player?.guildId]);

  const createGuild = async () => {
    if (!player || !newGuildName.trim()) return;
    const g = await guildApi.create(newGuildName.trim(), player.id);
    if (g) {
      setGuild(g);
      setShowCreate(false);
      await refreshPlayer();
    }
  };

  const contribute = async () => {
    if (!player) return;
    const result = await guildApi.contribute(player.id, contributeMat, contributeCoins);
    if (result.success) {
      await refreshPlayer();
      if (player.guildId) {
        guildApi.get(player.guildId).then(setGuild);
      }
    }
  };

  const upgrade = async (building: 'tower' | 'workshop') => {
    if (!player) return;
    const result = await guildApi.upgrade(player.id, building);
    if (result.success && player.guildId) {
      guildApi.get(player.guildId).then(setGuild);
      await refreshPlayer();
    }
  };

  if (!player?.guildId) {
    return (
      <div className="card text-center">
        <div className="card-title">🏰 公会系统</div>
        <div style={{ fontSize: 64, margin: '30px 0' }}>🏰</div>
        <p style={{ color: '#aabbcc', marginBottom: 30 }}>
          加入或创建公会，共同升级联合阵法塔和符文工坊，提升全体成员的阵法研究速度和符文合成概率！
        </p>
        <div className="flex gap-10 justify-center">
          <button className="btn" onClick={() => setShowCreate(true)}>
            🎉 创建公会
          </button>
        </div>

        {showCreate && (
          <div className="modal-backdrop" onClick={() => setShowCreate(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-title">🏰 创建公会</div>
              <div className="form-group">
                <label className="label">公会名称</label>
                <input
                  className="input"
                  style={{ width: '100%' }}
                  placeholder="输入公会名称..."
                  value={newGuildName}
                  onChange={e => setNewGuildName(e.target.value)}
                />
              </div>
              <div className="flex gap-10 justify-end mt-20">
                <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>取消</button>
                <button className="btn" onClick={createGuild}>创建</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!guild) {
    return <div className="card loading">加载公会信息...</div>;
  }

  const towerUpgradeCost = { mat: guild.towerLevel * 500, coins: guild.towerLevel * 10000 };
  const workshopUpgradeCost = { mat: guild.workshopLevel * 500, coins: guild.workshopLevel * 10000 };

  return (
    <div>
      <div className="card mb-20">
        <div className="flex justify-between items-center flex-wrap gap-10">
          <div>
            <h2 style={{ color: '#ffdd88' }}>🏰 {guild.name}</h2>
            <p style={{ color: '#aabbcc' }}>
              等级 Lv.{guild.level} | 成员 {guild.members.length}人 | 总贡献 {Math.floor(guild.totalContribution)}
            </p>
          </div>
          <div className="flex gap-10">
            <span style={{ color: '#88cc88' }}>📦 材料: {guild.materials}</span>
            <span style={{ color: '#ffdd44' }}>💰 金币: {guild.coins.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="grid-2 mb-20">
        <div className="card guild-building">
          <h4>🗼 联合阵法塔 Lv.{guild.towerLevel}</h4>
          <p style={{ color: '#88ffaa', margin: '10px 0' }}>
            全体成员阵法研究速度 +{guild.researchSpeedBonus}%
          </p>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${Math.min(100, guild.towerLevel * 10)}%` }} />
          </div>
          <p style={{ fontSize: 12, color: '#aabbcc', marginTop: 10 }}>
            升级消耗: 📦 {towerUpgradeCost.mat} 材料 | 💰 {towerUpgradeCost.coins.toLocaleString()} 金币
          </p>
          <button
            className="btn mt-10"
            onClick={() => upgrade('tower')}
            disabled={guild.materials < towerUpgradeCost.mat || guild.coins < towerUpgradeCost.coins}
          >
            升级阵法塔
          </button>
        </div>

        <div className="card guild-building">
          <h4>🔨 符文工坊 Lv.{guild.workshopLevel}</h4>
          <p style={{ color: '#88ffaa', margin: '10px 0' }}>
            全体成员符文合成概率 +{guild.craftBonus}%
          </p>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${Math.min(100, guild.workshopLevel * 10)}%` }} />
          </div>
          <p style={{ fontSize: 12, color: '#aabbcc', marginTop: 10 }}>
            升级消耗: 📦 {workshopUpgradeCost.mat} 材料 | 💰 {workshopUpgradeCost.coins.toLocaleString()} 金币
          </p>
          <button
            className="btn mt-10"
            onClick={() => upgrade('workshop')}
            disabled={guild.materials < workshopUpgradeCost.mat || guild.coins < workshopUpgradeCost.coins}
          >
            升级工坊
          </button>
        </div>
      </div>

      <div className="grid-2 mb-20">
        <div className="card">
          <div className="card-title">💝 贡献资源</div>
          <p style={{ fontSize: 13, color: '#aabbcc', marginBottom: 16 }}>
            贡献材料和金币升级公会建筑，提升全体成员福利！
          </p>
          <div className="form-group">
            <label className="label">材料数量</label>
            <input
              type="number"
              className="input"
              style={{ width: '100%' }}
              value={contributeMat}
              onChange={e => setContributeMat(parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="form-group">
            <label className="label">金币数量 (当前: {player.coins.toLocaleString()})</label>
            <input
              type="number"
              className="input"
              style={{ width: '100%' }}
              value={contributeCoins}
              onChange={e => setContributeCoins(parseInt(e.target.value) || 0)}
            />
          </div>
          <button
            className="btn btn-success"
            style={{ width: '100%' }}
            onClick={contribute}
            disabled={player.coins < contributeCoins}
          >
            💝 贡献 (获得贡献值 +{Math.floor(contributeMat + contributeCoins / 10)})
          </button>
          <p style={{ marginTop: 12, fontSize: 13, color: '#88ffaa' }}>
            我的贡献值: {Math.floor(player.guildContribution)}
          </p>
        </div>

        <div className="card">
          <div className="card-title">👥 公会成员</div>
          <table className="table">
            <thead>
              <tr>
                <th>成员</th>
                <th>贡献值</th>
                <th>等级</th>
              </tr>
            </thead>
            <tbody>
              {guild.members?.map((m: any) => (
                <tr key={m.id}>
                  <td>
                    {m.id === guild.founderId ? '👑 ' : ''}{m.name}
                  </td>
                  <td>{Math.floor(m.contribution)}</td>
                  <td>Lv.{m.level}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
