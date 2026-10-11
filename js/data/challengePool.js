/* ═══════════════════════════════════════════════
   MindShift — Challenge Pool
   All challenge definitions organized by category and difficulty (1–5)
   ═══════════════════════════════════════════════ */

// ── Logical Reasoning ─────────────────────────
const LOGICAL = {
  1: [
    { q:'2, 4, 6, 8, ?',      answer:10,  opts:[9,10,11,12],  rule:'Add 2' },
    { q:'5, 10, 15, 20, ?',   answer:25,  opts:[22,23,25,30], rule:'Add 5' },
    { q:'1, 3, 5, 7, ?',      answer:9,   opts:[8,9,10,11],   rule:'Add 2 (odd numbers)' },
    { q:'10, 20, 30, 40, ?',  answer:50,  opts:[45,50,55,60], rule:'Add 10' },
    { q:'3, 6, 9, 12, ?',     answer:15,  opts:[13,14,15,18], rule:'Add 3' }
  ],
  2: [
    { q:'2, 4, 8, 16, ?',     answer:32,  opts:[24,30,32,36], rule:'Multiply by 2' },
    { q:'3, 9, 27, 81, ?',    answer:243, opts:[162,243,324,729], rule:'Multiply by 3' },
    { q:'100, 50, 25, ?',     answer:12.5,opts:[10,12.5,15,20], rule:'Divide by 2' },
    { q:'1, 4, 9, 16, ?',     answer:25,  opts:[20,22,25,36], rule:'Perfect squares' },
    { q:'64, 32, 16, 8, ?',   answer:4,   opts:[2,4,6,8],    rule:'Divide by 2' }
  ],
  3: [
    { q:'1, 1, 2, 3, 5, 8, ?',  answer:13, opts:[10,11,12,13], rule:'Fibonacci' },
    { q:'2, 6, 12, 20, 30, ?',  answer:42, opts:[36,40,42,45], rule:'n×(n+1)' },
    { q:'3, 5, 9, 15, 23, ?',   answer:33, opts:[30,31,33,35], rule:'Add 2,4,6,8,10' },
    { q:'1, 3, 7, 13, 21, ?',   answer:31, opts:[28,29,31,33], rule:'Add 2,4,6,8,10' },
    { q:'144, 72, 36, 18, ?',   answer:9,  opts:[8,9,10,12],  rule:'Divide by 2' }
  ],
  4: [
    { q:'2, 3, 5, 7, 11, 13, ?',    answer:17, opts:[14,15,17,19], rule:'Prime numbers' },
    { q:'0, 1, 3, 6, 10, 15, ?',    answer:21, opts:[18,20,21,25], rule:'Triangular numbers' },
    { q:'1, 8, 27, 64, 125, ?',     answer:216,opts:[196,200,216,225], rule:'Cubes' },
    { q:'4, 7, 11, 16, 22, ?',      answer:29, opts:[26,27,29,31], rule:'Add 3,4,5,6,7' },
    { q:'1, 2, 6, 24, 120, ?',      answer:720,opts:[360,600,720,840], rule:'Factorials' }
  ],
  5: [
    { q:'31, 29, 23, 19, 17, ?',   answer:13, opts:[11,13,15,16], rule:'Prime numbers descending' },
    { q:'1, 4, 10, 22, 46, ?',     answer:94, opts:[80,88,94,100],rule:'a(n)=2×a(n-1)+2' },
    { q:'2, 5, 11, 23, 47, ?',     answer:95, opts:[89,92,95,97], rule:'a(n)=2×a(n-1)+1' },
    { q:'1, 3, 4, 7, 11, 18, ?',   answer:29, opts:[25,27,29,32], rule:'Lucas sequence' },
    { q:'6, 24, 60, 120, 210, ?',  answer:336,opts:[280,310,336,360],rule:'n×(n+1)×(n+2)' }
  ]
};

// ── Pattern Recognition ───────────────────────
// Each challenge has a 3×3 grid of colors/shapes; the 9th cell is the blank
// grid: array of 8 shape descriptors; answer: correct descriptor; opts: 4 options
const SHAPES  = ['circle','square','triangle','diamond','star','hexagon'];
const COLORS  = ['#7c3aed','#06b6d4','#10b981','#f59e0b','#ef4444','#a855f7'];

