import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useStore } from './store';
import { playerApi, systemApi } from './api';
import Nav from './components/Nav';
import Login from './components/Login';
import Home from './components/Home';
import RuneBag from './components/RuneBag';
import ArrayBuilder from './components/ArrayBuilder';
import BattleArena from './components/BattleArena';
import TradeMarket from './components/TradeMarket';
import Guild from './components/Guild';
import StatsReport from './components/StatsReport';
import Leaderboard from './components/Leaderboard';
import type { Player } from './types';

export default function App() {
  const { player, setPlayer, setSocket, currentView, setCurrentView } = useStore();
  const [constants, setConstants] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);

  useEffect(() => {
    systemApi.constants().then(setConstants);
    systemApi.announcements().then(setAnnouncements);

    const savedPlayerId = localStorage.getItem('runePlayerId');
    if (savedPlayerId) {
      playerApi.get(savedPlayerId).then(p => {
        setPlayer(p);
        localStorage.setItem('runePlayerId', p.id);
      }).catch(() => localStorage.removeItem('runePlayerId'));
    }

    const socket = io();
    setSocket(socket);

    socket.on('announcement', (a) => {
      setAnnouncements(prev => [a, ...prev].slice(0, 20));
    });

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    if (player && useStore.getState().socket) {
      useStore.getState().socket.emit('register_player', player.id);
    }
  }, [player]);

  const handleLogin = async (name: string) => {
    const p: Player = await playerApi.login(name);
    setPlayer(p);
    localStorage.setItem('runePlayerId', p.id);
    if (useStore.getState().socket) {
      useStore.getState().socket.emit('register_player', p.id);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('runePlayerId');
    setPlayer(null);
    setCurrentView('home');
  };

  if (!player) {
    return <Login onLogin={handleLogin} />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'home': return <Home constants={constants} announcements={announcements} />;
      case 'bag': return <RuneBag />;
      case 'array': return <ArrayBuilder />;
      case 'battle': return <BattleArena />;
      case 'trade': return <TradeMarket />;
      case 'guild': return <Guild />;
      case 'stats': return <StatsReport />;
      case 'leaderboard': return <Leaderboard />;
      default: return <Home constants={constants} announcements={announcements} />;
    }
  };

  return (
    <div>
      <Nav
        player={player}
        currentView={currentView}
        onChangeView={setCurrentView}
        onLogout={handleLogout}
        runeStorm={constants?.runeStorm}
      />
      <div className="container">
        {constants?.runeStorm && (
          <div className="storm-banner">
            ⚡ 符文风暴进行中！{constants.ELEMENTS?.[constants.runeStorm.element.toUpperCase()]?.name || ''}系阵法威力提升50%！
          </div>
        )}
        {announcements.slice(0, 3).map(a => (
          <div key={a.id || a.timestamp} className="announcement">
            {a.text}
          </div>
        ))}
        {renderView()}
      </div>
    </div>
  );
}
