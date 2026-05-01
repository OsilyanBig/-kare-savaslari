// lib/mapGenerator.ts
import { GameMap, MapCell, GamePlayer } from './types';

interface MapConfig {
  playerCount: number;
  minTerritory: number;
  maxTerritory: number;
  seaPercentage: number;
}

const DEFAULT_CONFIG: MapConfig = {
  playerCount: 4,
  minTerritory: 70,
  maxTerritory: 120,
  seaPercentage: 0.20,
};

// Harita boyutunu oyuncu sayısına göre hesapla
function calculateMapSize(playerCount: number, avgTerritory: number, seaPercentage: number): { width: number; height: number } {
  const totalLandCells = playerCount * avgTerritory;
  const totalCells = Math.ceil(totalLandCells / (1 - seaPercentage));
  const side = Math.ceil(Math.sqrt(totalCells));
  // En az 20x20, en fazla 50x50
  const size = Math.max(20, Math.min(50, side));
  return { width: size, height: size };
}

// Boş harita oluştur
function createEmptyMap(width: number, height: number): MapCell[][] {
  const cells: MapCell[][] = [];
  for (let y = 0; y < height; y++) {
    cells[y] = [];
    for (let x = 0; x < width; x++) {
      cells[y][x] = {
        x,
        y,
        type: 'land',
        owner_id: null,
        is_capital: false,
      };
    }
  }
  return cells;
}

// Tek parça bağlantılı deniz oluştur
function generateSea(cells: MapCell[][], width: number, height: number, seaPercentage: number): void {
  const totalCells = width * height;
  const targetSeaCells = Math.floor(totalCells * seaPercentage);

  // Deniz başlangıç noktası - haritanın bir kenarından başla
  const edge = Math.floor(Math.random() * 4); // 0: üst, 1: sağ, 2: alt, 3: sol
  let startX: number, startY: number;

  switch (edge) {
    case 0: // üst kenar
      startX = Math.floor(Math.random() * width);
      startY = 0;
      break;
    case 1: // sağ kenar
      startX = width - 1;
      startY = Math.floor(Math.random() * height);
      break;
    case 2: // alt kenar
      startX = Math.floor(Math.random() * width);
      startY = height - 1;
      break;
    default: // sol kenar
      startX = 0;
      startY = Math.floor(Math.random() * height);
      break;
  }

  // BFS ile deniz genişlet - tek parça kalacak
  const seaCells: { x: number; y: number }[] = [{ x: startX, y: startY }];
  const visited = new Set<string>();
  visited.add(`${startX},${startY}`);
  cells[startY][startX].type = 'sea';

  let seaCount = 1;
  let frontierIndex = 0;

  while (seaCount < targetSeaCells && frontierIndex < seaCells.length) {
    // Mevcut deniz hücrelerinden rastgele birini seç
    const randomIdx = frontierIndex + Math.floor(Math.random() * Math.min(10, seaCells.length - frontierIndex));
    const actualIdx = Math.min(randomIdx, seaCells.length - 1);
    const current = seaCells[actualIdx];

    // Komşuları kontrol et
    const neighbors = getNeighbors(current.x, current.y, width, height);
    const shuffled = shuffleArray([...neighbors]);

    let expanded = false;
    for (const neighbor of shuffled) {
      const key = `${neighbor.x},${neighbor.y}`;
      if (!visited.has(key) && seaCount < targetSeaCells) {
        // Denizi çok düz yapmamak için rastgelelik ekle
        if (Math.random() < 0.6) {
          visited.add(key);
          cells[neighbor.y][neighbor.x].type = 'sea';
          seaCells.push(neighbor);
          seaCount++;
          expanded = true;
        }
      }
    }

    if (!expanded) {
      frontierIndex++;
    }
  }
}

// Komşu hücreleri getir (4 yön)
function getNeighbors(x: number, y: number, width: number, height: number): { x: number; y: number }[] {
  const neighbors: { x: number; y: number }[] = [];
  if (x > 0) neighbors.push({ x: x - 1, y });
  if (x < width - 1) neighbors.push({ x: x + 1, y });
  if (y > 0) neighbors.push({ x, y: y - 1 });
  if (y < height - 1) neighbors.push({ x, y: y + 1 });
  return neighbors;
}

// Diziyi karıştır (Fisher-Yates)
function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Kara hücrelerini bul
function getLandCells(cells: MapCell[][], width: number, height: number): { x: number; y: number }[] {
  const landCells: { x: number; y: number }[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (cells[y][x].type === 'land') {
        landCells.push({ x, y });
      }
    }
  }
  return landCells;
}