function makePatternChallenge(diff) {
  // Generate a rule-based 3x3 pattern
  const shapeIdx = Math.floor(Math.random() * SHAPES.length);
  const rules = [
    'color-rotate',    // colors rotate L→R across rows
    'shape-sequence',  // shapes follow a sequence
    'color-gradient',  // hue shifts down rows
    'alternating',     // alternates two shapes/colors
    'diagonal'         // diagonal pattern
  ];
  const rule = rules[Math.floor(Math.random() * (diff < 3 ? 2 : rules.length))];
  return { rule, diff };
}

const PATTERNS = {};
for (let d = 1; d <= 5; d++) {
  PATTERNS[d] = Array.from({ length: 6 }, () => makePatternChallenge(d));
}

// ── Memory Challenges ─────────────────────────
// sequence of emoji symbols shown then hidden; player recalls order
const MEMORY_SYMBOLS = ['🔴','🔵','🟢','🟡','🟣','🟤','⚫','⚪','🔶','🔷','🔸','🔹'];
const MEMORY_NUMBERS = ['1','2','3','4','5','6','7','8','9'];

function makeMemorySeq(count) {
  const pool = [...MEMORY_SYMBOLS];
  const result = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(idx, 1)[0]);
  }
  return result;
}

function makeMemoryNum(count) {
  const pool = [...MEMORY_NUMBERS];
  const result = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(idx, 1)[0]);
  }
  return result;
}

const MEMORY = {
  1: () => ({ type:'symbol', seq: makeMemorySeq(3), showTime:5000 }),
  2: () => ({ type:'symbol', seq: makeMemorySeq(4), showTime:4000 }),
  3: () => ({ type:'mixed',  seq: makeMemorySeq(5), showTime:3000 }),
  4: () => ({ type:'mixed',  seq: makeMemorySeq(6), showTime:2500 }),
  5: () => ({ type:'number', seq: makeMemoryNum(7), showTime:2000 })
};

// ── Visual Observation ────────────────────────
// Scene definitions (drawn by VisualObservation.js on canvas)
// diff determines number of differences (1–5) and scene complexity
const VISUAL_SCENES = [
  { id:'park',    label:'🌳 Park Scene',       diffs:[1,2,3,4,5] },
  { id:'space',   label:'🚀 Space Station',    diffs:[1,2,3,4,5] },
  { id:'ocean',   label:'🌊 Underwater Scene', diffs:[1,2,3,4,5] },
  { id:'city',    label:'🏙️ City Street',      diffs:[1,2,3,4,5] },
  { id:'lab',     label:'🔬 Science Lab',      diffs:[1,2,3,4,5] }
];
const VISUAL = {
  1: () => ({ scene: VISUAL_SCENES[Math.floor(Math.random()*VISUAL_SCENES.length)], diffCount:1 }),
  2: () => ({ scene: VISUAL_SCENES[Math.floor(Math.random()*VISUAL_SCENES.length)], diffCount:2 }),
  3: () => ({ scene: VISUAL_SCENES[Math.floor(Math.random()*VISUAL_SCENES.length)], diffCount:3 }),
  4: () => ({ scene: VISUAL_SCENES[Math.floor(Math.random()*VISUAL_SCENES.length)], diffCount:3 }),
  5: () => ({ scene: VISUAL_SCENES[Math.floor(Math.random()*VISUAL_SCENES.length)], diffCount:5 })
};

// ── Reaction Time ─────────────────────────────
const REACTION = {
  1: () => ({ mode:'simple',   waitMin:1200, waitMax:3000, targets:1 }),
  2: () => ({ mode:'simple',   waitMin:1000, waitMax:2500, targets:1 }),
  3: () => ({ mode:'color',    waitMin:800,  waitMax:2200, targets:1, distractors:2 }),
  4: () => ({ mode:'color',    waitMin:600,  waitMax:1800, targets:1, distractors:3 }),
  5: () => ({ mode:'position', waitMin:500,  waitMax:1500, targets:2, distractors:3 })
};

// ── Audio Challenges ──────────────────────────
const NOTE_NAMES = ['C4','D4','E4','F4','G4','A4','B4','C5'];

