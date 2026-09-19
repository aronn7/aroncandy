// src/types/Candy.ts
var key = (p) => `${p.r},${p.c}`;
var position = (k) => {
  const [r, c] = k.split(",").map(Number);
  return { r, c };
};

// src/game/Tile.ts
var solid = (cell) => !!cell?.blocker && ["box", "stone", "chocolate"].includes(cell.blocker.kind);
var movable = (cell) => !!cell?.candy && !cell.blocker;
var at = (b, p) => b[p.r]?.[p.c];
var neighbors = (b, p) => [{ r: p.r - 1, c: p.c }, { r: p.r + 1, c: p.c }, { r: p.r, c: p.c - 1 }, { r: p.r, c: p.c + 1 }].filter((q) => !!at(b, q));

// src/game/Board.ts
function createBoard(level, spawn) {
  const b = level.board.map((row2) => row2.map((v) => v ? { candy: null } : null));
  for (const p of level.blockers) {
    const cell = b[p.r]?.[p.c];
    if (cell) cell.blocker = { kind: p.kind, hp: p.hp, maxHp: p.hp };
  }
  for (let r = 0; r < b.length; r++) for (let c = 0; c < b[r].length; c++) {
    const cell = b[r][c];
    if (!cell || solid(cell)) continue;
    const exclude = [];
    if (c > 1 && b[r][c - 1]?.candy?.color === b[r][c - 2]?.candy?.color) exclude.push(b[r][c - 1]?.candy?.color ?? -1);
    if (r > 1 && b[r - 1][c]?.candy?.color === b[r - 2][c]?.candy?.color) exclude.push(b[r - 1][c]?.candy?.color ?? -1);
    cell.candy = spawn.candy(exclude);
  }
  for (const p of level.items) {
    const cell = b[p.r]?.[p.c];
    if (cell && !solid(cell)) cell.candy = { ...spawn.candy(), item: true };
  }
  return b;
}
var cloneBoard = (b) => b.map((row2) => row2.map((cell) => cell ? { candy: cell.candy ? { ...cell.candy } : null, ...cell.blocker ? { blocker: { ...cell.blocker } } : {} } : null));