// Başkent noktalarını seç - birbirinden uzak olsun
function selectCapitals(landCells: { x: number; y: number }[], playerCount: number, width: number, height: number): { x: number; y: number }[] {
  const capitals: { x: number; y: number }[] = [];
  const minDistance = Math.floor(Math.min(width, height) / (playerCount + 1));

  // İlk başkenti rastgele seç
  const firstIdx = Math.floor(Math.random() * landCells.length);
  capitals.push(landCells[firstIdx]);

  // Diğer başkentleri birbirinden uzak seç
  for (let i = 1; i < playerCount; i++) {
    let bestCell = landCells[0];
    let bestMinDist = 0;

    // Birçok aday dene, en uzak olanı seç
    const candidates = shuffleArray([...landCells]).slice(0, 100);

    for (const candidate of candidates) {
      // Bu hücrenin tüm mevcut başkentlere olan minimum mesafesini hesapla
      let minDistToCapitals = Infinity;
      for (const cap of capitals) {
        const dist = Math.abs(candidate.x - cap.x) + Math.abs(candidate.y - cap.y);
        minDistToCapitals = Math.min(minDistToCapitals, dist);
      }

      if (minDistToCapitals > bestMinDist) {
        bestMinDist = minDistToCapitals;
        bestCell = candidate;
      }
    }

    // Minimum mesafe çok küçükse uyar ama yine de ekle
    if (bestMinDist < minDistance / 2) {
      // Daha geniş arama yap
      for (const cell of landCells) {
        let minDistToCapitals = Infinity;
        for (const cap of capitals) {
          const dist = Math.abs(cell.x - cap.x) + Math.abs(cell.y - cap.y);
          minDistToCapitals = Math.min(minDistToCapitals, dist);
        }
        if (minDistToCapitals > bestMinDist) {
          bestMinDist = minDistToCapitals;
          bestCell = cell;
        }
      }
    }

    capitals.push(bestCell);
  }

  return capitals;
}

// BFS ile ülke topraklarını genişlet
function expandTerritories(
  cells: MapCell[][],
  capitals: { x: number; y: number }[],
  players: string[],
  minTerritory: number,
  maxTerritory: number,
  width: number,
  height: number
): void {
  // Her oyuncunun sınır hücrelerini tut
  const frontiers: Map<string, { x: number; y: number }[]> = new Map();
  const targetSizes: Map<string, number> = new Map();
  const currentSizes: Map<string, number> = new Map();

  // Başkentleri ata
  for (let i = 0; i < players.length; i++) {
    const playerId = players[i];
    const capital = capitals[i];
    cells[capital.y][capital.x].owner_id = playerId;
    cells[capital.y][capital.x].is_capital = true;
    frontiers.set(playerId, [capital]);
    targetSizes.set(playerId, minTerritory + Math.floor(Math.random() * (maxTerritory - minTerritory + 1)));
    currentSizes.set(playerId, 1);
  }

  // Round-robin genişletme - her oyuncu sırayla 1 hücre alır
  let allDone = false;
  let maxIterations = width * height * 2; // sonsuz döngü koruması

  while (!allDone && maxIterations > 0) {
    allDone = true;
    maxIterations--;

    for (const playerId of players) {
      const current = currentSizes.get(playerId)!;
      const target = targetSizes.get(playerId)!;

      if (current >= target) continue;
      allDone = false;

      const frontier = frontiers.get(playerId)!;
      if (frontier.length === 0) continue;

      // Sınır hücrelerinden rastgele birini seç
      let expanded = false;
      let attempts = 0;

      while (!expanded && attempts < frontier.length * 2) {
        attempts++;
        const randIdx = Math.floor(Math.random() * frontier.length);
        const cell = frontier[randIdx];
        const neighbors = getNeighbors(cell.x, cell.y, width, height);
        const shuffledNeighbors = shuffleArray([...neighbors]);

        for (const neighbor of shuffledNeighbors) {
          const targetCell = cells[neighbor.y][neighbor.x];
          if (targetCell.type === 'land' && targetCell.owner_id === null) {
            targetCell.owner_id = playerId;
            frontier.push(neighbor);
            currentSizes.set(playerId, current + 1);
            expanded = true;
            break;
          }
        }

        // Bu sınır hücresinin etrafında boş yer kalmadıysa listeden çıkar
        if (!expanded) {
          const hasEmpty = neighbors.some(n =>
            cells[n.y][n.x].type === 'land' && cells[n.y][n.x].owner_id === null
          );
          if (!hasEmpty) {
            frontier.splice(randIdx, 1);
          }
        }
      }
    }
  }

  // Kalan sahipsiz kara hücrelerini en yakın ülkeye ver
  assignRemainingLand(cells, players, width, height);
}