function makeNoteSeq(count) {
  return Array.from({ length: count }, () =>
    NOTE_NAMES[Math.floor(Math.random() * NOTE_NAMES.length)]
  );
}

const AUDIO = {
  1: () => ({ seq: makeNoteSeq(2), noteDur:0.6 }),
  2: () => ({ seq: makeNoteSeq(3), noteDur:0.55 }),
  3: () => ({ seq: makeNoteSeq(4), noteDur:0.5  }),
  4: () => ({ seq: makeNoteSeq(5), noteDur:0.45 }),
  5: () => ({ seq: makeNoteSeq(6), noteDur:0.4  })
};

// ── Public API ────────────────────────────────

/**
 * Get a random challenge for a given category and difficulty.
 * @param {string} category  logical|pattern|memory|visual|reaction|audio
 * @param {number} difficulty 1–5
 * @returns {object} challenge data
 */
export function getChallenge(category, difficulty) {
  const d = Math.min(5, Math.max(1, Math.round(difficulty)));

  switch (category) {
    case 'logical': {
      const pool = LOGICAL[d];
      const item = pool[Math.floor(Math.random() * pool.length)];
      // Shuffle options, track correct index
      const shuffled = [...item.opts].sort(() => Math.random() - 0.5);
      return {
        category,
        difficulty: d,
        type: 'logical',
        question: `What comes next?\n${item.q}`,
        options: shuffled,
        correctOption: item.answer,
        rule: item.rule,
        timeLimitSec: [20,16,12,9,7][d-1]
      };
    }

    case 'pattern': {
      const data = PATTERNS[d][Math.floor(Math.random() * PATTERNS[d].length)];
      return {
        category,
        difficulty: d,
        type: 'pattern',
        rule: data.rule,
        timeLimitSec: [24,20,16,13,10][d-1]
      };
    }

    case 'memory': {
      const data = MEMORY[d]();
      return {
        category,
        difficulty: d,
        type: 'memory',
        ...data,
        timeLimitSec: [40,35,30,25,22][d-1]
      };
    }

    case 'visual': {
      const data = VISUAL[d]();
      return {
        category,
        difficulty: d,
        type: 'visual',
        ...data,
        timeLimitSec: [45,40,35,30,28][d-1]
      };
    }

    case 'reaction': {
      const data = REACTION[d]();
      return {
        category,
        difficulty: d,
        type: 'reaction',
        ...data,
        timeLimitSec: 10
      };
    }

    case 'audio': {
      const data = AUDIO[d]();
      return {
        category,
        difficulty: d,
        type: 'audio',
        ...data,
        timeLimitSec: [45,40,35,30,28][d-1]
      };
    }

    default:
      throw new Error(`Unknown category: ${category}`);
  }
}


/** Score formula: base points modified by speed, difficulty, and attempts */
export function calcScore({ correct, difficulty, responseTime, timeLimitSec, attempts, hintUsed }) {
  if (!correct) return 0;
  const base = difficulty * 100;
  const timeRatio = Math.max(0, 1 - responseTime / timeLimitSec);
  const speedBonus = Math.round(timeRatio * base * 0.5);
  const attemptPenalty = (attempts - 1) * 25;
  const hintPenalty = hintUsed ? 30 : 0;
  return Math.max(10, base + speedBonus - attemptPenalty - hintPenalty);
}

export { SHAPES, COLORS, NOTE_NAMES };

// ════════════════════════════════════════════════
// IQ & REASONING CHALLENGE FACTORIES
// ════════════════════════════════════════════════