// src/game/SpawnSystem.ts
var SpawnSystem = class {
  constructor(seed, colors, weights) {
    this.colors = colors;
    this.weights = weights;
    this.seed = seed >>> 0;
  }
  colors;
  weights;
  id = 0;
  seed;
  random = () => {
    this.seed += 1831565813;
    let t = this.seed;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  color() {
    if (!this.weights) return Math.floor(this.random() * this.colors);
    const total = this.weights.slice(0, this.colors).reduce((a, b) => a + b, 0);
    let v = this.random() * total;
    for (let i = 0; i < this.colors; i++) {
      v -= this.weights[i] ?? 1;
      if (v < 0) return i;
    }
    return this.colors - 1;
  }
  candy(excluded = []) {
    let color = this.color();
    for (let n = 0; excluded.includes(color) && n < 50; n++) color = this.color();
    if (excluded.includes(color)) color = Array.from({ length: this.colors }, (_, i) => i).find((c) => !excluded.includes(c)) ?? 0;
    return { id: ++this.id, color };
  }
};

// src/game/MatchDetector.ts
function detectMatches(b) {
  const runs = [];
  const color = (r, c) => {
    const v = b[r]?.[c]?.candy;
    return !v || v.item || v.special === "bomb" ? -1 : v.color;
  };
  for (const vertical of [false, true]) for (let lane = 0; lane < 9; lane++) {
    let start = 0;
    while (start < 9) {
      let end = start + 1;
      const x = color(vertical ? start : lane, vertical ? lane : start);
      while (x >= 0 && end < 9 && color(vertical ? end : lane, vertical ? lane : end) === x) end++;
      if (x >= 0 && end - start >= 3) runs.push({ cells: Array.from({ length: end - start }, (_, j) => ({ r: vertical ? start + j : lane, c: vertical ? lane : start + j })), horizontal: !vertical, vertical, longest: end - start });
      start = end;
    }
  }
  for (let i = 0; i < runs.length; i++) for (let j = i + 1; j < runs.length; j++) if (runs[i].cells.some((a) => runs[j].cells.some((z) => key(a) === key(z)))) {
    const a = runs[i], z = runs[j];
    a.cells = [...new Map([...a.cells, ...z.cells].map((p) => [key(p), p])).values()];
    a.horizontal ||= z.horizontal;
    a.vertical ||= z.vertical;
    a.longest = Math.max(a.longest, z.longest);
    runs.splice(j, 1);
    i = -1;
    break;
  }
  return runs;
}

// src/game/SwapManager.ts
var adjacent = (a, b) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
var canSwap = (b, a, z) => adjacent(a, z) && movable(at(b, a)) && movable(at(b, z));
function exchange(b, a, z) {
  const x = at(b, a), y = at(b, z);
  if (x && y) [x.candy, y.candy] = [y.candy, x.candy];
}
var specialSwap = (b, a, z) => {
  const x = at(b, a)?.candy, y = at(b, z)?.candy;
  return !!x && !x.item && !!y && !y.item && (x.special === "bomb" || y.special === "bomb" || !!x.special && !!y.special);
};

// src/game/GravitySystem.ts
function gravity(b, spawn) {
  for (const row2 of b) for (const cell of row2) if (cell?.blocker?.kind === "ice" && !cell.candy) cell.candy = spawn.candy();
  for (let c = 0; c < 9; c++) {
    let r = 8;
    while (r >= 0) {
      if (!b[r]?.[c] || b[r][c]?.blocker) {
        r--;
        continue;
      }
      const end = r;
      while (r >= 0 && b[r]?.[c] && !b[r][c]?.blocker) r--;
      const top = r + 1;
      const candies = [];
      for (let y = end; y >= top; y--) {
        const candy = b[y][c].candy;
        if (candy) candies.push(candy);
      }
      for (let y = end; y >= top; y--) b[y][c].candy = candies[end - y] ?? spawn.candy();
    }
  }
}
function dropItems(b) {
  let count = 0;
  for (let c = 0; c < 9; c++) {
    let bottom = 8;
    while (bottom >= 0 && !b[bottom][c]) bottom--;
    const cell = b[bottom]?.[c];
    if (cell?.candy?.item) {
      cell.candy = null;
      count++;
    }
  }
  return count;
}

// src/game/HintSystem.ts
function possibleMoves(b) {
  const moves = [];
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) for (const z of [{ r: r + 1, c }, { r, c: c + 1 }]) {
    const a = { r, c };
    if (!canSwap(b, a, z)) continue;
    if (specialSwap(b, a, z)) {
      moves.push([a, z]);
      continue;
    }
    exchange(b, a, z);
    const valid = detectMatches(b).some((m) => m.cells.some((p) => p.r === a.r && p.c === a.c || p.r === z.r && p.c === z.c));
    exchange(b, a, z);
    if (valid) moves.push([a, z]);
  }
  return moves;
}

// src/game/ShuffleSystem.ts
function shuffle(b, spawn) {
  const cells = b.flat().filter((cell) => cell?.candy && !cell.candy.item && !cell.blocker);
  const candies = cells.map((cell) => cell.candy);
  for (let attempt = 0; attempt < 300; attempt++) {
    for (let i = candies.length - 1; i > 0; i--) {
      const j = Math.floor(spawn.random() * (i + 1));
      [candies[i], candies[j]] = [candies[j], candies[i]];
    }
    cells.forEach((cell, i) => {
      cell.candy = candies[i];
    });
    if (!detectMatches(b).length && possibleMoves(b).length) return true;
  }
  for (let attempt = 0; attempt < 300; attempt++) {
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
      const cell = b[r][c];
      if (!cell?.candy || cell.blocker || cell.candy.item) continue;
      const excluded = [];
      if (c > 1 && b[r][c - 1]?.candy?.color === b[r][c - 2]?.candy?.color) excluded.push(b[r][c - 1]?.candy?.color ?? -1);
      if (r > 1 && b[r - 1][c]?.candy?.color === b[r - 2][c]?.candy?.color) excluded.push(b[r - 1][c]?.candy?.color ?? -1);
      cell.candy.color = spawn.candy(excluded).color;
    }
    if (!detectMatches(b).length && possibleMoves(b).length) return true;
  }
  return false;
}

// src/game/ObjectiveSystem.ts
var objectivesComplete = (objectives) => objectives.every((o) => o.current >= o.amount);
function record(objectives, type, amount = 1, color, blocker) {
  for (const o of objectives) if (o.type === type && (o.color === void 0 || o.color === color) && (o.blocker === void 0 || o.blocker === blocker)) o.current = Math.min(o.amount, o.current + amount);
}
function recordScore(objectives, score) {
  for (const o of objectives) if (o.type === "score") o.current = Math.min(o.amount, score);
}

