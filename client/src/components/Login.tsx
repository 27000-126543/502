import { useState } from 'react';

interface LoginProps {
  onLogin: (name: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) onLogin(name.trim());
  };

  return (
    <div className="login-container">
      <div className="card login-card">
        <div className="login-title">🔮 符文阵法世界</div>
        <div className="login-subtitle">多人在线魔法符文刻印与阵法构建系统</div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label">魔导士名称</label>
            <input
              type="text"
              className="input"
              style={{ width: '100%' }}
              placeholder="输入你的魔导士名称..."
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>
          <button className="btn" style={{ width: '100%', padding: '14px' }} type="submit">
            🚀 进入魔法世界
          </button>
        </form>
        <div style={{ marginTop: 30, fontSize: 12, color: '#667799', textAlign: 'left' }}>
          <p>✨ 收集八大元素符文石</p>
          <p>⚡ 构建强大的魔法阵法</p>
          <p>🏆 参加每日阵法竞技联赛</p>
          <p>💰 交易稀有符文与阵图</p>
          <p>🏰 加入公会共同成长</p>
        </div>
      </div>
    </div>
  );
}