// ── IQ Number Sequences ───────────────────────
const IQ_SEQUENCES = {
  1: [
    { seq:[2,4,6,8,'?'],   answer:10,  opts:[8,9,10,12],    rule:'Add 2 (even numbers)' },
    { seq:[5,10,15,20,'?'],answer:25,  opts:[22,24,25,30],  rule:'Add 5' },
    { seq:[1,3,5,7,'?'],   answer:9,   opts:[8,9,10,11],    rule:'Add 2 (odd numbers)' },
    { seq:[10,8,6,4,'?'],  answer:2,   opts:[0,1,2,3],      rule:'Subtract 2' },
    { seq:[3,6,9,12,'?'],  answer:15,  opts:[13,14,15,18],  rule:'Add 3' }
  ],
  2: [
    { seq:[2,4,8,16,'?'],  answer:32,  opts:[24,30,32,36],  rule:'Multiply by 2' },
    { seq:[100,50,25,'?'], answer:12.5,opts:[10,12.5,15,20],rule:'Divide by 2' },
    { seq:[1,4,9,16,'?'],  answer:25,  opts:[20,22,25,36],  rule:'Perfect squares' },
    { seq:[3,6,12,24,'?'], answer:48,  opts:[36,42,48,60],  rule:'Multiply by 2' },
    { seq:[5,10,20,40,'?'],answer:80,  opts:[60,70,80,100], rule:'Multiply by 2' }
  ],
  3: [
    { seq:[1,1,2,3,5,8,'?'],  answer:13, opts:[10,11,13,16],  rule:'Fibonacci' },
    { seq:[2,6,12,20,30,'?'], answer:42, opts:[36,40,42,45],  rule:'n×(n+1)' },
    { seq:[3,5,9,15,23,'?'],  answer:33, opts:[30,31,33,35],  rule:'Add 2,4,6,8,10' },
    { seq:[1,3,7,13,21,'?'],  answer:31, opts:[28,29,31,33],  rule:'Add 2,4,6,8,10' },
    { seq:[2,3,5,8,13,'?'],   answer:21, opts:[18,20,21,24],  rule:'Fibonacci-like' }
  ],
  4: [
    { seq:[2,3,5,7,11,13,'?'],   answer:17,  opts:[14,15,17,19],     rule:'Prime numbers' },
    { seq:[1,8,27,64,125,'?'],   answer:216, opts:[196,200,216,225], rule:'Cubes (n³)' },
    { seq:[0,1,3,6,10,15,'?'],   answer:21,  opts:[18,20,21,25],     rule:'Triangular numbers' },
    { seq:[4,7,11,16,22,'?'],    answer:29,  opts:[26,27,29,31],     rule:'Add 3,4,5,6,7' },
    { seq:[1,2,6,24,120,'?'],    answer:720, opts:[360,600,720,840], rule:'Factorials' }
  ],
  5: [
    { seq:[31,29,23,19,17,'?'],  answer:13,  opts:[11,13,15,16],     rule:'Primes descending' },
    { seq:[1,4,10,22,46,'?'],    answer:94,  opts:[80,88,94,100],    rule:'a(n)=2a(n-1)+2' },
    { seq:[2,5,11,23,47,'?'],    answer:95,  opts:[89,92,95,97],     rule:'a(n)=2a(n-1)+1' },
    { seq:[1,3,4,7,11,18,'?'],   answer:29,  opts:[25,27,29,32],     rule:'Lucas sequence' },
    { seq:[6,24,60,120,210,'?'], answer:336, opts:[280,310,336,360], rule:'n(n+1)(n+2)' }
  ]
};

// ── IQ Visual Pattern Sequences ───────────────
const VP_SHAPES = ['circle','square','triangle','diamond','star','hexagon'];
const VP_COLORS = ['#7c3aed','#06b6d4','#10b981','#f59e0b','#ef4444','#a855f7','#ec4899'];