// src/game/SpecialCandySystem.ts
function specialFor(m) {
  return m.longest >= 5 ? "bomb" : m.horizontal && m.vertical ? "wrapped" : m.cells.length >= 4 ? m.horizontal ? "striped-h" : "striped-v" : void 0;
}
var row = (b, r) => b[r]?.flatMap((v, c) => v ? [key({ r, c })] : []) ?? [];
var column = (b, c) => b.flatMap((rr, r) => rr[c] ? [key({ r, c })] : []);
var area = (b, p, radius) => b.flatMap((rr, r) => rr.flatMap((v, c) => v && Math.abs(r - p.r) <= radius && Math.abs(c - p.c) <= radius ? [key({ r, c })] : []));
function expandSpecials(b, hits, skipBombs = false) {
  const result = new Set(hits), seen = /* @__PURE__ */ new Set();
  let changed = true;
  while (changed) {
    changed = false;
    for (const k of [...result]) {
      if (seen.has(k)) continue;
      seen.add(k);
      const p = position(k), candy = at(b, p)?.candy;
      if (!candy?.special || skipBombs && candy.special === "bomb") continue;
      const targets = candy.special === "striped-h" ? row(b, p.r) : candy.special === "striped-v" ? column(b, p.c) : candy.special === "wrapped" ? area(b, p, 1) : b.flatMap((rr, r) => rr.flatMap((v, c) => v?.candy?.color === candy.color ? [key({ r, c })] : []));
      for (const t of targets) if (!result.has(t)) {
        result.add(t);
        changed = true;
      }
    }
  }
  return result;
}
function specialCombination(b, a, z) {
  const x = at(b, a).candy, y = at(b, z).candy;
  const hits = /* @__PURE__ */ new Set([key(a), key(z)]);
  if (x.special === "bomb" || y.special === "bomb") {
    if (x.special === "bomb" && y.special === "bomb") {
      b.forEach((rr, r) => rr.forEach((v, c) => {
        if (v) hits.add(key({ r, c }));
      }));
    } else {
      const target = x.special === "bomb" ? y : x;
      b.forEach((rr, r) => rr.forEach((v, c) => {
        if (v?.candy?.color === target.color && !v.candy.item) {
          if (target.special) v.candy.special = target.special === "wrapped" ? "wrapped" : (r + c) % 2 ? "striped-h" : "striped-v";
          hits.add(key({ r, c }));
        }
      }));
    }
  } else if (x.special === "wrapped" && y.special === "wrapped") area(b, z, 2).forEach((k) => hits.add(k));
  else if (x.special === "wrapped" || y.special === "wrapped") {
    for (let d = -1; d <= 1; d++) {
      row(b, z.r + d).forEach((k) => hits.add(k));
      if (z.c + d >= 0 && z.c + d < 9) column(b, z.c + d).forEach((k) => hits.add(k));
    }
  } else {
    row(b, z.r).forEach((k) => hits.add(k));
    column(b, z.c).forEach((k) => hits.add(k));
  }
  return expandSpecials(b, hits, true);
}

// src/game/BlockerSystem.ts
function hitBlockers(b, hits, objectives) {
  const targets = new Set(hits);
  for (const k of hits) for (const p of neighbors(b, position(k))) if (at(b, p)?.blocker?.kind !== "ice") targets.add(key(p));
  let chocolateBroken = false;
  for (const k of targets) {
    const cell = at(b, position(k));
    if (!cell?.blocker) continue;
    const blocker = cell.blocker;
    blocker.hp--;
    if (blocker.hp <= 0) {
      record(objectives, blocker.kind === "ice" ? "breakIce" : "breakBlockers", 1, void 0, blocker.kind);
      chocolateBroken ||= blocker.kind === "chocolate";
      delete cell.blocker;
    }
  }
  return chocolateBroken;
}
function spreadChocolate(b, random) {
  const targets = [];
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (b[r][c]?.blocker?.kind === "chocolate") for (const p2 of neighbors(b, { r, c })) {
    const v = at(b, p2);
    if (v && !v.blocker && !v.candy?.item && !v.candy?.special) targets.push(p2);
  }
  const p = targets[Math.floor(random() * targets.length)];
  if (p) {
    const cell = at(b, p);
    cell.candy = null;
    cell.blocker = { kind: "chocolate", hp: 1, maxHp: 1 };
  }
  return p;
}

// src/game/ComboSystem.ts
var comboMultiplier = (chain) => chain === 1 ? 1 : chain === 2 ? 1.5 : chain === 3 ? 2 : 3;
var comboLabel = (chain) => chain === 1 ? "Sweet!" : chain === 2 ? "So sweet!" : chain === 3 ? "Amazing!" : `Fantastic! \xD7${chain}`;

