// app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuthStore, useUIStore } from '@/lib/store';
import { supabase, getProfile } from '@/lib/supabase';
import AuthScreen from '@/components/menu/AuthScreen';
import MainMenu from '@/components/menu/MainMenu';
import RoomSetup from '@/components/menu/RoomSetup';
import RoomList from '@/components/menu/RoomList';
import Lobby from '@/components/lobby/Lobby';
import GameScreen from '@/components/game/GameScreen';
import LoadingScreen from '@/components/ui/LoadingScreen';
import Notification from '@/components/ui/Notification';

type AppScreen =
  | 'loading'
  | 'auth'
  | 'menu'
  | 'solo_setup'
  | 'create_room'
  | 'join_room'
  | 'lobby'
  | 'game';

export default function Home() {
  const { user, isLoading, setUser, setLoading } = useAuthStore();
  const [screen, setScreen] = useState<AppScreen>('loading');
  const [currentRoomId, setCurrentRoomId] = useState<string>('');

  // Auth durumunu kontrol et
  useEffect(() => {
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const { data: profile } = await getProfile(session.user.id);
          if (profile) {
            setUser({
              id: profile.id,
              email: profile.email,
              username: profile.username,
              created_at: profile.created_at,
              achievements: profile.achievements || [],
              total_wins: profile.total_wins || 0,
              total_games: profile.total_games || 0,
              total_conquests: profile.total_conquests || 0,
            });
            setScreen('menu');
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setScreen('auth');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const { data: profile } = await getProfile(session.user.id);
        if (profile) {
          setUser({
            id: profile.id,
            email: profile.email,
            username: profile.username,
            created_at: profile.created_at,
            achievements: profile.achievements || [],
            total_wins: profile.total_wins || 0,
            total_games: profile.total_games || 0,
            total_conquests: profile.total_conquests || 0,
          });
          setScreen('menu');
        } else {
          setScreen('auth');
        }
      } else {
        setScreen('auth');
      }
    } catch {
      setScreen('auth');
    }

    setLoading(false);
  };

  // Solo oyun başlat
  const handleSoloStart = (roomId: string) => {
    setCurrentRoomId(roomId);
    setScreen('game');
  };

  // Oda oluşturuldu
  const handleRoomCreated = (roomId: string) => {
    setCurrentRoomId(roomId);
    setScreen('lobby');
  };

  // Odaya katıldı
  const handleRoomJoined = (roomId: string) => {
    setCurrentRoomId(roomId);
    setScreen('lobby');
  };

  // Oyun başladı (lobiden)
  const handleGameStart = (roomId: string) => {
    setCurrentRoomId(roomId);
    setScreen('game');
  };

  // Ana menüye dön
  const handleBackToMenu = () => {
    setCurrentRoomId('');
    setScreen('menu');
  };

  // Ekran render
  const renderScreen = () => {
    switch (screen) {
      case 'loading':
        return (
          <LoadingScreen
            message="Kare Savaşları"
            submessage="Yükleniyor..."
          />
        );

      case 'auth':
        return <AuthScreen />;

      case 'menu':
        return (
          <MainMenu
            onSoloPlay={() => setScreen('solo_setup')}
            onCreateRoom={() => setScreen('create_room')}
            onJoinRoom={() => setScreen('join_room')}
          />
        );

      case 'solo_setup':
        return (
          <RoomSetup
            mode="solo"
            onBack={() => setScreen('menu')}
            onStart={handleSoloStart}
          />
        );

      case 'create_room':
        return (
          <RoomSetup
            mode="create"
            onBack={() => setScreen('menu')}
            onStart={handleRoomCreated}
          />
        );

      case 'join_room':
        return (
          <RoomList
            onBack={() => setScreen('menu')}
            onJoin={handleRoomJoined}
          />
        );

      case 'lobby':
        return (
          <Lobby
            roomId={currentRoomId}
            onBack={handleBackToMenu}
            onGameStart={handleGameStart}
          />
        );

      case 'game':
        return (
          <GameScreen
            roomId={currentRoomId}
            onBackToMenu={handleBackToMenu}
          />
        );

      default:
        return (
          <LoadingScreen
            message="Bir şeyler yanlış gitti..."
            submessage="Sayfa yenileniyor..."
          />
        );
    }
  };

  return (
    <>
      <Notification />
      {renderScreen()}
    </>
  );
}