function makeVisualPattern(d) {
  const rules = {
    1: ['shape-alt', 'color-alt'],
    2: ['shape-alt', 'color-alt', 'shape-cycle'],
    3: ['shape-cycle', 'color-cycle', 'both-alt'],
    4: ['both-alt', 'size-change', 'rotation-alt'],
    5: ['rotation-cycle', 'size-color', 'complex']
  };
  const rulePool = rules[d] || rules[3];
  const rule = rulePool[Math.floor(Math.random() * rulePool.length)];
  const s1 = VP_SHAPES[Math.floor(Math.random() * VP_SHAPES.length)];
  const s2 = VP_SHAPES.filter(s => s !== s1)[Math.floor(Math.random() * 5)];
  const c1 = VP_COLORS[Math.floor(Math.random() * VP_COLORS.length)];
  const c2 = VP_COLORS.filter(c => c !== c1)[Math.floor(Math.random() * 6)];

  let seq, answer, options, ruleText;
  switch (rule) {
    case 'shape-alt':
      seq = [
        {shape:s1,color:c1},{shape:s2,color:c1},{shape:s1,color:c1},{shape:s2,color:c1},{blank:true}
      ];
      answer = {shape:s1,color:c1};
      ruleText = 'Shapes alternate';
      break;
    case 'color-alt':
      seq = [
        {shape:s1,color:c1},{shape:s1,color:c2},{shape:s1,color:c1},{shape:s1,color:c2},{blank:true}
      ];
      answer = {shape:s1,color:c1};
      ruleText = 'Colors alternate';
      break;
    case 'shape-cycle':
      seq = [
        {shape:s1,color:c1},{shape:s2,color:c1},{shape:'circle',color:c1},{shape:s1,color:c1},{blank:true}
      ];
      answer = {shape:s2,color:c1};
      ruleText = 'Shape 3-cycle';
      break;
    case 'both-alt':
      seq = [
        {shape:s1,color:c1},{shape:s2,color:c2},{shape:s1,color:c1},{shape:s2,color:c2},{blank:true}
      ];
      answer = {shape:s1,color:c1};
      ruleText = 'Both shape and color alternate';
      break;
    case 'rotation-alt':
      seq = [
        {shape:'triangle',color:c1,rotation:0},{shape:'triangle',color:c1,rotation:60},
        {shape:'triangle',color:c1,rotation:0},{shape:'triangle',color:c1,rotation:60},{blank:true}
      ];
      answer = {shape:'triangle',color:c1,rotation:0};
      ruleText = 'Rotation alternates';
      break;
    case 'size-change':
      seq = [
        {shape:s1,color:c1,size:0.7},{shape:s1,color:c1,size:0.85},{shape:s1,color:c1,size:1.0},{shape:s1,color:c1,size:1.15},{blank:true}
      ];
      answer = {shape:s1,color:c1,size:1.3};
      ruleText = 'Size increases';
      break;
    default:
      seq = [
        {shape:s1,color:c1},{shape:s2,color:c2},{shape:s1,color:c1},{shape:s2,color:c2},{blank:true}
      ];
      answer = {shape:s1,color:c1};
      ruleText = 'Pattern repeats';
  }

  // Generate wrong options
  const wrongs = [
    {shape:s2,color:c2},{shape:s1,color:c2},{shape:s2,color:c1}
  ];
  const optList = [...wrongs, answer].sort(() => Math.random() - 0.5);
  const correctIdx = optList.findIndex(o => o.shape === answer.shape && o.color === answer.color && o.rotation === answer.rotation);
  return { seq, answer, options: optList, correctIdx, rule: ruleText };
}

// ── IQ Matrix Puzzles ─────────────────────────
const MATRIX_SHAPES = ['circle','square','triangle','diamond','star'];
const MATRIX_COLORS = ['#7c3aed','#06b6d4','#10b981','#f59e0b','#ef4444'];

function makeMatrixPuzzle(d) {
  // Row-color rule: each row uses a different color, each column uses a different shape
  const rowColors = [...MATRIX_COLORS].sort(() => Math.random() - 0.5).slice(0, 3);
  const colShapes = [...MATRIX_SHAPES].sort(() => Math.random() - 0.5).slice(0, 3);
  const addRot = d >= 4;

  const grid = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const rotation = addRot ? [0, 45, 90, 135][Math.floor(Math.random() * 4)] : 0;
      grid.push({ shape: colShapes[c], color: rowColors[r], size: 1, rotation });
    }
  }

  const answer = grid[8]; // bottom-right
  // Wrong options
  const makeWrong = (i, j) => ({ shape: colShapes[i], color: rowColors[j], size: 1 });
  const wrongPool = [
    makeWrong(0, 0), makeWrong(1, 1), makeWrong(2, 0), makeWrong(0, 2)
  ].filter(w => w.shape !== answer.shape || w.color !== answer.color);

  const optList = [...wrongPool.slice(0, 3), answer].sort(() => Math.random() - 0.5);
  const correctIdx = optList.findIndex(o => o.shape === answer.shape && o.color === answer.color);

  return { grid: grid.slice(0, 8), answer, options: optList, correctIdx, rule: d >= 3 ? 'Each shape and color appears once per row/column' : 'Colors repeat per row, shapes per column' };
}

