// components/game/GameScreen.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore, useUIStore } from '@/lib/store';
import {
  supabase,
  getGameState,
  updateGameState,
  createGameState as createGameStateDB,
  getRoomPlayers,
  getRoom,
  sendMessage,
  getChatMessages,
  addBattleLog,
  updateProfile,
} from '@/lib/supabase';
import {
  GameState,
  GamePlayer,
  AttackAction,
  ProductionAction,
  ChatMessage,
  RoomSettings,
  DEFAULT_ROOM_SETTINGS,
  COUNTRY_COLORS,
  ROBOT_NAMES,
  ROBOT_COUNTRY_NAMES,
} from '@/lib/types';
import {
  createGameState,
  executeAttack,
  executeProduction,
  nextTurn,
  surrender,
} from '@/lib/gameEngine';
import { getAIAction, shouldSurrender } from '@/lib/aiPlayer';
import GameMap from './GameMap';
import AttackPanel from './AttackPanel';
import ProductionPanel from './ProductionPanel';
import TurnIndicator from './TurnIndicator';
import PlayerSidebar from './PlayerSidebar';
import BattleLog from './BattleLog';
import ChatBox from './ChatBox';
import CoinFlip from '../ui/CoinFlip';
import GameStatsModal from './GameStatsModal';
import LoadingScreen from '../ui/LoadingScreen';
import HowToPlay from '../menu/HowToPlay';

interface GameScreenProps {
  roomId: string;
  onBackToMenu: () => void;
}

type GamePhase = 'loading' | 'playing' | 'attacking' | 'producing' | 'coin_flip' | 'game_over';

