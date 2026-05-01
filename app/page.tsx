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
  const { setUser, setLoading } = useAuthStore();
  const [screen, setScreen] = useState<AppScreen>('loading');
  const [currentRoomId, setCurrentRoomId] = useState<string>('');
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        // Mevcut session kontrol et
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Session error:', error);
          if (isMounted) {
            setScreen('auth');
            setLoading(false);
            setAuthReady(true);
          }
          return;
        }

        if (session?.user) {
          // Profile bilgisini al
          const { data: profile, error: profileError } = await getProfile(session.user.id);

          if (profileError || !profile) {
            console.error('Profile error:', profileError);
            // Profile yoksa oluşturmayı dene
            const { data: newProfile } = await supabase
              .from('profiles')
              .upsert({
                id: session.user.id,
                email: session.user.email || '',
                username: session.user.user_metadata?.username || 'Oyuncu_' + session.user.id.slice(0, 6),
              })
              .select()
              .single();

            if (newProfile && isMounted) {
              setUser({
                id: newProfile.id,
                email: newProfile.email,
                username: newProfile.username,
                created_at: newProfile.created_at,
                achievements: newProfile.achievements || [],
                total_wins: newProfile.total_wins || 0,
                total_games: newProfile.total_games || 0,
                total_conquests: newProfile.total_conquests || 0,
              });
              setScreen('menu');
            } else if (isMounted) {
              setScreen('auth');
            }
          } else if (isMounted) {
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
        } else {
          if (isMounted) {
            setScreen('auth');
          }
        }
      } catch (err) {
        console.error('Auth init error:', err);
        if (isMounted) {
          setScreen('auth');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setAuthReady(true);
        }
      }
    };

    initAuth();

    // Auth state değişikliklerini dinle
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted || !authReady) return;

        if (event === 'SIGNED_IN' && session?.user) {
          const { data: profile } = await getProfile(session.user.id);
          if (profile && isMounted) {
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
          if (isMounted) {
            setUser(null);
            setScreen('auth');
            setCurrentRoomId('');
          }
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          // Token yenilendiğinde sadece session'ı güncelle, ekranı değiştirme
          const { data: profile } = await getProfile(session.user.id);
          if (profile && isMounted) {
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
            // Ekranı değiştirme! Kullanıcı neredeyse orada kalsın
          }
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auth hazır olana kadar authReady'yi takip et
  useEffect(() => {
    if (authReady && screen === 'loading') {
      // 3 saniye içinde hala loading'deyse auth'a yönlendir
      const timeout = setTimeout(() => {
        setScreen('auth');
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [authReady, screen]);

  const handleSoloStart = (roomId: string) => {
    setCurrentRoomId(roomId);
    setScreen('game');
  };

  const handleRoomCreated = (roomId: string) => {
    setCurrentRoomId(roomId);
    setScreen('lobby');
  };

  const handleRoomJoined = (roomId: string) => {
    setCurrentRoomId(roomId);
    setScreen('lobby');
  };

  const handleGameStart = (roomId: string) => {
    setCurrentRoomId(roomId);
    setScreen('game');
  };

  const handleBackToMenu = () => {
    setCurrentRoomId('');
    setScreen('menu');
  };

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