// ── IQ Odd One Out ────────────────────────────
const OOO_SHAPES = ['circle','square','triangle','diamond','star','hexagon'];
const OOO_COLORS = ['#7c3aed','#06b6d4','#10b981','#f59e0b','#ef4444','#a855f7'];

function makeOddOneOut(d) {
  const subtypes = d <= 2 ? ['shape','color'] :
                   d === 3 ? ['shape','color','size','rotation'] :
                              ['shape','color','size','rotation','number'];
  const subtype = subtypes[Math.floor(Math.random() * subtypes.length)];
  const count = d <= 2 ? 5 : d <= 4 ? 6 : 6;

  let items = [], oddIdx;
  if (subtype === 'number') {
    // Numbers — one doesn't fit numeric pattern
    const base = [2,4,6,8,10,12].slice(0, count);
    oddIdx = Math.floor(Math.random() * count);
    base[oddIdx] = base[oddIdx] + 3; // odd one out: breaks even pattern
    items = base.map(v => ({ type:'number', value:v }));
  } else if (subtype === 'color') {
    const mainColor = OOO_COLORS[Math.floor(Math.random() * OOO_COLORS.length)];
    const oddColor  = OOO_COLORS.filter(c => c !== mainColor)[Math.floor(Math.random() * 5)];
    const shape     = OOO_SHAPES[Math.floor(Math.random() * OOO_SHAPES.length)];
    oddIdx = Math.floor(Math.random() * count);
    items  = Array.from({length:count}, (_,i) => ({ shape, color: i === oddIdx ? oddColor : mainColor, size:1, rotation:0 }));
  } else if (subtype === 'size') {
    const color = OOO_COLORS[Math.floor(Math.random() * OOO_COLORS.length)];
    const shape = OOO_SHAPES[Math.floor(Math.random() * OOO_SHAPES.length)];
    oddIdx = Math.floor(Math.random() * count);
    items  = Array.from({length:count}, (_,i) => ({ shape, color, size: i === oddIdx ? 1.8 : 1.0, rotation:0 }));
  } else if (subtype === 'rotation') {
    const color = OOO_COLORS[Math.floor(Math.random() * OOO_COLORS.length)];
    oddIdx = Math.floor(Math.random() * count);
    items  = Array.from({length:count}, (_,i) => ({ shape:'triangle', color, size:1.0, rotation: i === oddIdx ? 90 : 0 }));
  } else {
    // shape
    const mainShape = OOO_SHAPES[Math.floor(Math.random() * OOO_SHAPES.length)];
    const oddShape  = OOO_SHAPES.filter(s => s !== mainShape)[Math.floor(Math.random() * 5)];
    const color = OOO_COLORS[Math.floor(Math.random() * OOO_COLORS.length)];
    oddIdx = Math.floor(Math.random() * count);
    items  = Array.from({length:count}, (_,i) => ({ shape: i === oddIdx ? oddShape : mainShape, color, size:1, rotation:0 }));
  }

  return { items, oddIdx, subtype };
}

// ── IQ Spatial Reasoning ──────────────────────
const SPATIAL_SHAPES = ['L','T','arrow','Z','check'];

function makeSpatialReasoning(d) {
  const subtypes = d <= 2 ? ['rotation'] : d <= 4 ? ['rotation','mirror'] : ['rotation','mirror'];
  const subtype  = subtypes[Math.floor(Math.random() * subtypes.length)];
  const shape    = SPATIAL_SHAPES[Math.floor(Math.random() * SPATIAL_SHAPES.length)];
  const targetAngle = [0, 45, 90, 135, 180, 225, 270][Math.floor(Math.random() * 7)];

  let options, correctIdx;
  if (subtype === 'mirror') {
    // 0 = normal, 1 = mirrored; answer is always mirrored
    const angles = [0, 1, 0, 1].sort(() => Math.random() - 0.5);
    correctIdx = angles.indexOf(1);
    options = angles;
  } else {
    // Rotation: find option matching targetAngle
    const wrongAngles = [0, 90, 180, 270].filter(a => a !== (targetAngle % 360));
    const shuffled = [...wrongAngles.slice(0, 3), targetAngle % 360].sort(() => Math.random() - 0.5);
    correctIdx = shuffled.indexOf(targetAngle % 360);
    options = shuffled;
  }

  return { shapeType: shape, targetAngle, subtype, options, correctIdx };
}