export default function GameScreen({ roomId, onBackToMenu }: GameScreenProps) {
  const { user } = useAuthStore();
  const { showNotification } = useUIStore();

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [phase, setPhase] = useState<GamePhase>('loading');
  const [myPlayerId, setMyPlayerId] = useState<string>('');

  const [selectedTarget, setSelectedTarget] = useState<GamePlayer | null>(null);
  const [showSurrenderConfirm, setShowSurrenderConfirm] = useState(false);
  const [showBattleLog, setShowBattleLog] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Coin flip - ayrı: benim ve başkasının
  const [myCoinFlip, setMyCoinFlip] = useState<{
    choice: 'sword' | 'shield';
    result: 'sword' | 'shield';
    success: boolean;
  } | null>(null);

  const [otherCoinFlip, setOtherCoinFlip] = useState<{
    choice: 'sword' | 'shield';
    result: 'sword' | 'shield';
    success: boolean;
    attackerName: string;
    defenderName: string;
  } | null>(null);

  useEffect(() => {
    initGame();
    setupSubscriptions();
    return () => {
      supabase.removeAllChannels();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const initGame = async () => {
    if (!user) return;

    const { data: existingState } = await getGameState(roomId);

    if (existingState) {
      const state: GameState = {
        room_id: roomId,
        map: existingState.map_data as GameState['map'],
        players: existingState.players_data as GamePlayer[],
        colonies: (existingState.colonies_data as GameState['colonies']) || [],
        current_turn_player_id: existingState.current_turn_player_id,
        turn_number: existingState.turn_number,
        turn_start_time: existingState.turn_start_time,
        turn_timer: 60,
        settings: DEFAULT_ROOM_SETTINGS,
        status: existingState.status as 'playing' | 'finished',
        winner_id: existingState.winner_id,
        battle_log: [],
      };

      const { data: roomData } = await getRoom(roomId);
      if (roomData?.settings) {
        const settings = roomData.settings as RoomSettings;
        state.settings = settings;
        state.turn_timer = settings.turn_timer;
      }

      setGameState(state);
      setMyPlayerId(user.id);
      setPhase(state.status === 'finished' ? 'game_over' : 'playing');

      if (state.status === 'finished') {
        setShowStats(true);
      }
    } else {
      await createNewGame();
    }

    const { data: msgs } = await getChatMessages(roomId);
    if (msgs) {
      setChatMessages(
        msgs.map((m) => ({
          id: m.id,
          room_id: m.room_id,
          player_id: m.player_id,
          player_nickname: m.player_nickname,
          player_color: m.player_color || '#ffffff',
          message: m.message,
          is_emoji: m.is_emoji,
          timestamp: new Date(m.created_at).getTime(),
        }))
      );
    }
  };

  const createNewGame = async () => {
    if (!user) return;

    const { data: roomData } = await getRoom(roomId);
    if (!roomData) return;

    const settings = (roomData.settings || DEFAULT_ROOM_SETTINGS) as RoomSettings;

    const { data: roomPlayers } = await getRoomPlayers(roomId);
    if (!roomPlayers) return;

    const players = roomPlayers.map((p, i) => ({
      id: p.user_id,
      nickname: p.nickname,
      country_name: p.country_name,
      color: p.color || COUNTRY_COLORS[i % COUNTRY_COLORS.length],
      is_robot: p.is_robot || false,
    }));

    const robotCount = settings.robot_count || 0;
    for (let i = 0; i < robotCount; i++) {
      const robotIdx = players.length;
      players.push({
        id: `robot_${i}_${Date.now()}`,
        nickname: ROBOT_NAMES[i % ROBOT_NAMES.length],
        country_name: ROBOT_COUNTRY_NAMES[i % ROBOT_COUNTRY_NAMES.length],
        color: COUNTRY_COLORS[robotIdx % COUNTRY_COLORS.length],
        is_robot: true,
      });
    }

    const newGameState = createGameState(roomId, players, settings);
    newGameState.turn_start_time = Date.now();

    await createGameStateDB(roomId, {
      map_data: newGameState.map,
      players_data: newGameState.players,
      colonies_data: newGameState.colonies,
      current_turn_player_id: newGameState.current_turn_player_id,
      turn_number: newGameState.turn_number,
      turn_start_time: newGameState.turn_start_time,
      status: 'playing',
      winner_id: null,
    });

    setGameState(newGameState);
    setMyPlayerId(user.id);
    setPhase('playing');
  };

  const setupSubscriptions = () => {
    supabase
      .channel(`game:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_states', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const newData = payload.new as Record<string, unknown>;
          if (newData && gameState) {
            const updatedState: GameState = {
              ...gameState,
              map: newData.map_data as GameState['map'],
              players: newData.players_data as GamePlayer[],
              colonies: (newData.colonies_data as GameState['colonies']) || [],
              current_turn_player_id: newData.current_turn_player_id as string,
              turn_number: newData.turn_number as number,
              turn_start_time: newData.turn_start_time as number,
              status: newData.status as 'playing' | 'finished',
              winner_id: newData.winner_id as string | null,
            };
            setGameState(updatedState);
            if (updatedState.status === 'finished') {
              setPhase('game_over');
              setShowStats(true);
            }
          }
        }
      )
      .subscribe();

    supabase
      .channel(`game-chat:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const newMsg = payload.new as Record<string, unknown>;
          if (newMsg) {
            const chatMsg: ChatMessage = {
              id: newMsg.id as string,
              room_id: newMsg.room_id as string,
              player_id: newMsg.player_id as string,
              player_nickname: newMsg.player_nickname as string,
              player_color: (newMsg.player_color as string) || '#ffffff',
              message: newMsg.message as string,
              is_emoji: newMsg.is_emoji as boolean,
              timestamp: new Date(newMsg.created_at as string).getTime(),
            };
            setChatMessages((prev) => [...prev, chatMsg]);
            if (!showChat) {
              setUnreadCount((prev) => prev + 1);
            }
          }
        }
      )
      .subscribe();
  };

  const saveGameState = async (state: GameState) => {
    await updateGameState(roomId, {
      map_data: state.map,
      players_data: state.players,
      colonies_data: state.colonies,
      current_turn_player_id: state.current_turn_player_id,
      turn_number: state.turn_number,
      turn_start_time: state.turn_start_time,
      status: state.status,
      winner_id: state.winner_id,
    });
  };

  // ==================== OYUNCU AKSİYONLARI ====================

  const isMyTurn = gameState?.current_turn_player_id === myPlayerId;
  const myPlayer = gameState?.players.find((p) => p.id === myPlayerId);
  const currentTurnPlayer = gameState?.players.find(
    (p) => p.id === gameState.current_turn_player_id
  );

  const handleCountryClick = (playerId: string) => {
    if (!isMyTurn || !gameState || phase !== 'playing') return;
    const targetPlayer = gameState.players.find((p) => p.id === playerId);
    if (!targetPlayer || !targetPlayer.is_alive) return;
    setSelectedTarget(targetPlayer);
    setPhase('attacking');
  };

  // Saldırı
  const handleAttack = async (action: AttackAction) => {
    if (!gameState) return;

    setPhase('coin_flip');

    const stateCopy = JSON.parse(JSON.stringify(gameState)) as GameState;
    const { result, updatedState } = executeAttack(stateCopy, action);

    // BENİM saldırım - tam ekran coin flip
    setMyCoinFlip({
      choice: action.coin_choice,
      result: result.coin_result,
      success: result.success,
    });

    setTimeout(async () => {
      setGameState(updatedState);

      const lastLog = updatedState.battle_log[updatedState.battle_log.length - 1];
      if (lastLog) {
        await addBattleLog(roomId, updatedState.turn_number, lastLog as unknown as Record<string, unknown>);
      }

      if (result.success) {
        showNotification(`⚔️ ${result.squares_changed} kare aldınız!`, 'success');
      } else {
        showNotification(`🛡️ Saldırı başarısız! ${result.squares_changed} kare kaybettiniz.`, 'error');
      }

      if (updatedState.status === 'finished') {
        setPhase('game_over');
        setShowStats(true);
        await updatePlayerStats(updatedState);
        await saveGameState(updatedState);
      } else {
        const nextState = nextTurn(updatedState);
        nextState.turn_start_time = Date.now();
        setGameState(nextState);
        await saveGameState(nextState);

        setTimeout(() => {
          handleRobotTurn(nextState);
        }, 1000);
      }

      setMyCoinFlip(null);
      setSelectedTarget(null);
      setPhase(updatedState.status === 'finished' ? 'game_over' : 'playing');
    }, 4500);
  };

  // Üretim
  const handleProduce = async (action: ProductionAction) => {
    if (!gameState) return;

    setPhase('coin_flip');

    const stateCopy = JSON.parse(JSON.stringify(gameState)) as GameState;
    const { result, updatedState } = executeProduction(stateCopy, action);

    setMyCoinFlip({
      choice: action.coin_choice,
      result: result.coin_result,
      success: result.success,
    });

    setTimeout(async () => {
      setGameState(updatedState);

      const lastLog = updatedState.battle_log[updatedState.battle_log.length - 1];
      if (lastLog) {
        await addBattleLog(roomId, updatedState.turn_number, lastLog as unknown as Record<string, unknown>);
      }

      if (result.success) {
        const typeName = action.type === 'fleet' ? 'Donanma' : 'Hava Kuvveti';
        showNotification(`🏭 ${action.amount} ${typeName} üretildi!`, 'success');
      } else {
        showNotification(`🚫 Üretim başarısız! ${result.ban_turns} tur yasak.`, 'error');
      }

      const nextState = nextTurn(updatedState);
      nextState.turn_start_time = Date.now();
      setGameState(nextState);
      await saveGameState(nextState);

      setTimeout(() => {
        handleRobotTurn(nextState);
      }, 1000);

      setMyCoinFlip(null);
      setPhase('playing');
    }, 4500);
  };

  // Teslim ol
  const handleSurrender = async () => {
    if (!gameState || !myPlayerId) return;

    const updatedState = surrender(
      JSON.parse(JSON.stringify(gameState)) as GameState,
      myPlayerId
    );

    setGameState(updatedState);
    setShowSurrenderConfirm(false);
    showNotification('🏳️ Teslim oldunuz.', 'warning');

    if (updatedState.status === 'finished') {
      setPhase('game_over');
      setShowStats(true);
      await updatePlayerStats(updatedState);
    }

    await saveGameState(updatedState);
  };

  // Tur geç
  const handleSkipTurn = async () => {
    if (!gameState || !isMyTurn) return;

    const nextState = nextTurn(JSON.parse(JSON.stringify(gameState)) as GameState);
    nextState.turn_start_time = Date.now();
    setGameState(nextState);
    await saveGameState(nextState);
    showNotification('⏭️ Tur geçildi.', 'info');

    setTimeout(() => {
      handleRobotTurn(nextState);
    }, 1000);
  };

  const handleTimeUp = useCallback(() => {
    if (isMyTurn && phase === 'playing') {
      handleSkipTurn();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMyTurn, phase]);

  // ==================== ROBOT TURU ====================

  const handleRobotTurn = async (state: GameState) => {
    const currentPlayer = state.players.find(
      (p) => p.id === state.current_turn_player_id
    );

    if (!currentPlayer || !currentPlayer.is_robot || !currentPlayer.is_alive) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (shouldSurrender(currentPlayer, state)) {
      const updatedState = surrender(
        JSON.parse(JSON.stringify(state)) as GameState,
        currentPlayer.id
      );
      setGameState(updatedState);

      if (updatedState.status === 'finished') {
        setPhase('game_over');
        setShowStats(true);
        await updatePlayerStats(updatedState);
        await saveGameState(updatedState);
        return;
      }

      const nextState = nextTurn(updatedState);
      nextState.turn_start_time = Date.now();
      setGameState(nextState);
      await saveGameState(nextState);

      setTimeout(() => handleRobotTurn(nextState), 1000);
      return;
    }

    const aiAction = getAIAction(currentPlayer, state);
    const stateCopy = JSON.parse(JSON.stringify(state)) as GameState;

    if (aiAction.action_type === 'attack' && aiAction.attack) {
      const { result, updatedState } = executeAttack(stateCopy, aiAction.attack);

      // BAŞKASININ coin flip'i - küçük köşe gösterimi
      const targetPlayer = state.players.find(p => p.id === aiAction.attack!.defender_id);
      setOtherCoinFlip({
        choice: aiAction.attack.coin_choice,
        result: result.coin_result,
        success: result.success,
        attackerName: currentPlayer.country_name,
        defenderName: targetPlayer?.country_name || '',
      });

      setTimeout(async () => {
        setGameState(updatedState);

        const lastLog = updatedState.battle_log[updatedState.battle_log.length - 1];
        if (lastLog) {
          await addBattleLog(roomId, updatedState.turn_number, lastLog as unknown as Record<string, unknown>);
        }

        if (updatedState.status === 'finished') {
          setPhase('game_over');
          setShowStats(true);
          await updatePlayerStats(updatedState);
          await saveGameState(updatedState);
          setOtherCoinFlip(null);
          return;
        }

        const nextState = nextTurn(updatedState);
        nextState.turn_start_time = Date.now();
        setGameState(nextState);
        await saveGameState(nextState);

        setOtherCoinFlip(null);

        setTimeout(() => handleRobotTurn(nextState), 1000);
      }, 2500);
    } else if (aiAction.action_type === 'produce' && aiAction.production) {
      const { result, updatedState } = executeProduction(stateCopy, aiAction.production);

      setOtherCoinFlip({
        choice: aiAction.production.coin_choice,
        result: result.coin_result,
        success: result.success,
        attackerName: currentPlayer.country_name,
        defenderName: aiAction.production.type === 'fleet' ? 'Donanma Üretimi' : 'Hava Üretimi',
      });

      setTimeout(async () => {
        setGameState(updatedState);

        const lastLog = updatedState.battle_log[updatedState.battle_log.length - 1];
        if (lastLog) {
          await addBattleLog(roomId, updatedState.turn_number, lastLog as unknown as Record<string, unknown>);
        }

        const nextState = nextTurn(updatedState);
        nextState.turn_start_time = Date.now();
        setGameState(nextState);
        await saveGameState(nextState);

        setOtherCoinFlip(null);

        setTimeout(() => handleRobotTurn(nextState), 1000);
      }, 2500);
    } else {
      const nextState = nextTurn(stateCopy);
      nextState.turn_start_time = Date.now();
      setGameState(nextState);
      await saveGameState(nextState);

      setTimeout(() => handleRobotTurn(nextState), 1000);
    }
  };

  // ==================== İSTATİSTİK GÜNCELLEME ====================

  const updatePlayerStats = async (state: GameState) => {
    if (!user) return;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        const isWinner = state.winner_id === user.id;
        await updateProfile(user.id, {
          total_games: (profile.total_games || 0) + 1,
          total_wins: (profile.total_wins || 0) + (isWinner ? 1 : 0),
          total_conquests:
            (profile.total_conquests || 0) +
            state.players.filter(
              (p) =>
                !p.is_alive &&
                state.battle_log.some(
                  (log) =>
                    log.attacker_name ===
                      state.players.find((pp) => pp.id === user.id)?.country_name &&
                    log.defender_name === p.country_name
                )
            ).length,
        });
      }
    } catch (err) {
      console.error('Stats update error:', err);
    }
  };

  // ==================== CHAT ====================

  const handleSendMessage = async (message: string, isEmoji: boolean) => {
    if (!user || !myPlayer) return;
    await sendMessage(roomId, user.id, myPlayer.nickname, myPlayer.color, message, isEmoji);
  };

  const handleChatToggle = () => {
    setShowChat(!showChat);
    if (!showChat) setUnreadCount(0);
  };

  // ==================== RENDER ====================

  if (phase === 'loading' || !gameState) {
    return (
      <LoadingScreen
        message="Harita oluşturuluyor..."
        submessage="Ülkeler yerleştiriliyor, sınırlar çiziliyor..."
      />
    );
  }

  return (
    <div className="h-screen bg-military-pattern flex flex-col overflow-hidden">
      {/* Üst Bar */}
      <div className="flex-shrink-0 glass border-b border-slate-700/50 px-4 py-2">
        <div className="flex items-center justify-between max-w-full">
          <div className="flex items-center gap-3">
            {currentTurnPlayer && (
              <TurnIndicator
                currentTurnPlayer={currentTurnPlayer}
                isMyTurn={isMyTurn}
                turnNumber={gameState.turn_number}
                turnTimer={gameState.turn_timer}
                turnStartTime={gameState.turn_start_time}
                onTimeUp={handleTimeUp}
              />
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHowToPlay(true)}
              className="btn-icon text-sm"
              title="Nasıl Oynanır?"
            >
              ❓
            </button>

            <BattleLog
              logs={gameState.battle_log}
              isOpen={false}
              onToggle={() => setShowBattleLog(!showBattleLog)}
            />

            <ChatBox
              messages={chatMessages}
              currentPlayerId={myPlayerId}
              isOpen={false}
              unreadCount={unreadCount}
              onToggle={handleChatToggle}
              onSendMessage={handleSendMessage}
            />

            {isMyTurn && phase === 'playing' && myPlayer?.is_alive && (
              <div className="flex items-center gap-2 ml-2">
                <button
                  onClick={() => setPhase('producing')}
                  className="btn-secondary text-xs py-2 px-3 flex items-center gap-1"
                >
                  <span>🏭</span>
                  <span className="hidden md:inline">Üret</span>
                </button>
                <button
                  onClick={handleSkipTurn}
                  className="btn-secondary text-xs py-2 px-3 flex items-center gap-1"
                >
                  <span>⏭️</span>
                  <span className="hidden md:inline">Pas</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ana İçerik */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sol - Oyuncu Sidebar */}
        <div className="w-64 flex-shrink-0 p-3 overflow-y-auto hidden lg:block">
          <PlayerSidebar
            gameState={gameState}
            currentPlayerId={myPlayerId}
            onSurrender={handleSurrender}
            showSurrenderConfirm={showSurrenderConfirm}
            setShowSurrenderConfirm={setShowSurrenderConfirm}
          />
        </div>

        {/* Orta - Harita */}
        <div className="flex-1 p-3 overflow-auto">
          <GameMap
            gameState={gameState}
            currentPlayerId={myPlayerId}
            onCountryClick={handleCountryClick}
            selectedTarget={selectedTarget}
          />

          <div className="lg:hidden mt-3">
            <PlayerSidebar
              gameState={gameState}
              currentPlayerId={myPlayerId}
              onSurrender={handleSurrender}
              showSurrenderConfirm={showSurrenderConfirm}
              setShowSurrenderConfirm={setShowSurrenderConfirm}
            />
          </div>
        </div>

        {/* Sağ - Paneller */}
        <div className="w-80 flex-shrink-0 p-3 overflow-y-auto hidden md:block">
          {phase === 'attacking' && selectedTarget && myPlayer && (
            <AttackPanel
              gameState={gameState}
              currentPlayer={myPlayer}
              target={selectedTarget}
              onAttack={handleAttack}
              onCancel={() => {
                setPhase('playing');
                setSelectedTarget(null);
              }}
            />
          )}

          {phase === 'producing' && myPlayer && (
            <ProductionPanel
              gameState={gameState}
              currentPlayer={myPlayer}
              onProduce={handleProduce}
              onCancel={() => setPhase('playing')}
            />
          )}

          {phase === 'playing' && !selectedTarget && (
            <>
              {showBattleLog ? (
                <BattleLog
                  logs={gameState.battle_log}
                  isOpen={true}
                  onToggle={() => setShowBattleLog(false)}
                />
              ) : showChat ? (
                <ChatBox
                  messages={chatMessages}
                  currentPlayerId={myPlayerId}
                  isOpen={true}
                  unreadCount={0}
                  onToggle={handleChatToggle}
                  onSendMessage={handleSendMessage}
                />
              ) : (
                <div className="glass rounded-2xl p-4">
                  <h3 className="font-bold text-amber-400 text-sm mb-3">ℹ️ Bilgi</h3>
                  {isMyTurn && myPlayer?.is_alive ? (
                    <div className="space-y-3 text-sm text-slate-400">
                      <p>🎯 Haritada bir ülkeye tıklayarak <span className="text-amber-400 font-bold">saldır</span></p>
                      <p>🏭 Üst menüden <span className="text-amber-400 font-bold">üretim</span> yap</p>
                      <p>⏭️ Veya turunu <span className="text-amber-400 font-bold">geç</span></p>
                    </div>
                  ) : myPlayer?.is_alive ? (
                    <p className="text-slate-500 text-sm">
                      ⏳ {currentTurnPlayer?.nickname || 'Rakip'} oynuyor, sıranı bekle...
                    </p>
                  ) : (
                    <p className="text-slate-500 text-sm">
                      👀 İzleyici olarak devam ediyorsunuz
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobil Alt Paneller */}
      {phase === 'attacking' && selectedTarget && myPlayer && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/80 flex items-end">
          <div className="w-full max-h-[80vh] overflow-y-auto">
            <AttackPanel
              gameState={gameState}
              currentPlayer={myPlayer}
              target={selectedTarget}
              onAttack={handleAttack}
              onCancel={() => {
                setPhase('playing');
                setSelectedTarget(null);
              }}
            />
          </div>
        </div>
      )}

      {phase === 'producing' && myPlayer && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/80 flex items-end">
          <div className="w-full max-h-[80vh] overflow-y-auto">
            <ProductionPanel
              gameState={gameState}
              currentPlayer={myPlayer}
              onProduce={handleProduce}
              onCancel={() => setPhase('playing')}
            />
          </div>
        </div>
      )}

      {/* BENİM Coin Flip - Tam Ekran */}
      {myCoinFlip && (
        <CoinFlip
          choice={myCoinFlip.choice}
          result={myCoinFlip.result}
          success={myCoinFlip.success}
          onComplete={() => {}}
          isMyAction={true}
        />
      )}

      {/* BAŞKASININ Coin Flip - Küçük Köşe */}
      {otherCoinFlip && (
        <CoinFlip
          choice={otherCoinFlip.choice}
          result={otherCoinFlip.result}
          success={otherCoinFlip.success}
          onComplete={() => {}}
          isMyAction={false}
          attackerName={otherCoinFlip.attackerName}
          defenderName={otherCoinFlip.defenderName}
        />
      )}

      {/* Oyun Sonu */}
      {showStats && gameState.status === 'finished' && (
        <GameStatsModal
          gameState={gameState}
          currentPlayerId={myPlayerId}
          onClose={() => setShowStats(false)}
          onBackToMenu={onBackToMenu}
        />
      )}

      {/* Nasıl Oynanır */}
      {showHowToPlay && (
        <HowToPlay onClose={() => setShowHowToPlay(false)} />
      )}
    </div>
  );
}