// src/game/ScoreSystem.ts
var matchScore = (count, chain) => Math.round((count >= 5 ? 500 : count === 4 ? 250 : 100) * comboMultiplier(chain));
var starsFor = (score, thresholds) => Math.max(1, thresholds.filter((t) => score >= t).length);

// src/game/Game.ts
var Game = class {
  constructor(level, seed) {
    this.level = level;
    this.seed = seed;
    this.spawn = new SpawnSystem(seed, level.candyTypes, level.spawnWeights);
    this.board = createBoard(level, this.spawn);
    this.moves = level.moves;
    this.objectives = level.objectives.map((o) => ({ ...o, current: 0 }));
    this.finaleRandom = this.spawn.random;
    if (!possibleMoves(this.board).length && !shuffle(this.board, this.spawn)) this.phase = "ERROR";
  }
  level;
  seed;
  board;
  score = 0;
  moves;
  objectives;
  phase = "IDLE";
  chain = 0;
  actions = [];
  spawn;
  frames = [];
  chocolateBroken = false;
  finaleRandom;
  snapshot(phase = this.phase, message = "", hits = [], duration = 0) {
    return { board: cloneBoard(this.board), phase, score: this.score, moves: this.moves, objectives: this.objectives.map((o) => ({ ...o })), chain: this.chain, hits, message, duration };
  }
  emit(phase, duration = 200, message = "", hits = []) {
    this.phase = phase;
    this.frames.push(this.snapshot(phase, message, hits, duration));
  }
  async act(action) {
    if (this.phase !== "IDLE") return [];
    this.frames = [];
    this.chain = 0;
    this.chocolateBroken = false;
    if (action.type === "swap") {
      if (!canSwap(this.board, action.a, action.b)) return [];
      const special = specialSwap(this.board, action.a, action.b);
      exchange(this.board, action.a, action.b);
      this.emit("SWAPPING", 170);
      const matches = detectMatches(this.board);
      if (!special && !matches.length) {
        exchange(this.board, action.a, action.b);
        this.emit("SWAPPING", 220, "Coba pasangan lain");
        this.emit("IDLE", 0);
        return this.frames;
      }
      this.moves--;
      this.actions.push(action);
      if (special) {
        this.chain = 1;
        this.clear(specialCombination(this.board, action.a, action.b), [], void 0, true);
        this.fall();
      }
      this.resolve(special ? void 0 : action.b);
      if (this.level.chocolateSpreads && !this.chocolateBroken && spreadChocolate(this.board, this.spawn.random)) this.emit("FALLING", 180, "Cokelat tumbuh!");
    } else if (action.type === "shuffle") {
      this.actions.push(action);
      this.emit("SHUFFLING", 240, "A little remix!");
      if (!shuffle(this.board, this.spawn)) {
        this.emit("ERROR", 0, "Papan tidak dapat diacak. Silakan ulangi level.");
        return this.frames;
      }
      this.emit("FALLING", 240);
    } else {
      const cell = at(this.board, action.at);
      if (!cell || cell.candy?.item || !cell.candy && !cell.blocker) return [];
      this.actions.push(action);
      this.chain = 1;
      const hits = action.type === "hammer" ? /* @__PURE__ */ new Set([key(action.at)]) : new Set(this.board.flatMap((rr, r) => rr.flatMap((v, c) => v?.candy && !v.candy.item && v.candy.color === cell.candy?.color ? [key({ r, c })] : [])));
      if (action.type === "rainbow" && !cell.candy) {
        this.actions.pop();
        return [];
      }
      if (action.type === "hammer") {
        const c = at(this.board, action.at);
        if (c?.candy) {
          record(this.objectives, "collect", 1, c.candy.color);
          c.candy = null;
        }
      }
      this.clear(expandSpecials(this.board, hits), [], void 0, true);
      this.fall();
      this.resolve();
    }
    if (this.phase === "ERROR") return this.frames;
    recordScore(this.objectives, this.score);
    if (objectivesComplete(this.objectives)) {
      await this.sweetFinale();
    } else if (this.moves <= 0) this.emit("LOSE", 260, "Sedikit lagi!");
    else {
      if (!possibleMoves(this.board).length) {
        this.emit("SHUFFLING", 360, "No more moves! Mengacak candy\u2026");
        if (!shuffle(this.board, this.spawn)) {
          this.emit("ERROR", 0, "Papan tidak dapat diacak. Silakan ulangi level.");
          return this.frames;
        }
        this.emit("FALLING", 220);
      }
      this.emit("IDLE", 0);
    }
    return this.frames;
  }
  resolve(preferred) {
    let matches = detectMatches(this.board);
    let iterations = 0;
    while (matches.length) {
      if (++iterations > 60) {
        this.emit("SHUFFLING", 250, "A little remix!");
        if (!shuffle(this.board, this.spawn)) this.emit("ERROR", 0, "Papan tidak dapat diacak.");
        break;
      }
      this.chain++;
      const hits = expandSpecials(this.board, new Set(matches.flatMap((m) => m.cells.map(key))));
      this.clear(hits, matches, preferred);
      preferred = void 0;
      this.fall();
      matches = detectMatches(this.board);
    }
  }
  clear(hits, matches, preferred, special = false) {
    const keep = /* @__PURE__ */ new Map();
    for (const m of matches) {
      const type = specialFor(m);
      if (type) {
        const p = m.cells.find((p2) => preferred && key(p2) === key(preferred) && !at(this.board, p2)?.blocker && !at(this.board, p2)?.candy?.special) ?? m.cells.find((p2) => !at(this.board, p2)?.blocker && !at(this.board, p2)?.candy?.special);
        if (p) keep.set(key(p), type);
      }
    }
    const points = matches.length ? matches.reduce((s, m) => s + matchScore(m.cells.length, this.chain), 0) : Math.max(100, hits.size * 40);
    this.score += points + (special ? 300 : 0);
    recordScore(this.objectives, this.score);
    this.emit("MATCHING", 210, special ? "Magic happens!" : comboLabel(this.chain), [...hits].filter((k) => !keep.has(k)));
    const broken = hitBlockers(this.board, hits, this.objectives);
    this.chocolateBroken = broken || this.chocolateBroken;
    for (const k of hits) {
      const p = position(k), cell = at(this.board, p);
      if (!cell?.candy || cell.candy.item) continue;
      if (keep.has(k)) {
        cell.candy.special = keep.get(k);
        continue;
      }
      if (cell.blocker) continue;
      record(this.objectives, "collect", 1, cell.candy.color);
      cell.candy = null;
    }
    this.emit("DESTROYING", 90);
  }
  fall() {
    gravity(this.board, this.spawn);
    const dropped = dropItems(this.board);
    if (dropped) {
      record(this.objectives, "drop", dropped);
      gravity(this.board, this.spawn);
    }
    this.emit("FALLING", 240);
  }
  hint() {
    return possibleMoves(this.board)[0];
  }
  /** SWEET FINALE — convert remaining moves into striped candies, then chain-detonate them. */
  async sweetFinale() {
    const remaining = this.moves;
    this.emit("FINALE_START", 520, "OBJECTIVE COMPLETE! \u2728 Sweet Finale!");
    if (remaining <= 0) {
      this.emit("WIN", 300, "Sweet success!");
      return;
    }
    this.moves = 0;
    const per = remaining > 8 ? 260 : remaining > 4 ? 340 : 420;
    const targets = [];
    for (let i = 0; i < remaining; i++) {
      const spot = this.pickFinaleTarget(targets);
      if (!spot) break;
      targets.push(spot);
      this.moves = remaining - 1 - i;
      const cell = this.board[spot.r][spot.c];
      cell.candy.special = (spot.r + spot.c) % 2 ? "striped-h" : "striped-v";
      this.score += 500;
      const f = this.snapshot("CONVERTING_MOVES", i === remaining - 1 ? "SWEET FINALE!" : "+ SPECIAL!", [key(spot)], per);
      f.finale = true;
      f.bonusText = i === remaining - 1 ? "SWEET FINALE!" : "+ SPECIAL!";
      f.burstAt = key(spot);
      this.frames.push(f);
    }
    await 0;
    const ready = [...targets];
    const seen = /* @__PURE__ */ new Set();
    while (ready.length) {
      const next = ready.shift();
      const nk = key(next);
      if (seen.has(nk)) continue;
      seen.add(nk);
      const cell = this.board[next.r]?.[next.c];
      if (!cell?.candy?.special) continue;
      const special = cell.candy.special;
      const hits = special === "striped-h" ? new Set(this.board[next.r].flatMap((v, c) => v?.candy ? [key({ r: next.r, c })] : [])) : new Set(this.board.flatMap((rr, r) => rr[next.c]?.candy ? [key({ r, c: next.c })] : []));
      const expanded = expandSpecials(this.board, /* @__PURE__ */ new Set([...hits, key(next)]));
      const pulse = this.snapshot("BONUS_ACTIVATING", "", [], 200);
      pulse.finale = true;
      pulse.burstAt = nk;
      this.frames.push(pulse);
      this.clear(expanded, [], void 0, true);
      this.fall();
      this.board.forEach((row2, r) => row2.forEach((cc, c) => {
        if (cc?.candy?.special && !seen.has(key({ r, c }))) ready.push({ r, c });
      }));
    }
    const done = this.snapshot("FINALE_COMPLETE", "", [], 350);
    done.finale = true;
    done.bonusText = "BONUS!";
    this.frames.push(done);
    this.emit("WIN", 420, "Sweet success!");
  }
  /** Pick a random valid normal candy (not blocker, item, special or already chosen). */
  pickFinaleTarget(taken) {
    const pool = [];
    this.board.forEach((row2, r) => row2.forEach((cell, c) => {
      if (cell?.candy && !cell.candy.item && !cell.candy.special && !cell.blocker && !taken.some((t) => t.r === r && t.c === c)) pool.push({ r, c });
    }));
    if (!pool.length) return null;
    return pool[Math.floor(this.finaleRandom() * pool.length)];
  }
};