// Sahipsiz kara hücrelerini en yakın ülkeye ata
function assignRemainingLand(cells: MapCell[][], players: string[], width: number, height: number): void {
  let hasUnassigned = true;
  let iterations = 0;
  const maxIter = width * height;

  while (hasUnassigned && iterations < maxIter) {
    hasUnassigned = false;
    iterations++;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (cells[y][x].type === 'land' && cells[y][x].owner_id === null) {
          // Komşulardan birine ait mi?
          const neighbors = getNeighbors(x, y, width, height);
          const ownerNeighbors = neighbors.filter(n => cells[n.y][n.x].owner_id !== null);

          if (ownerNeighbors.length > 0) {
            // Rastgele bir komşunun sahibine ver
            const randomOwner = ownerNeighbors[Math.floor(Math.random() * ownerNeighbors.length)];
            cells[y][x].owner_id = cells[randomOwner.y][randomOwner.x].owner_id;
          } else {
            hasUnassigned = true;
          }
        }
      }
    }
  }

  // Hala sahipsiz kalan varsa (ada gibi izole yerler), rastgele bir oyuncuya ver
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (cells[y][x].type === 'land' && cells[y][x].owner_id === null) {
        cells[y][x].owner_id = players[Math.floor(Math.random() * players.length)];
      }
    }
  }
}

// Her oyuncunun toprak sayısını hesapla
export function countTerritories(cells: MapCell[][], width: number, height: number): Map<string, number> {
  const counts = new Map<string, number>();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const owner = cells[y][x].owner_id;
      if (owner) {
        counts.set(owner, (counts.get(owner) || 0) + 1);
      }
    }
  }
  return counts;
}

// İki ülke arasında kara sınırı var mı?
export function hasLandBorder(cells: MapCell[][], width: number, height: number, playerId1: string, playerId2: string): boolean {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (cells[y][x].owner_id === playerId1) {
        const neighbors = getNeighbors(x, y, width, height);
        for (const n of neighbors) {
          if (cells[n.y][n.x].owner_id === playerId2) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

// İki ülke arasında deniz sınırı var mı?
export function hasSeaBorder(cells: MapCell[][], width: number, height: number, playerId1: string, playerId2: string): boolean {
  // Oyuncu 1'in denize komşu hücreleri
  const player1SeaBorder = new Set<string>();

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (cells[y][x].owner_id === playerId1) {
        const neighbors = getNeighbors(x, y, width, height);
        for (const n of neighbors) {
          if (cells[n.y][n.x].type === 'sea') {
            player1SeaBorder.add(`${n.x},${n.y}`);
          }
        }
      }
    }
  }

  if (player1SeaBorder.size === 0) return false;

  // BFS ile deniz üzerinden oyuncu 2'ye ulaşılabilir mi?
  const visited = new Set<string>();
  const queue: { x: number; y: number }[] = [];

  for (const key of player1SeaBorder) {
    const [x, y] = key.split(',').map(Number);
    queue.push({ x, y });
    visited.add(key);
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = getNeighbors(current.x, current.y, width, height);

    for (const n of neighbors) {
      const key = `${n.x},${n.y}`;
      if (visited.has(key)) continue;
      visited.add(key);

      if (cells[n.y][n.x].owner_id === playerId2) {
        return true;
      }

      if (cells[n.y][n.x].type === 'sea') {
        queue.push(n);
      }
    }
  }

  return false;
}

// Bir oyuncunun sınır komşularını bul
export function getBorderNeighbors(
  cells: MapCell[][],
  width: number,
  height: number,
  playerId: string
): { playerId: string; hasLandBorder: boolean; hasSeaBorder: boolean }[] {
  const neighbors = new Map<string, { hasLandBorder: boolean; hasSeaBorder: boolean }>();

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (cells[y][x].owner_id === playerId) {
        const cellNeighbors = getNeighbors(x, y, width, height);
        for (const n of cellNeighbors) {
          const neighborCell = cells[n.y][n.x];
          if (neighborCell.owner_id && neighborCell.owner_id !== playerId) {
            if (!neighbors.has(neighborCell.owner_id)) {
              neighbors.set(neighborCell.owner_id, { hasLandBorder: false, hasSeaBorder: false });
            }
            neighbors.get(neighborCell.owner_id)!.hasLandBorder = true;
          }
        }
      }
    }
  }

  // Deniz sınırlarını kontrol et
  const allPlayers = new Set<string>();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (cells[y][x].owner_id && cells[y][x].owner_id !== playerId) {
        allPlayers.add(cells[y][x].owner_id!);
      }
    }
  }

  for (const otherPlayer of allPlayers) {
    if (!neighbors.has(otherPlayer)) {
      if (hasSeaBorder(cells, width, height, playerId, otherPlayer)) {
        neighbors.set(otherPlayer, { hasLandBorder: false, hasSeaBorder: true });
      }
    } else if (!neighbors.get(otherPlayer)!.hasSeaBorder) {
      if (hasSeaBorder(cells, width, height, playerId, otherPlayer)) {
        neighbors.get(otherPlayer)!.hasSeaBorder = true;
      }
    }
  }

  return Array.from(neighbors.entries()).map(([pid, borders]) => ({
    playerId: pid,
    ...borders,
  }));
}

