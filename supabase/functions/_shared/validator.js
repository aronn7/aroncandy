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
  asymmetric: (r, c) => !(r < 3 && c < 3) && !(r > 6 && c > 5)
};
var definitions = [
  ["Hello, sweetness", "square", 22, 5],
  ["Heart to heart", "square", 24, 5],
  ["Starry surprise", "square", 25, 5],
  ["A sweeter shape", "diamond", 26, 5],
  ["A cool beginning", "cross", 26, 5, "ice", 8],
  ["Sugar & ice", "heart", 27, 5, "ice", 10],
  ["Frozen wishes", "hole", 28, 6, "ice", 12],
  ["Sweet crossroads", "x", 30, 5, "ice", 8],
  ["Unbox the magic", "square", 28, 6, "box", 9],
  ["Two little worlds", "split", 30, 5, "box", 8],
  ["Jelly islands", "islands", 30, 5, "box", 8],
  ["Chocolate dreams", "paths", 30, 6, "chocolate", 7],
  ["Chocolate escape", "asymmetric", 30, 6, "chocolate", 9],
  ["Unlock a little joy", "square", 30, 6, "lock", 10],
  ["The secret garden", "diamond", 30, 5, "lock", 9],
  ["Crystal courage", "cross", 32, 5, "stone", 6],
  ["Golden delivery", "square", 30, 6, "ice", 9],
  ["The royal recipe", "hole", 32, 6, "box", 10],
  ["A magical mix", "asymmetric", 34, 6, "stone", 7],
  ["Sweetest victory", "square", 35, 6, "lock", 12]
];
var LEVELS = definitions.map(([name, shape, moves, candyTypes, kind, count = 0], i) => {
  const id = i + 1;
  const board = Array.from({ length: 9 }, (_, r) => Array.from({ length: 9 }, (_2, c) => +SHAPES[shape](r, c)));
  const slots = board.flatMap((row2, r) => row2.flatMap((v, c) => v && r > 0 && r < 8 && c > 0 && c < 8 ? [{ r, c }] : []));
  const ordered = slots.sort((a, b) => (a.r * 17 + a.c * 31 + id * 11) % 97 - (b.r * 17 + b.c * 31 + id * 11) % 97);
  const blockers = kind ? ordered.slice(0, count).map((p, n) => ({ ...p, kind, hp: kind === "stone" ? 2 : kind === "ice" && id > 6 && n % 3 === 0 ? 2 : kind === "box" && id > 10 ? 2 : 1 })) : [];
  if (id === 19 || id === 20) ordered.slice(count, count + 5).forEach((p) => blockers.push({ ...p, kind: "ice", hp: 2 }));
  let objectives = id === 1 ? [{ type: "score", amount: 1200 }] : [{ type: "collect", color: i % candyTypes, amount: 14 + Math.floor(i / 3) * 2 }];
  if (kind) objectives.push({ type: kind === "ice" ? "breakIce" : "breakBlockers", blocker: kind, amount: count });
  if (id === 17) objectives = [{ type: "drop", amount: 2 }, { type: "breakIce", amount: count }];
  if (id === 19 || id === 20) objectives.push({ type: "breakIce", amount: 5 });
  return { id, name, world: Math.floor(i / 4), moves, board, candyTypes, objectives, blockers, stars: [1200 + 100 * i, 2800 + 150 * i, 4500 + 220 * i], chocolateSpreads: kind === "chocolate", items: id === 17 ? [{ r: 0, c: 2 }, { r: 0, c: 6 }] : [], tip: id <= 2 ? "Tukar dua candy yang bersebelahan. Cocokkan 3 bentuk yang sama." : kind === "ice" ? "Cocokkan candy di bawah es. Es berlapis perlu dua hit." : kind === "lock" ? "Match di samping gembok untuk membuka candy." : kind === "stone" ? "Match di samping batu dua kali untuk menghancurkannya." : kind === "chocolate" ? "Hancurkan cokelat tiap langkah agar tidak menyebar." : kind === "box" ? "Match di samping kotak untuk memecahkannya." : "Match 4 membuat striped candy. Match 5 membuat color bomb." };
});
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