// ── IQ Logic Puzzles ──────────────────────────
const LOGIC_POOL = {
  1: [
    {
      subtype:'ordering', problem:'Tom is taller than Sam. Sam is taller than Alex. Who is the shortest?',
      visual:[{label:'Tom',value:85},{label:'Sam',value:60},{label:'Alex',value:38}],
      options:['Tom','Sam','Alex','Cannot determine'], answer:'Alex'
    },
    {
      subtype:'ordering', problem:'Book A is heavier than Book B. Book B is heavier than Book C. Which book is lightest?',
      icons:[{emoji:'📚',label:'A'},{emoji:'📕',label:'B'},{emoji:'📔',label:'C'}],
      options:['Book A','Book B','Book C','All equal'], answer:'Book C'
    },
    {
      subtype:'comparison', problem:'Maria has more apples than John. John has more than Priya. Who has the most apples?',
      icons:[{emoji:'🍎',label:'Maria'},{emoji:'🍏',label:'John'},{emoji:'🍐',label:'Priya'}],
      options:['Maria','John','Priya','Cannot determine'], answer:'Maria'
    }
  ],
  2: [
    {
      subtype:'comparison', problem:'Blue box weighs more than Red box. Green box weighs less than Red box. Which is heaviest?',
      icons:[{emoji:'🔵',label:'Blue'},{emoji:'🔴',label:'Red'},{emoji:'🟢',label:'Green'}],
      options:['Blue box','Red box','Green box','All equal'], answer:'Blue box'
    },
    {
      subtype:'ordering', problem:'Anna finished before Ben. Ben finished before Claire. Who finished last?',
      icons:[{emoji:'🥇',label:'Anna'},{emoji:'🥈',label:'Ben'},{emoji:'🥉',label:'Claire'}],
      options:['Anna','Ben','Claire','Tie'], answer:'Claire'
    },
    {
      subtype:'rule', problem:'Only red shapes go before blue shapes. The sequence is: Blue, Red, Red, Blue, Blue. Which color should come next?',
      options:['Red','Blue','Green','Cannot determine'], answer:'Red'
    }
  ],
  3: [
    {
      subtype:'deduction', problem:'All dogs are animals. Max is a dog. Is Max an animal?',
      options:['Yes','No','Cannot determine','Maybe'], answer:'Yes'
    },
    {
      subtype:'deduction', problem:'Some birds can fly. Penguins are birds. Can penguins definitely fly?',
      options:['Yes','No','Cannot determine','Only at night'], answer:'Cannot determine'
    },
    {
      subtype:'ordering', problem:'P > Q > R > S. Which two are in the middle?',
      visual:[{label:'P',value:90},{label:'Q',value:70},{label:'R',value:50},{label:'S',value:30}],
      options:['P and Q','Q and R','R and S','P and S'], answer:'Q and R'
    }
  ],
  4: [
    {
      subtype:'relationship', problem:'A is the mother of B. B is the father of C. What is A to C?',
      icons:[{emoji:'👩',label:'A'},{emoji:'👨',label:'B'},{emoji:'🧒',label:'C'}],
      options:['Mother','Grandmother','Aunt','Sister'], answer:'Grandmother'
    },
    {
      subtype:'rule', problem:'If it rains, the ground is wet. The ground is wet. Did it rain?',
      options:['Yes, definitely','No, definitely','Cannot determine','It depends'], answer:'Cannot determine'
    },
    {
      subtype:'deduction', problem:'All X are Y. All Y are Z. Some X are W. Are all X also Z?',
      options:['Yes','No','Cannot determine','Sometimes'], answer:'Yes'
    }
  ],
  5: [
    {
      subtype:'rule', problem:'A→B means if A is true, B is true. A is true, B→C is also given. What can we conclude?',
      options:['Only B is true','B and C are both true','Only C is true','Nothing can be concluded'], answer:'B and C are both true'
    },
    {
      subtype:'deduction', problem:'No S is P. All M is P. Can M be S?',
      options:['Yes','No','Cannot determine','Only sometimes'], answer:'No'
    },
    {
      subtype:'relationship', problem:'5 people sit in a row: A, B, C, D, E. A is 2 seats right of C. D is between B and E. C is at position 1. Where is A?',
      options:['Position 2','Position 3','Position 4','Position 5'], answer:'Position 3'
    }
  ]
};