// Bir bölgenin bağlı kare sayısını hesapla (koloni sistemi için)
export function getConnectedTerritory(
  cells: MapCell[][],
  width: number,
  height: number,
  startX: number,
  startY: number,
  playerId: string
): { x: number; y: number }[] {
  const visited = new Set<string>();
  const queue: { x: number; y: number }[] = [{ x: startX, y: startY }];
  const territory: { x: number; y: number }[] = [];
  visited.add(`${startX},${startY}`);

  while (queue.length > 0) {
    const current = queue.shift()!;
    territory.push(current);

    const neighbors = getNeighbors(current.x, current.y, width, height);
    for (const n of neighbors) {
      const key = `${n.x},${n.y}`;
      if (!visited.has(key) && cells[n.y][n.x].owner_id === playerId) {
        visited.add(key);
        queue.push(n);
      }
    }
  }

  return territory;
}

// Ana harita oluşturma fonksiyonu
export function generateMap(players: GamePlayer[], config?: Partial<MapConfig>): GameMap {
  const cfg: MapConfig = { ...DEFAULT_CONFIG, ...config, playerCount: players.length };

  const avgTerritory = Math.floor((cfg.minTerritory + cfg.maxTerritory) / 2);
  const { width, height } = calculateMapSize(cfg.playerCount, avgTerritory, cfg.seaPercentage);

  // Boş harita
  const cells = createEmptyMap(width, height);

  // Deniz oluştur
  generateSea(cells, width, height, cfg.seaPercentage);

  // Kara hücrelerini bul
  const landCells = getLandCells(cells, width, height);

  // Başkentleri seç
  const playerIds = players.map(p => p.id);
  const capitals = selectCapitals(landCells, cfg.playerCount, width, height);

  // Toprakları genişlet
  expandTerritories(cells, capitals, playerIds, cfg.minTerritory, cfg.maxTerritory, width, height);

  return { width, height, cells };
}

// Saldırı sonucu toprak transferi
export function transferTerritory(
  cells: MapCell[][],
  width: number,
  height: number,
  fromPlayerId: string,
  toPlayerId: string,
  squareCount: number
): { x: number; y: number }[] {
  const transferredCells: { x: number; y: number }[] = [];

  // Sınır hücrelerinden başlayarak transfer et
  let remaining = squareCount;
  let maxIterations = squareCount * 10;

  while (remaining > 0 && maxIterations > 0) {
    maxIterations--;

    // toPlayer'ın fromPlayer'a sınır olan hücrelerini bul
    const borderCells: { x: number; y: number }[] = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (cells[y][x].owner_id === toPlayerId) {
          const neighbors = getNeighbors(x, y, width, height);
          const hasBorder = neighbors.some(n => cells[n.y][n.x].owner_id === fromPlayerId);
          if (hasBorder) {
            // fromPlayer'ın komşu hücrelerini ekle
            for (const n of neighbors) {
              if (cells[n.y][n.x].owner_id === fromPlayerId) {
                borderCells.push(n);
              }
            }
          }
        }
      }
    }

    if (borderCells.length === 0) break;

    // Rastgele sınır hücresini transfer et
    const uniqueBorder = Array.from(new Set(borderCells.map(c => `${c.x},${c.y}`))).map(key => {
      const [x, y] = key.split(',').map(Number);
      return { x, y };
    });

    const randomCell = uniqueBorder[Math.floor(Math.random() * uniqueBorder.length)];

    // Başkenti transfer etme (son kare değilse)
    if (cells[randomCell.y][randomCell.x].is_capital) {
      const fromPlayerCells = countTerritories(cells, width, height).get(fromPlayerId) || 0;
      if (fromPlayerCells > 1) {
        continue; // Başkenti son kareye kadar transfer etme
      }
    }

    cells[randomCell.y][randomCell.x].owner_id = toPlayerId;
    if (cells[randomCell.y][randomCell.x].is_capital) {
      cells[randomCell.y][randomCell.x].is_capital = false;
    }
    transferredCells.push(randomCell);
    remaining--;
  }

  return transferredCells;
}