// src/levels/index.ts
var SHAPES = {
  square: () => true,
  diamond: (r, c) => Math.abs(r - 4) + Math.abs(c - 4) <= 5,
  cross: (r, c) => r >= 2 && r <= 6 || c >= 2 && c <= 6,
  heart: (r, c) => r < 2 ? c > 0 && c < 8 && c !== 4 : r < 5 ? true : Math.abs(c - 4) <= 8 - r,
  x: (r, c) => Math.abs(r - c) <= 1 || Math.abs(8 - r - c) <= 1,
  split: (_r, c) => c !== 4,
  hole: (r, c) => !(r >= 3 && r <= 5 && c >= 3 && c <= 5),
  paths: (r, c) => c < 3 || c > 5 || r >= 3 && r <= 5,
  islands: (r, c) => r !== 4 && c !== 4,
  asymmetric: (r, c) => !(r < 3 && c < 3) && !(r > 6 && c > 5),
  rings: (r, c) => Math.abs(r - 4) <= 3 && Math.abs(c - 4) <= 3 && !(Math.abs(r - 4) === 1 && Math.abs(c - 4) === 1 && r >= 2 && r <= 6 && c >= 2 && c <= 6),
  tower: (r, c) => r >= 2 || !(c >= 3 && c <= 5),
  arena: (r, c) => !(r > 2 && r < 6 && c > 2 && c < 6) || r === 4 || c === 4,
  gate: (r, c) => c >= 2 && c <= 6 || r >= 3 && r <= 5
};
var NAMES = [
  ["Hello, sweetness", "Heart to heart", "Starry surprise", "A sweeter shape", "Garden party", "Petal match", "Blossom breeze", "Sweet six", "Rosy path", "Garden finale"],
  ["First frost", "Sugar & ice", "Frozen wishes", "Cool crossroads", "Chill steps", "Icy lanes", "Thaw and match", "Frost garden", "Slippery slope", "Valley crown"],
  ["Crumb court", "Unbox the magic", "Two little worlds", "Cookie lanes", "Batch of four", "Doughy depths", "Crunchy corners", "Sprinkle squares", "Oven fresh", "Village feast"],
  ["Cocoa drift", "Chocolate dreams", "Chocolate escape", "Meltdown", "Truffle trouble", "Bitter bar", "Dark drizzle", "Molten lane", "Cocoa castle", "Sweet surrender"],
  ["Jelly bokeh", "Unlock a little joy", "The secret garden", "Wobbly walk", "Jelly jars", "Locked blooms", "Forest maze", "Glowing glade", "Jelly jubilee", "Forest crown"],
  ["Crystal courage", "Frozen core", "Layered lake", "Ice vault", "Frostbite", "Glacier gate", "Winter lock", "Frozen throne", "Permafrost", "Kingdom crest"],
  ["Cloud hopper", "Golden delivery", "Sky garden", "Parcel parade", "Updraft", "Star bridge", "Wind lanes", "Sky shower", "Comet mail", "Sky farewell"],
  ["Prism path", "Spectrum square", "Rainbow road", "Chromatic crew", "Color theory", "Prism locks", "Spectral six", "Rainbow roast", "Full spectrum", "Rainbow reign"],
  ["Bitter walls", "Midnight snack", "Castle gates", "Dark corridors", "Bitter frost", "Stone heart", "Locked tower", "Cocoa crypt", "Castle siege", "Dark crown"],
  ["Royal court", "Kingdom keys", "Sugar siege", "Candy coronation", "Royal freezer", "Gilded court", "Enchanted cage", "Throne room", "Last march", "Kingdom finale"]
];
var TIPS = {
  ice: "Cocokkan candy di bawah es. Es berlapis perlu dua hit.",
  box: "Match di samping kotak untuk memecahkannya.",
  chocolate: "Hancurkan cokelat tiap langkah agar tidak menyebar.",
  lock: "Match di samping gembok untuk membuka candy.",
  stone: "Match di samping batu dua kali untuk menghancurkannya.",
  none: "Match 4 membuat striped candy. Match 5 membuat color bomb."
};
var MECH = [
  {},
  // 1-10 basic
  { kind: "ice", count: (id) => 6 + Math.floor(id / 6), hp: (n, id) => id > 25 && n % 3 === 0 ? 2 : 1 },
  // 11-20 ice
  { kind: "box", count: (id) => 7 + Math.floor(id / 7), secondary: "ice", secondaryCount: (id) => id > 25 ? 4 : 0, hp: (n, id) => id > 26 && n % 2 === 0 ? 2 : 1 },
  // 21-30 box+ice
  { kind: "chocolate", count: (id) => 5 + Math.floor(id / 8), secondary: "box", secondaryCount: (id) => id > 35 ? 4 : 0 },
  // 31-40 chocolate+box
  { kind: "lock", count: (id) => 6 + Math.floor(id / 6), secondary: "ice", secondaryCount: (id) => id > 45 ? 5 : 0 },
  // 41-50 lock+ice
  { kind: "ice", count: (id) => 8 + Math.floor(id / 5), hp: () => 2, secondary: "lock", secondaryCount: (id) => 3 + Math.floor(id / 12) },
  // 51-60 layered ice+lock
  {},
  // 61-70 drop items (no blockers)
  { kind: "lock", count: (id) => 5 + Math.floor(id / 7), secondary: "ice", secondaryCount: (id) => id > 75 ? 8 : 0, hp: () => 1, secondaryHp: (n, id) => id > 75 && n % 2 === 0 ? 2 : 1 },
  // 71-80
  { kind: "chocolate", count: (id) => 5 + Math.floor(id / 8), secondary: "stone", secondaryCount: (id) => 4 + Math.floor(id / 10), secondaryHp: () => 2 },
  // 81-90
  { kind: "ice", count: () => 9, hp: () => 2, secondary: "stone", secondaryCount: (id) => id >= 100 ? 6 : 4, secondaryHp: () => 2 }
  // 91-100 expert
];
var shapeFor = (id) => {
  const catalog = ["square", "square", "diamond", "heart", "cross", "hole", "x", "split", "islands", "paths", "asymmetric", "rings", "tower", "arena", "gate"];
  const shape = catalog[(id * 7 + Math.floor(id / 10) * 3) % catalog.length];
  return shape;
};
function takeSlots(slots, id) {
  const pool = [...slots];
  let s = id * 2654435761 >>> 0;
  for (let i = 0; i < pool.length; i++) {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    const j = (s + i) % pool.length;
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return (n) => pool.splice(0, n).map((p) => ({ ...p }));
}
var movesFor = (id) => {
  const w = Math.floor((id - 1) / 10);
  const step = (id - 1) % 10;
  const peak = [0, 0, 1, 1, 2, 1, 2, 2, 3, 3][step];
  const relax = step === 9 ? 6 : 0;
  return Math.max(16, 22 + Math.min(10, w) + peak * 3 - Math.floor(step / 4) * 2 + relax);
};
var build = (id) => {
  const w = Math.min(9, Math.floor((id - 1) / 10));
  const mech = MECH[w];
  const shape = shapeFor(id);
  const board0 = Array.from({ length: 9 }, (_, r) => Array.from({ length: 9 }, (_2, c) => +SHAPES[shape](r, c)));
  const w0 = Math.min(9, Math.floor((id - 1) / 10));
  const mech0 = MECH[w0];
  const need0 = (mech0.kind ? mech0.count ? mech0.count(id) : 6 : 0) + (mech0.secondary ? mech0.secondaryCount?.(id) ?? 4 : 0);
  const openInterior = board0.flat().reduce((n, v, i) => n + (v && Math.floor(i / 9) > 0 && Math.floor(i / 9) < 8 && i % 9 > 0 && i % 9 < 8 ? 1 : 0), 0);
  const finalShape = openInterior - need0 < 26 && shape !== "square" ? id % 2 ? "diamond" : "cross" : shape;
  const board = Array.from({ length: 9 }, (_, r) => Array.from({ length: 9 }, (_2, c) => +SHAPES[finalShape](r, c)));
  const slots = board.flatMap((row2, r) => row2.flatMap((v, c) => v && r > 0 && r < 8 && c > 0 && c < 8 ? [{ r, c }] : []));
  const take = takeSlots(slots, id);
  const candyTypes = id < 6 ? 5 : 6;
  const blockers = [];
  if (mech.kind) take(mech.count ? mech.count(id) : 6).forEach((p, n) => blockers.push({ ...p, kind: mech.kind, hp: mech.hp ? mech.hp(n, id) : 1 }));
  if (mech.secondary) take(mech.secondaryCount?.(id) ?? 4).forEach((p, n) => blockers.push({ ...p, kind: mech.secondary, hp: mech.secondaryHp ? mech.secondaryHp(n, id) : 1 }));
  const items = [];
  const wantsDrop = w === 6 && id % 10 >= 3 || id === 100;
  if (wantsDrop) take(3).forEach((p) => items.push(p));
  const objectives = [];
  if (id === 1) objectives.push({ type: "score", amount: 1200 });
  else if (id === 100) {
    objectives.push({ type: "collect", color: 0, amount: 20 }, { type: "collect", color: 2, amount: 20 }, { type: "breakBlockers", blocker: "stone", amount: 6 }, { type: "drop", amount: 3 });
  } else if (wantsDrop) objectives.push({ type: "drop", amount: 3 }, { type: "collect", color: id % candyTypes, amount: 16 + Math.floor(id / 12) });
  else objectives.push({ type: "collect", color: id % candyTypes, amount: 14 + Math.floor(id / 8) });
  if (mech.kind && id !== 100) objectives.push({ type: mech.kind === "ice" ? "breakIce" : "breakBlockers", blocker: mech.kind, amount: blockers.filter((b) => b.kind === mech.kind).length });
  if (mech.secondary && id % 3 !== 0) objectives.push({ type: mech.secondary === "ice" ? "breakIce" : "breakBlockers", blocker: mech.secondary, amount: blockers.filter((b) => b.kind === mech.secondary).length });
  const base = 1200 + 140 * (id - 1);
  return { id, name: NAMES[w][(id - 1) % 10], world: w, moves: movesFor(id), board, candyTypes, objectives, blockers, stars: [base, Math.round(base * 1.8), Math.round(base * 2.6)], chocolateSpreads: mech.kind === "chocolate" || id >= 91, items, tip: TIPS[mech.kind ?? "none"] };
};
var LEVELS = Array.from({ length: 100 }, (_, i) => build(i + 1));
var getLevel = (id) => LEVELS.find((l) => l.id === id) ?? LEVELS[0];

// src/game/validator.ts
var RANKED_BOOSTER_LIMITS = { hammer: 3, shuffle: 2, rainbow: 1 };
async function validateReplay(levelId, seed, input) {
  if (!Number.isInteger(levelId) || levelId < 1 || levelId > LEVELS.length) throw new Error("Invalid level");
  if (!Array.isArray(input) || input.length === 0 || input.length > 150) throw new Error("Invalid action count");
  const game = new Game(getLevel(levelId), seed), used = { hammer: 0, shuffle: 0, rainbow: 0 };
  const pos = (v) => {
    if (!v || typeof v !== "object") return false;
    const p = v;
    return Number.isInteger(p.r) && Number.isInteger(p.c) && p.r >= 0 && p.r < 9 && p.c >= 0 && p.c < 9;
  };
  for (const candidate of input) {
    if (!candidate || typeof candidate !== "object") throw new Error("Invalid action");
    const a = candidate;
    if (a.type === "swap") {
      if (!pos(a.a) || !pos(a.b)) throw new Error("Invalid coordinates");
    } else if (a.type === "hammer" || a.type === "rainbow" || a.type === "shuffle") {
      if (++used[a.type] > RANKED_BOOSTER_LIMITS[a.type]) throw new Error("Booster budget exceeded");
      if (a.type !== "shuffle" && !pos(a.at)) throw new Error("Invalid coordinates");
    } else throw new Error("Unknown action");
    const count = game.actions.length;
    await game.act(a);
    if (game.actions.length !== count + 1) throw new Error("Rejected or post-terminal action");
  }
  if (game.phase !== "WIN") throw new Error("Objectives not completed");
  return { score: game.score, stars: starsFor(game.score, game.level.stars), movesUsed: game.level.moves - game.moves, level: levelId };
}
export {
  RANKED_BOOSTER_LIMITS,
  validateReplay
};