// ── IQ Memory Reasoning ───────────────────────
const MR_EMOJIS = ['🔴','🔵','🟢','🟡','🟣','🟤','🔶','🔷','⭐','🍀','🎯','🎲','🌀','💎','🔑'];
const MR_COLORS = ['#ef4444','#3b82f6','#10b981','#f59e0b','#a855f7','#ec4899','#06b6d4','#84cc16'];

function makeMemoryReasoning(d) {
  const configs = [
    { rows:2, cols:2, count:4, showTime:4000, timeLimitSec:20 }, // d=1
    { rows:2, cols:3, count:6, showTime:4000, timeLimitSec:22 }, // d=2
    { rows:2, cols:3, count:6, showTime:3000, timeLimitSec:20 }, // d=3
    { rows:3, cols:3, count:9, showTime:3000, timeLimitSec:22 }, // d=4
    { rows:3, cols:3, count:9, showTime:2000, timeLimitSec:20 }  // d=5
  ];
  const cfg = configs[d - 1];
  const pool = [...MR_EMOJIS].sort(() => Math.random() - 0.5).slice(0, cfg.count);
  const items = pool.map(e => ({ type:'emoji', value:e }));

  const targetIdx = Math.floor(Math.random() * cfg.count);
  const answer = items[targetIdx].value;

  const questionTypes = ['position', 'value'];
  const qType = d <= 2 ? 'position' : questionTypes[Math.floor(Math.random() * 2)];
  const question = qType === 'position'
    ? `What symbol was in position ${targetIdx + 1}?`
    : `Which symbol appeared in the ${['first','second','third','fourth','fifth','sixth','seventh','eighth','ninth'][targetIdx] || (targetIdx+1)+'th'} position?`;

  // Generate options: answer + 3 wrong
  const wrongPool = MR_EMOJIS.filter(e => e !== answer).sort(() => Math.random() - 0.5).slice(0, 3);
  const options = [...wrongPool, answer].sort(() => Math.random() - 0.5);

  return { items, targetIdx, question, answer, options, ...cfg };
}

// ── IQ getChallenge Dispatcher ────────────────
export function getIQChallenge(category, difficulty) {
  const d = Math.min(5, Math.max(1, Math.round(difficulty)));

  switch (category) {
    case 'iq-number': {
      const pool = IQ_SEQUENCES[d];
      const item = pool[Math.floor(Math.random() * pool.length)];
      const shuffled = [...item.opts].sort(() => Math.random() - 0.5);
      return {
        category, difficulty: d, type: 'iq-number',
        sequence: item.seq, answer: item.answer, options: shuffled,
        rule: item.rule, timeLimitSec: [22,18,14,11,9][d-1]
      };
    }
    case 'iq-pattern': {
      const data = makeVisualPattern(d);
      return { category, difficulty: d, type: 'iq-pattern', ...data, timeLimitSec: [24,20,16,13,10][d-1] };
    }
    case 'iq-matrix': {
      const data = makeMatrixPuzzle(d);
      return { category, difficulty: d, type: 'iq-matrix', ...data, timeLimitSec: [28,23,19,15,12][d-1] };
    }
    case 'iq-odd': {
      const data = makeOddOneOut(d);
      return { category, difficulty: d, type: 'iq-odd', ...data, timeLimitSec: [20,18,15,13,11][d-1] };
    }
    case 'iq-spatial': {
      const data = makeSpatialReasoning(d);
      return { category, difficulty: d, type: 'iq-spatial', ...data, timeLimitSec: [22,20,17,14,12][d-1] };
    }
    case 'iq-logic': {
      const pool = LOGIC_POOL[d] || LOGIC_POOL[3];
      const item = pool[Math.floor(Math.random() * pool.length)];
      return { category, difficulty: d, type: 'iq-logic', ...item, timeLimitSec: [28,24,20,17,15][d-1] };
    }
    case 'iq-memory': {
      const data = makeMemoryReasoning(d);
      return { category, difficulty: d, type: 'iq-memory', ...data };
    }
    default:
      throw new Error(`Unknown IQ category: ${category}`);
  }
}
