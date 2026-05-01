// components/game/GameMap.tsx
'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { GameState, GamePlayer, MapCell } from '@/lib/types';
import { getBorderNeighbors } from '@/lib/mapGenerator';

interface GameMapProps {
  gameState: GameState;
  currentPlayerId: string;
  onCountryClick: (playerId: string) => void;
  selectedTarget: GamePlayer | null;
}

const CELL_SIZE = 16;
const SEA_COLOR = '#1e3a5f';
const SEA_BORDER_COLOR = '#2a4a70';
const GRID_COLOR = 'rgba(255,255,255,0.05)';
const BORDER_COLOR = 'rgba(0,0,0,0.4)';
const SELECTED_GLOW = 'rgba(255, 215, 0, 0.6)';
const HOVER_OVERLAY = 'rgba(255, 255, 255, 0.15)';
const CAPITAL_COLOR = '#ffd700';

interface CountryLabel {
  playerId: string;
  centerX: number;
  centerY: number;
  player: GamePlayer;
}

export default function GameMap({
  gameState,
  currentPlayerId,
  onCountryClick,
  selectedTarget,
}: GameMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [countryLabels, setCountryLabels] = useState<CountryLabel[]>([]);
  const [scale, setScale] = useState(1);

  const { map, players } = gameState;
  const canvasWidth = map.width * CELL_SIZE;
  const canvasHeight = map.height * CELL_SIZE;

  // Ülke merkezlerini hesapla
  const calculateCountryLabels = useCallback((): CountryLabel[] => {
    const labels: CountryLabel[] = [];

    for (const player of players) {
      if (!player.is_alive) continue;

      let totalX = 0;
      let totalY = 0;
      let count = 0;

      for (let y = 0; y < map.height; y++) {
        for (let x = 0; x < map.width; x++) {
          if (map.cells[y][x].owner_id === player.id) {
            totalX += x;
            totalY += y;
            count++;
          }
        }
      }

      if (count > 0) {
        labels.push({
          playerId: player.id,
          centerX: (totalX / count) * CELL_SIZE + CELL_SIZE / 2,
          centerY: (totalY / count) * CELL_SIZE + CELL_SIZE / 2,
          player,
        });
      }
    }

    return labels;
  }, [map, players]);

  // Ülke sınırlarını çiz
  const drawBorders = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      ctx.strokeStyle = BORDER_COLOR;
      ctx.lineWidth = 1;

      for (let y = 0; y < map.height; y++) {
        for (let x = 0; x < map.width; x++) {
          const cell = map.cells[y][x];
          if (!cell.owner_id) continue;

          const px = x * CELL_SIZE;
          const py = y * CELL_SIZE;

          // Sağ komşu farklıysa
          if (x < map.width - 1) {
            const right = map.cells[y][x + 1];
            if (right.owner_id !== cell.owner_id) {
              ctx.beginPath();
              ctx.moveTo(px + CELL_SIZE, py);
              ctx.lineTo(px + CELL_SIZE, py + CELL_SIZE);
              ctx.stroke();
            }
          }

          // Alt komşu farklıysa
          if (y < map.height - 1) {
            const bottom = map.cells[y + 1][x];
            if (bottom.owner_id !== cell.owner_id) {
              ctx.beginPath();
              ctx.moveTo(px, py + CELL_SIZE);
              ctx.lineTo(px + CELL_SIZE, py + CELL_SIZE);
              ctx.stroke();
            }
          }

          // Sol kenar
          if (x === 0 && cell.owner_id) {
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(px, py + CELL_SIZE);
            ctx.stroke();
          }

          // Üst kenar
          if (y === 0 && cell.owner_id) {
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(px + CELL_SIZE, py);
            ctx.stroke();
          }

          // Sağ kenar
          if (x === map.width - 1 && cell.owner_id) {
            ctx.beginPath();
            ctx.moveTo(px + CELL_SIZE, py);
            ctx.lineTo(px + CELL_SIZE, py + CELL_SIZE);
            ctx.stroke();
          }

          // Alt kenar
          if (y === map.height - 1 && cell.owner_id) {
            ctx.beginPath();
            ctx.moveTo(px, py + CELL_SIZE);
            ctx.lineTo(px + CELL_SIZE, py + CELL_SIZE);
            ctx.stroke();
          }
        }
      }
    },
    [map]
  );

  // Hover efekti
  const drawHoverEffect = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      if (!hoveredCountry) return;

      ctx.fillStyle = HOVER_OVERLAY;
      for (let y = 0; y < map.height; y++) {
        for (let x = 0; x < map.width; x++) {
          if (map.cells[y][x].owner_id === hoveredCountry) {
            ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
          }
        }
      }
    },
    [hoveredCountry, map]
  );

  // Seçili hedef efekti
  const drawSelectedTarget = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      if (!selectedTarget) return;

      // Parlayan sınır
      ctx.strokeStyle = SELECTED_GLOW;
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 3]);

      for (let y = 0; y < map.height; y++) {
        for (let x = 0; x < map.width; x++) {
          const cell = map.cells[y][x];
          if (cell.owner_id !== selectedTarget.id) continue;

          const px = x * CELL_SIZE;
          const py = y * CELL_SIZE;

          // Sağ komşu farklıysa
          if (x === map.width - 1 || map.cells[y][x + 1].owner_id !== selectedTarget.id) {
            ctx.beginPath();
            ctx.moveTo(px + CELL_SIZE, py);
            ctx.lineTo(px + CELL_SIZE, py + CELL_SIZE);
            ctx.stroke();
          }

          // Alt komşu farklıysa
          if (y === map.height - 1 || map.cells[y + 1][x].owner_id !== selectedTarget.id) {
            ctx.beginPath();
            ctx.moveTo(px, py + CELL_SIZE);
            ctx.lineTo(px + CELL_SIZE, py + CELL_SIZE);
            ctx.stroke();
          }

          // Sol komşu farklıysa
          if (x === 0 || map.cells[y][x - 1].owner_id !== selectedTarget.id) {
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(px, py + CELL_SIZE);
            ctx.stroke();
          }

          // Üst komşu farklıysa
          if (y === 0 || map.cells[y - 1][x].owner_id !== selectedTarget.id) {
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(px + CELL_SIZE, py);
            ctx.stroke();
          }
        }
      }

      ctx.setLineDash([]);
    },
    [selectedTarget, map]
  );

  // Başkent işareti
  const drawCapitals = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      for (let y = 0; y < map.height; y++) {
        for (let x = 0; x < map.width; x++) {
          if (map.cells[y][x].is_capital) {
            const px = x * CELL_SIZE + CELL_SIZE / 2;
            const py = y * CELL_SIZE + CELL_SIZE / 2;

            // Yıldız çiz
            ctx.fillStyle = CAPITAL_COLOR;
            ctx.font = `${CELL_SIZE - 2}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('★', px, py);
          }
        }
      }
    },
    [map]
  );

  // Ana render fonksiyonu
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Temizle
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Hücreleri çiz
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const cell = map.cells[y][x];
        const px = x * CELL_SIZE;
        const py = y * CELL_SIZE;

        if (cell.type === 'sea') {
          // Deniz
          ctx.fillStyle = SEA_COLOR;
          ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);

          // Deniz grid çizgisi
          ctx.strokeStyle = SEA_BORDER_COLOR;
          ctx.lineWidth = 0.5;
          ctx.strokeRect(px, py, CELL_SIZE, CELL_SIZE);
        } else if (cell.owner_id) {
          // Ülke toprağı
          const player = players.find((p) => p.id === cell.owner_id);
          if (player) {
            ctx.fillStyle = player.color;
            ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);

            // Grid çizgisi
            ctx.strokeStyle = GRID_COLOR;
            ctx.lineWidth = 0.5;
            ctx.strokeRect(px, py, CELL_SIZE, CELL_SIZE);

            // Kendi topraklarımıza hafif parlaklık
            if (cell.owner_id === currentPlayerId) {
              ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
              ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
            }
          }
        }
      }
    }

    // Efektler
    drawBorders(ctx);
    drawHoverEffect(ctx);
    drawSelectedTarget(ctx);
    drawCapitals(ctx);

  }, [map, players, currentPlayerId, canvasWidth, canvasHeight, drawBorders, drawHoverEffect, drawSelectedTarget, drawCapitals]);

  // İlk render ve güncelleme
  useEffect(() => {
    render();
    const labels = calculateCountryLabels();
    setCountryLabels(labels);
  }, [render, calculateCountryLabels]);

  // Ölçek hesapla
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth - 32;
        const newScale = Math.min(1, containerWidth / canvasWidth);
        setScale(newScale);
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [canvasWidth]);

  // Mouse olayları
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvasWidth / rect.width;
    const scaleY = canvasHeight / rect.height;

    const x = Math.floor((e.clientX - rect.left) * scaleX / CELL_SIZE);
    const y = Math.floor((e.clientY - rect.top) * scaleY / CELL_SIZE);

    if (x >= 0 && x < map.width && y >= 0 && y < map.height) {
      const cell = map.cells[y][x];
      if (cell.owner_id && cell.owner_id !== currentPlayerId) {
        setHoveredCountry(cell.owner_id);
      } else {
        setHoveredCountry(null);
      }
    }
  };

  const handleMouseLeave = () => {
    setHoveredCountry(null);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvasWidth / rect.width;
    const scaleY = canvasHeight / rect.height;

    const x = Math.floor((e.clientX - rect.left) * scaleX / CELL_SIZE);
    const y = Math.floor((e.clientY - rect.top) * scaleY / CELL_SIZE);

    if (x >= 0 && x < map.width && y >= 0 && y < map.height) {
      const cell = map.cells[y][x];
      if (cell.owner_id && cell.owner_id !== currentPlayerId) {
        onCountryClick(cell.owner_id);
      }
    }
  };

  return (
    <div ref={containerRef} className="game-map-container relative">
      {/* Canvas */}
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          width: canvasWidth,
          height: canvasHeight,
        }}
      >
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          style={{
            cursor: hoveredCountry ? 'pointer' : 'default',
            display: 'block',
          }}
        />

        {/* Ülke Etiketleri */}
        {countryLabels.map((label) => (
          <div
            key={label.playerId}
            className="country-label"
            style={{
              left: label.centerX,
              top: label.centerY,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className="country-name">{label.player.country_name}</div>
            <div className="country-stats">
              {label.player.nickname}
            </div>
            <div className="country-stats">
              📦{label.player.territories}
              {label.player.fleet_count > 0 && ` 🚢${label.player.fleet_count}`}
              {label.player.air_force_count > 0 && ` ✈️${label.player.air_force_count}`}
            </div>
          </div>
        ))}
      </div>

      {/* Harita Alt Bilgi */}
      <div className="absolute bottom-2 right-2 glass rounded-lg px-3 py-1 text-xs text-slate-500">
        {map.width}x{map.height} • {players.filter(p => p.is_alive).length} ülke
      </div>

      {/* Hover Bilgisi */}
      {hoveredCountry && (
        <div className="absolute top-2 left-2 glass rounded-lg px-3 py-2 animate-fade-in">
          {(() => {
            const hPlayer = players.find(p => p.id === hoveredCountry);
            if (!hPlayer) return null;

            const borders = getBorderNeighbors(
              map.cells,
              map.width,
              map.height,
              currentPlayerId
            );
            const borderInfo = borders.find(b => b.playerId === hoveredCountry);

            return (
              <div className="text-xs">
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="color-dot"
                    style={{ backgroundColor: hPlayer.color }}
                  />
                  <span className="font-bold text-white">
                    {hPlayer.country_name}
                  </span>
                </div>
                <p className="text-slate-400">
                  Komutan: {hPlayer.nickname}
                </p>
                <p className="text-slate-400">
                  📦 {hPlayer.territories} kare • 🚢 {hPlayer.fleet_count} • ✈️ {hPlayer.air_force_count}
                </p>
                {borderInfo && (
                  <div className="flex gap-2 mt-1">
                    {borderInfo.hasLandBorder && (
                      <span className="badge badge-green text-[10px] py-0">🏔️ Kara</span>
                    )}
                    {borderInfo.hasSeaBorder && (
                      <span className="badge badge-blue text-[10px] py-0">🚢 Deniz</span>
                    )}
                    <span className="badge badge-gold text-[10px] py-0">✈️ Hava</span>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}