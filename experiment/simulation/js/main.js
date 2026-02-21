/* ═══════════════════════════════════════════════════════════════
   ROD CUTTING VISUALIZER — MAIN SCRIPT
   Virtual Lab for Algorithm Design
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ══════════════════════════════════════════════════
     1. CONFIGURATION & CONSTANTS
     ══════════════════════════════════════════════════ */
  const MAX_ROD_LENGTH = 15;
  const MIN_ROD_LENGTH = 1;

  // Speed slider: value 1 (slowest) → 10 (fastest)
  // Maps to interval in ms
  const SPEED_MAP = [1200, 950, 750, 600, 480, 380, 280, 200, 140, 90];

  const PRESETS = [
    {
      id: 'classic',
      label: 'Classic',
      n: 8,
      prices: [1, 5, 8, 9, 10, 17, 17, 20],
      description: 'The textbook example — short pieces are surprisingly valuable.'
    },
    {
      id: 'increasing',
      label: 'Increasing',
      n: 8,
      prices: [1, 3, 6, 10, 15, 21, 28, 36],
      description: 'Longer pieces earn more per unit. Is cutting ever worth it?'
    },
    {
      id: 'bulk',
      label: 'Bulk Discount',
      n: 8,
      prices: [10, 18, 22, 25, 27, 28, 29, 30],
      description: 'Diminishing returns — short pieces dominate.'
    },
    {
      id: 'timber',
      label: 'Timber',
      n: 10,
      prices: [2, 5, 7, 9, 10, 12, 13, 14, 16, 18],
      description: 'Realistic timber pricing with mixed optimal cuts.'
    },
    {
      id: 'challenge',
      label: 'Challenge',
      n: 12,
      prices: [3, 5, 10, 11, 13, 17, 17, 20, 24, 28, 31, 35],
      description: 'Can you predict the answer before running it?'
    }
  ];

  // Tutorial steps
  const TUTORIAL_STEPS = [
    {
      title: 'Welcome to the Rod Cutting Visualizer',
      desc: 'This tool helps you understand how Dynamic Programming solves the Rod Cutting problem — step by step, with full explanations.',
      target: null // no spotlight
    },
    {
      title: 'Choose a Preset or Set Prices',
      desc: 'Pick a preset problem to load instantly, or manually enter prices for each piece length in the left panel.',
      target: '#presetPills'
    },
    {
      title: 'Initialize the Algorithm',
      desc: 'Click "Initialize" to prepare the algorithm. The DP table and rod visualization will appear.',
      target: '#initBtn'
    },
    {
      title: 'Step Through the Algorithm',
      desc: 'Use the Play/Pause button or step forward one move at a time. Watch the DP table fill and the formula panel update live.',
      target: '.controls-left'
    },
    {
      title: 'Read the Explanation',
      desc: 'The right panel explains what is happening at each step in plain English. The formula shows every comparison being made.',
      target: '.explanation-block'
    }
  ];

  // Practice challenges (shown after solution is found)
  const CHALLENGES = [
    'Can you predict the max profit before the algorithm finishes?',
    'What happens if you double the price of length 1?',
    'Try to design prices where the rod should NOT be cut at all.',
    'Which preset gives the most cuts in its optimal solution?'
  ];

  /* ══════════════════════════════════════════════════
     2. STATE
     ══════════════════════════════════════════════════ */
  const state = {
    rodLength: 8,
    prices: [1, 5, 8, 9, 10, 17, 17, 20],

    // Algorithm state
    initialized: false,
    completed: false,
    playing: false,

    // DP arrays (filled during execution)
    dp: [],        // dp[i] = max profit for rod of length i
    cut: [],       // cut[i] = first cut size for optimal solution of length i

    // Step generation
    steps: [],     // Array of step-state snapshots
    currentStepIndex: -1,
    totalComparisons: 0,

    // Autoplay interval ID
    playInterval: null,

    // Active preset
    activePreset: 'classic',

    // Tutorial state
    tutorialStep: 0,
    tutorialDone: false
  };

  /* ══════════════════════════════════════════════════
     3. DOM REFERENCES (cached)
     ══════════════════════════════════════════════════ */
  const qid  = id  => document.getElementById(id);
  const qall = sel => document.querySelectorAll(sel);

  const dom = {
    rodLengthSelect: qid('rodLengthSelect'),
    priceGrid:       qid('priceGrid'),
    initBtn:         qid('initBtn'),
    prevBtn:         qid('prevBtn'),
    playPauseBtn:    qid('playPauseBtn'),
    nextBtn:         qid('nextBtn'),
    resetBtn:        qid('resetBtn'),
    speedSlider:     qid('speedSlider'),

    rodTrack:        qid('rodTrack'),
    cutLabels:       qid('cutLabels'),
    vizStatus:       qid('vizStatus'),

    dpTableBody:     qid('dpTableBody'),

    formulaIdle:     qid('formulaIdle'),
    formulaLive:     qid('formulaLive'),
    formulaTarget:   qid('formulaTarget'),
    formulaRows:     qid('formulaRows'),
    formulaResult:   qid('formulaResult'),

    explanationText: qid('explanationText'),

    statSteps:       qid('statSteps'),
    statComparisons: qid('statComparisons'),
    statMaxProfit:   qid('statMaxProfit'),
    statCuts:        qid('statCuts'),

    currentStep:     qid('currentStep'),
    totalSteps:      qid('totalSteps'),

    presetPills:     qid('presetPills'),

    shortcutsModal:  qid('shortcutsModal'),
    shortcutsCloseBtn: qid('shortcutsCloseBtn'),
    keyboardHelpBtn: qid('keyboardHelpBtn'),

    themeToggleBtn:  qid('themeToggleBtn'),

    tutorialOverlay: qid('tutorialOverlay'),
    tutorialCard:    qid('tutorialCard'),
    tutorialSpotlight: qid('tutorialSpotlight'),
    tutorialTitle:   qid('tutorialTitle'),
    tutorialDesc:    qid('tutorialDesc'),
    tutorialStepNum: qid('tutorialStepNum'),
    tutorialStepTotal: qid('tutorialStepTotal'),
    tutorialNextBtn: qid('tutorialNextBtn'),
    tutorialSkipBtn: qid('tutorialSkipBtn'),

    challengeBlock: qid('challengeBlock'),
    challengeList:  qid('challengeList'),

    toastContainer: qid('toastContainer')
  };

  /* ══════════════════════════════════════════════════
     4. INITIALIZATION — PAGE LOAD
     ══════════════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', () => {
    buildRodLengthSelect();
    buildPresetPills();
    buildPriceGrid();
    renderDPTableHeaders();
    renderDPTableRows(); // empty initial state
    renderRod();         // empty rod
    attachEvents();
    loadThemePref();

    // Tutorial: show on first visit
    if (!sessionStorage.getItem('rodcut_tutorial_done')) {
      setTimeout(startTutorial, 600);
    }
  });

  /* ══════════════════════════════════════════════════
     5. BUILD UI COMPONENTS
     ══════════════════════════════════════════════════ */

  function buildRodLengthSelect () {
    const sel = dom.rodLengthSelect;
    sel.innerHTML = '';
    for (let i = MIN_ROD_LENGTH; i <= MAX_ROD_LENGTH; i++) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = i + ' unit' + (i > 1 ? 's' : '');
      if (i === state.rodLength) opt.selected = true;
      sel.appendChild(opt);
    }
  }

  function buildPresetPills () {
    dom.presetPills.innerHTML = '';
    PRESETS.forEach(p => {
      const btn = document.createElement('button');
      btn.className = 'preset-pill' + (p.id === state.activePreset ? ' active' : '');
      btn.textContent = p.label;
      btn.dataset.presetId = p.id;
      btn.setAttribute('aria-label', p.label + ' preset');
      dom.presetPills.appendChild(btn);
    });
  }

  function buildPriceGrid () {
    dom.priceGrid.innerHTML = '';
    for (let i = 0; i < state.rodLength; i++) {
      const wrap = document.createElement('div');
      wrap.className = 'price-input-wrap';

      const label = document.createElement('span');
      label.className = 'price-label';
      label.textContent = (i + 1);

      const input = document.createElement('input');
      input.type = 'text';
      input.inputMode = 'numeric';
      input.className = 'price-input';
      input.id = 'price-' + i;
      input.value = (state.prices[i] !== undefined ? state.prices[i] : 0);
      input.setAttribute('aria-label', 'Price for length ' + (i + 1));
      input.setAttribute('data-index', i);

      wrap.appendChild(label);
      wrap.appendChild(input);
      dom.priceGrid.appendChild(wrap);
    }
  }

  function renderDPTableHeaders () {
    // Static — already in HTML
  }

  function renderDPTableRows (dpArr, cutArr, activeRow, filledUpTo, targetRow) {
    const tbody = dom.dpTableBody;
    tbody.innerHTML = '';
    const n = state.rodLength;

    for (let i = 0; i <= n; i++) {
      const tr = document.createElement('tr');
      tr.id = 'dp-row-' + i;

      // Determine row class
      let rowClass = '';
      if (i === activeRow) rowClass = 'dp-cell-active';
      else if (i === targetRow) rowClass = 'dp-cell-target';
      else if (filledUpTo !== undefined && i <= filledUpTo && i !== activeRow) rowClass = 'dp-cell-filled';

      if (rowClass) tr.className = rowClass;

      // Length
      const tdLen = makeTd(i.toString());

      // Price
      const priceVal = i === 0 ? '—' : (state.prices[i - 1] !== undefined ? state.prices[i - 1] : '—');
      const tdPrice = makeTd(priceVal.toString());

      // Max Profit
      const dpVal = (dpArr && dpArr[i] !== undefined && (filledUpTo === undefined || i <= filledUpTo))
        ? dpArr[i].toString()
        : '—';
      const tdProfit = makeTd(dpVal);
      if (dpVal === '—') tdProfit.className = 'dp-cell-empty';

      // Cut size
      let cutVal = '—';
      if (cutArr && cutArr[i] !== undefined && (filledUpTo === undefined || i <= filledUpTo) && i > 0) {
        cutVal = cutArr[i].toString();
      }
      const tdCut = makeTd(cutVal);
      if (cutVal === '—') tdCut.className = 'dp-cell-empty';

      tr.appendChild(tdLen);
      tr.appendChild(tdPrice);
      tr.appendChild(tdProfit);
      tr.appendChild(tdCut);
      tbody.appendChild(tr);
    }
  }

  function makeTd (text) {
    const td = document.createElement('td');
    td.textContent = text;
    return td;
  }

  /* ══════════════════════════════════════════════════
     6. ROD VISUALIZATION
     ══════════════════════════════════════════════════ */
  // Color palette indexed by piece length (1-based)
  const ROD_COLORS = [
    '#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444',
    '#06b6d4','#ec4899','#84cc16','#f97316','#6366f1',
    '#14b8a6','#e11d48','#7c3aed','#0ea5e9','#a855f7'
  ];

  function renderRod (pieces) {
    const track = dom.rodTrack;
    const labels = dom.cutLabels;
    track.innerHTML = '';
    labels.innerHTML = '';

    if (!pieces || pieces.length === 0) {
      // Draw monolithic rod (uncut)
      const seg = document.createElement('div');
      seg.className = 'rod-segment';
      seg.style.width = '100%';
      seg.style.background = '#cbd5e1';
      seg.textContent = state.rodLength;
      track.appendChild(seg);
      return;
    }

    // Draw cut pieces with staggered animation
    let totalLen = pieces.reduce((a, b) => a + b, 0);
    pieces.forEach((pieceLen, idx) => {
      const seg = document.createElement('div');
      seg.className = 'rod-segment segment-cut';
      seg.style.width = ((pieceLen / totalLen) * 100) + '%';
      seg.style.background = ROD_COLORS[(pieceLen - 1) % ROD_COLORS.length];
      seg.style.animationDelay = (idx * 80) + 'ms';
      seg.textContent = pieceLen;
      track.appendChild(seg);

      // Label
      const lbl = document.createElement('div');
      lbl.className = 'cut-label';
      lbl.style.animationDelay = (idx * 80 + 100) + 'ms';
      lbl.textContent = '$' + state.prices[pieceLen - 1];
      labels.appendChild(lbl);
    });
  }

  /* ══════════════════════════════════════════════════
     7. ALGORITHM — PRE-COMPUTE ALL STEPS
     ══════════════════════════════════════════════════ */
  function precomputeSteps () {
    const n = state.rodLength;
    const prices = state.prices.slice();
    const dp = new Array(n + 1).fill(0);
    const cut = new Array(n + 1).fill(0);
    const steps = [];
    let comparisons = 0;

    // Step 0 — initialization
    steps.push({
      phase: 'init',
      dpSnapshot: dp.slice(),
      cutSnapshot: cut.slice(),
      filledUpTo: 0,
      activeRow: null,
      comparingRow: null,
      codeLines: [0, 1],
      explanation: '<p>The algorithm begins. We create a DP table with <strong>' + (n + 1) + ' entries</strong> (lengths 0 through ' + n + '). dp[0] = 0 because a rod of length 0 earns nothing.</p>',
      formula: null,
      comparisons: 0
    });

    // Fill DP table
    for (let i = 1; i <= n; i++) {
      let bestProfit = 0;
      let bestCut = 0;
      const formulaRows = [];

      for (let j = 1; j <= i; j++) {
        comparisons++;
        const candidate = prices[j - 1] + dp[i - j];
        formulaRows.push({
          j: j,
          priceJ: prices[j - 1],
          dpRem: dp[i - j],
          remLen: i - j,
          total: candidate,
          isBest: false
        });

        // "Before update" step — show comparison in progress
        steps.push({
          phase: 'comparing',
          dpSnapshot: dp.slice(),
          cutSnapshot: cut.slice(),
          filledUpTo: i - 1,
          activeRow: i,
          comparingJ: j,
          codeLines: [2, 3, 4],
          explanation: buildCompareExplanation(i, j, prices[j - 1], dp[i - j], candidate, bestProfit),
          formula: {
            target: 'dp[' + i + '] = max(...)',
            rows: formulaRows.map(r => ({...r})),
            currentJ: j,
            result: null
          },
          comparisons: comparisons
        });

        if (candidate > bestProfit) {
          bestProfit = candidate;
          bestCut = j;
          // Mark all rows so far for "best" highlighting
        }
      }

      // Update dp and cut
      dp[i] = bestProfit;
      cut[i] = bestCut;

      // Mark the best row in formula
      formulaRows.forEach(r => { r.isBest = (r.j === bestCut); });

      // "After update" step — dp[i] is now filled
      steps.push({
        phase: 'filled',
        dpSnapshot: dp.slice(),
        cutSnapshot: cut.slice(),
        filledUpTo: i,
        activeRow: i,
        codeLines: [5, 6],
        explanation: buildFilledExplanation(i, bestProfit, bestCut, prices),
        formula: {
          target: 'dp[' + i + '] = ' + bestProfit,
          rows: formulaRows,
          currentJ: null,
          result: 'Best: cut ' + bestCut + ' unit' + (bestCut > 1 ? 's' : '') + ' → profit = ' + bestProfit
        },
        comparisons: comparisons
      });
    }

    // Traceback phase
    const pieces = [];
    let rem = n;
    while (rem > 0) {
      pieces.push(cut[rem]);
      const prevRem = rem;
      rem -= cut[rem];

      steps.push({
        phase: 'traceback',
        dpSnapshot: dp.slice(),
        cutSnapshot: cut.slice(),
        filledUpTo: n,
        activeRow: prevRem,
        targetRow: rem,
        codeLines: [7, 8],
        explanation: buildTracebackExplanation(prevRem, cut[prevRem], rem, pieces.slice()),
        formula: null,
        pieces: pieces.slice(),
        comparisons: comparisons
      });
    }

    // Final completion step
    steps.push({
      phase: 'complete',
      dpSnapshot: dp.slice(),
      cutSnapshot: cut.slice(),
      filledUpTo: n,
      activeRow: null,
      codeLines: [7],
      explanation: buildCompleteExplanation(n, dp[n], pieces),
      formula: null,
      pieces: pieces.slice(),
      comparisons: comparisons
    });

    return { steps, dp, cut, comparisons };
  }

  /* ══════════════════════════════════════════════════
     8. EXPLANATION BUILDERS
     ══════════════════════════════════════════════════ */
  function buildCompareExplanation (i, j, priceJ, dpRem, candidate, currentBest) {
    let html = '<p>Trying to cut <span class="highlight">' + j + ' unit' + (j > 1 ? 's' : '') + '</span> from the rod of length ' + i + '.</p>';
    html += '<p>Price for ' + j + ' unit' + (j > 1 ? 's' : '') + ' = $' + priceJ;
    if (i - j > 0) {
      html += ', plus the best profit for the remaining ' + (i - j) + ' units = $' + dpRem;
    }
    html += ' → total = $' + candidate + '</p>';
    if (candidate > currentBest) {
      html += '<p><span class="good">✓ New best!</span> This is better than $' + currentBest + '.</p>';
    } else {
      html += '<p>Not better than the current best of $' + currentBest + '. Moving on.</p>';
    }
    return html;
  }

  function buildFilledExplanation (i, profit, bestCut, prices) {
    let html = '<p>After trying all possible first cuts for length <strong>' + i + '</strong>, the best option is to cut <span class="good">' + bestCut + ' unit' + (bestCut > 1 ? 's' : '') + '</span> first.</p>';
    html += '<p>This gives a maximum profit of <span class="good">$' + profit + '</span>. The value dp[' + i + '] = ' + profit + ' is now stored.</p>';
    return html;
  }

  function buildTracebackExplanation (fromLen, cutSize, remaining, pieces) {
    let html = '<p>Tracing back the solution: from length <strong>' + fromLen + '</strong>, the optimal first cut is <span class="highlight">' + cutSize + ' unit' + (cutSize > 1 ? 's' : '') + '</span>.</p>';
    if (remaining > 0) {
      html += '<p>Remaining rod: <strong>' + remaining + ' units</strong>. Continue tracing…</p>';
    }
    html += '<p>Pieces so far: <strong>' + pieces.join(' + ') + '</strong></p>';
    return html;
  }

  function buildCompleteExplanation (n, maxProfit, pieces) {
    const piecePrices = pieces.map(p => state.prices[p - 1]);
    let html = '<p><span class="good">✓ Solution found!</span> The rod of length <strong>' + n + '</strong> should be cut into pieces: <strong>' + pieces.join(' + ') + '</strong>.</p>';
    html += '<p>Piece values: ' + pieces.map((p, idx) => '$' + piecePrices[idx]).join(' + ') + ' = <span class="good">$' + maxProfit + '</span></p>';
    html += '<p>This is the maximum possible profit — no other combination of cuts can earn more.</p>';
    return html;
  }

  /* ══════════════════════════════════════════════════
     9. RENDER CURRENT STEP
     ══════════════════════════════════════════════════ */
  function renderStep (stepIndex) {
    if (stepIndex < 0 || stepIndex >= state.steps.length) return;

    const step = state.steps[stepIndex];
    state.currentStepIndex = stepIndex;

    // --- DP Table ---
    renderDPTableRows(
      step.dpSnapshot,
      step.cutSnapshot,
      step.activeRow,
      step.filledUpTo,
      step.targetRow || null
    );

    // --- Rod visualization ---
    if (step.pieces) {
      renderRod(step.pieces);
    } else if (step.phase === 'init') {
      renderRod(null);
    }
    // During filling phase, keep the monolithic rod
    if (step.phase === 'comparing' || step.phase === 'filled') {
      // Show monolithic rod still being worked on
      if (!step.pieces) renderRod(null);
    }

    // --- Status text ---
    if (step.phase === 'init') dom.vizStatus.textContent = 'Initializing…';
    else if (step.phase === 'comparing' || step.phase === 'filled') dom.vizStatus.textContent = 'Filling DP table…';
    else if (step.phase === 'traceback') dom.vizStatus.textContent = 'Tracing optimal cuts…';
    else if (step.phase === 'complete') dom.vizStatus.textContent = 'Solution found ✓';

    // --- Formula panel ---
    renderFormulaPanel(step);

    // --- Explanation ---
    dom.explanationText.innerHTML = step.explanation;

    // --- Pseudocode highlight ---
    highlightCode(step.codeLines);

    // --- Stats ---
    dom.currentStep.textContent = stepIndex;
    dom.statComparisons.textContent = step.comparisons;

    // --- Traceback stats ---
    if (step.pieces) {
      dom.statCuts.textContent = step.pieces.length;
    }
    if (step.phase === 'complete') {
      const dp = step.dpSnapshot;
      dom.statMaxProfit.textContent = '$' + dp[state.rodLength];
      showChallenges();
    }
  }

  /* ══════════════════════════════════════════════════
     10. FORMULA PANEL
     ══════════════════════════════════════════════════ */
  function renderFormulaPanel (step) {
    if (!step.formula) {
      dom.formulaLive.style.display = 'none';
      dom.formulaIdle.style.display = 'block';
      dom.formulaIdle.innerHTML = '<p>' + (step.phase === 'complete'
        ? 'Algorithm complete. The DP table holds all optimal values.'
        : 'Initialize the algorithm to see<br/>the DP recurrence here.') + '</p>';
      return;
    }

    dom.formulaIdle.style.display = 'none';
    dom.formulaLive.style.display = 'block';

    dom.formulaTarget.textContent = step.formula.target;

    // Rows
    dom.formulaRows.innerHTML = '';
    step.formula.rows.forEach(r => {
      const div = document.createElement('div');
      div.className = 'formula-row';

      let text = 'price[' + r.j + '] + dp[' + r.remLen + '] = ' + r.priceJ + ' + ' + r.dpRem + ' = ' + r.total;

      if (r.isBest) {
        div.classList.add('is-best');
        text += '  ← Best';
      }
      if (step.formula.currentJ === r.j) {
        div.classList.add('is-current');
      }

      div.textContent = text;
      dom.formulaRows.appendChild(div);
    });

    // Result
    if (step.formula.result) {
      dom.formulaResult.textContent = step.formula.result;
    } else {
      dom.formulaResult.textContent = '';
    }
  }

  /* ══════════════════════════════════════════════════
     11. PSEUDOCODE HIGHLIGHT
     ══════════════════════════════════════════════════ */
  function highlightCode (activeLines) {
    qall('.code-line').forEach(el => {
      const lineNum = parseInt(el.dataset.line, 10);
      el.classList.toggle('active', activeLines && activeLines.includes(lineNum));
    });
  }

  /* ══════════════════════════════════════════════════
     12. INPUT VALIDATION
     ══════════════════════════════════════════════════ */
  function readPrices () {
    const prices = [];
    let valid = true;
    for (let i = 0; i < state.rodLength; i++) {
      const el = qid('price-' + i);
      if (!el) { valid = false; break; }

      let raw = el.value.trim();
      el.classList.remove('input-error');

      // Allow empty → treat as 0
      if (raw === '') { raw = '0'; el.value = '0'; }

      const num = Number(raw);

      if (isNaN(num) || !Number.isInteger(num)) {
        el.classList.add('input-error');
        showToast('error', 'Invalid price for length ' + (i + 1) + '. Please enter a whole number.');
        valid = false;
        continue;
      }

      if (num < 0) {
        el.classList.add('input-error');
        showToast('error', 'Price for length ' + (i + 1) + ' cannot be negative.');
        valid = false;
        continue;
      }

      if (num > 999) {
        showToast('warning', 'Price for length ' + (i + 1) + ' is very high ($' + num + '). Are you sure?');
      }

      prices.push(num);
    }
    return { prices, valid };
  }

  /* ══════════════════════════════════════════════════
     13. CONTROL ACTIONS
     ══════════════════════════════════════════════════ */
  function actionInitialize () {
    // Stop any running playback
    stopPlayback();

    // Read + validate
    const { prices, valid } = readPrices();
    if (!valid) return;

    state.prices = prices;
    state.rodLength = parseInt(dom.rodLengthSelect.value, 10);

    // Re-sync prices array length
    while (state.prices.length < state.rodLength) state.prices.push(0);
    state.prices = state.prices.slice(0, state.rodLength);

    // Precompute
    try {
      const result = precomputeSteps();
      state.steps = result.steps;
      state.dp = result.dp;
      state.cut = result.cut;
      state.totalComparisons = result.comparisons;
      state.initialized = true;
      state.completed = false;
      state.currentStepIndex = -1;
    } catch (err) {
      showToast('error', 'Something went wrong initializing the algorithm. Please check your inputs.');
      console.error(err);
      return;
    }

    // Update UI
    dom.totalSteps.textContent = state.steps.length - 1;
    dom.statSteps.textContent = state.steps.length - 1;
    dom.statComparisons.textContent = '0';
    dom.statMaxProfit.textContent = '—';
    dom.statCuts.textContent = '—';

    // Enable controls
    dom.nextBtn.disabled = false;
    dom.playPauseBtn.disabled = false;
    dom.prevBtn.disabled = true; // can't go back from step 0

    // Show first step
    renderStep(0);
    dom.currentStep.textContent = '0';
  }

  function actionStepForward () {
    if (!state.initialized) return;
    const next = state.currentStepIndex + 1;
    if (next >= state.steps.length) {
      stopPlayback();
      dom.nextBtn.disabled = true;
      return;
    }
    renderStep(next);
    dom.prevBtn.disabled = (next <= 0);
    dom.nextBtn.disabled = (next >= state.steps.length - 1);

    if (next >= state.steps.length - 1) {
      stopPlayback();
      state.completed = true;
    }
  }

  function actionStepBackward () {
    if (!state.initialized) return;
    const prev = state.currentStepIndex - 1;
    if (prev < 0) return;
    renderStep(prev);
    dom.prevBtn.disabled = (prev <= 0);
    dom.nextBtn.disabled = false;
  }

  function actionPlayPause () {
    if (!state.initialized) return;
    if (state.completed && state.currentStepIndex >= state.steps.length - 1) {
      // Restart from beginning
      renderStep(0);
      state.completed = false;
      dom.prevBtn.disabled = true;
      dom.nextBtn.disabled = false;
    }
    if (state.playing) {
      stopPlayback();
    } else {
      startPlayback();
    }
  }

  function actionReset () {
    stopPlayback();
    state.initialized = false;
    state.completed = false;
    state.steps = [];
    state.currentStepIndex = -1;

    dom.prevBtn.disabled = true;
    dom.playPauseBtn.disabled = true;
    dom.nextBtn.disabled = true;
    dom.currentStep.textContent = '0';
    dom.totalSteps.textContent = '—';
    dom.statSteps.textContent = '—';
    dom.statComparisons.textContent = '—';
    dom.statMaxProfit.textContent = '—';
    dom.statCuts.textContent = '—';

    // Reset visuals
    renderDPTableRows();
    renderRod(null);
    highlightCode(null);
    dom.formulaIdle.style.display = 'block';
    dom.formulaLive.style.display = 'none';
    dom.formulaIdle.innerHTML = '<p>Initialize the algorithm to see<br/>the DP recurrence here.</p>';
    dom.explanationText.innerHTML = '<p>Press <strong>Initialize</strong> to start the visualization.</p>';
    dom.vizStatus.textContent = 'Waiting for initialization';

    // Hide challenges
    dom.challengeBlock.style.display = 'none';
  }

  /* ══════════════════════════════════════════════════
     14. PLAYBACK (with dynamic speed)
     ══════════════════════════════════════════════════ */
  function getIntervalMs () {
    const sliderVal = parseInt(dom.speedSlider.value, 10);
    return SPEED_MAP[sliderVal - 1] || 480;
  }

  function startPlayback () {
    if (state.playing) return;
    state.playing = true;
    dom.playPauseBtn.classList.add('is-playing');
    scheduleNextStep();
  }

  function scheduleNextStep () {
    if (!state.playing) return;
    state.playInterval = setTimeout(() => {
      if (!state.playing) return;
      actionStepForward();
      if (state.playing && !state.completed) {
        scheduleNextStep(); // re-schedule with current speed
      }
    }, getIntervalMs());
  }

  function stopPlayback () {
    state.playing = false;
    dom.playPauseBtn.classList.remove('is-playing');
    if (state.playInterval) {
      clearTimeout(state.playInterval);
      state.playInterval = null;
    }
  }

  /* ══════════════════════════════════════════════════
     15. PRESET SELECTION
     ══════════════════════════════════════════════════ */
  function applyPreset (presetId) {
    const preset = PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    stopPlayback();
    actionReset();

    state.activePreset = presetId;
    state.rodLength = preset.n;
    state.prices = preset.prices.slice();

    // Update select
    dom.rodLengthSelect.value = preset.n;

    // Rebuild price grid
    buildPriceGrid();

    // Update pills
    qall('.preset-pill').forEach(pill => {
      pill.classList.toggle('active', pill.dataset.presetId === presetId);
    });

    // Show preset description as a subtle toast
    showToast('info', preset.description);
  }

  /* ══════════════════════════════════════════════════
     16. ROD LENGTH CHANGE
     ══════════════════════════════════════════════════ */
  function onRodLengthChange () {
    stopPlayback();
    if (state.initialized) actionReset();

    const newLen = parseInt(dom.rodLengthSelect.value, 10);
    state.rodLength = newLen;

    // Extend or trim prices
    while (state.prices.length < newLen) state.prices.push(0);
    state.prices = state.prices.slice(0, newLen);

    // Deselect any active preset
    state.activePreset = null;
    qall('.preset-pill').forEach(pill => pill.classList.remove('active'));

    buildPriceGrid();
    renderRod(null);
  }

  /* ══════════════════════════════════════════════════
     17. PRICE INPUT CHANGE
     ══════════════════════════════════════════════════ */
  function onPriceChange (e) {
    const idx = parseInt(e.target.dataset.index, 10);
    const val = e.target.value.trim();

    // Live validation feedback
    e.target.classList.remove('input-error');
    const num = Number(val);

    if (val !== '' && (isNaN(num) || !Number.isInteger(num) || num < 0)) {
      e.target.classList.add('input-error');
    }

    // Deselect preset if user manually edits
    if (state.activePreset) {
      state.activePreset = null;
      qall('.preset-pill').forEach(pill => pill.classList.remove('active'));
    }

    // Reset if already initialized
    if (state.initialized) actionReset();
  }

  /* ══════════════════════════════════════════════════
     18. THEME TOGGLE
     ══════════════════════════════════════════════════ */
  function toggleTheme () {
    const body = document.body;
    const isDark = body.classList.contains('theme-dark');
    body.classList.toggle('theme-dark', !isDark);
    body.classList.toggle('theme-light', isDark);
    try { sessionStorage.setItem('rodcut_theme', isDark ? 'light' : 'dark'); } catch(e) {}
  }

  function loadThemePref () {
    try {
      const saved = sessionStorage.getItem('rodcut_theme');
      if (saved === 'dark') {
        document.body.classList.replace('theme-light', 'theme-dark');
      }
    } catch(e) {}
  }

  /* ══════════════════════════════════════════════════
     19. KEYBOARD SHORTCUTS
     ══════════════════════════════════════════════════ */
  function onKeyDown (e) {
    // Don't capture if user is typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
      // Allow Escape to blur
      if (e.key === 'Escape') { e.target.blur(); }
      return;
    }

    switch (e.key) {
      case ' ':
      case 'ArrowRight':
        e.preventDefault();
        actionStepForward();
        break;
      case 'b':
      case 'B':
      case 'ArrowLeft':
        e.preventDefault();
        actionStepBackward();
        break;
      case 'p':
      case 'P':
        e.preventDefault();
        actionPlayPause();
        break;
      case 'r':
      case 'R':
        e.preventDefault();
        actionReset();
        break;
      case 'h':
      case 'H':
        e.preventDefault();
        toggleShortcutsModal();
        break;
      case 't':
      case 'T':
        e.preventDefault();
        toggleTheme();
        break;
      case 'Escape':
        closeShortcutsModal();
        closeTutorial();
        break;
    }
  }

  /* ══════════════════════════════════════════════════
     20. SHORTCUTS MODAL
     ══════════════════════════════════════════════════ */
  function toggleShortcutsModal () {
    const isOpen = dom.shortcutsModal.classList.contains('is-open');
    dom.shortcutsModal.classList.toggle('is-open', !isOpen);
  }

  function closeShortcutsModal () {
    dom.shortcutsModal.classList.remove('is-open');
  }

  /* ══════════════════════════════════════════════════
     21. TUTORIAL SYSTEM
     ══════════════════════════════════════════════════ */
  function startTutorial () {
    state.tutorialDone = false;
    state.tutorialStep = 0;
    dom.tutorialOverlay.classList.add('is-open');
    renderTutorialStep(0);
  }

  function renderTutorialStep (idx) {
    const step = TUTORIAL_STEPS[idx];
    if (!step) return;

    dom.tutorialTitle.textContent = step.title;
    dom.tutorialDesc.textContent = step.desc;
    dom.tutorialStepNum.textContent = idx + 1;
    dom.tutorialStepTotal.textContent = TUTORIAL_STEPS.length;
    dom.tutorialNextBtn.textContent = (idx < TUTORIAL_STEPS.length - 1) ? 'Next →' : 'Got it!';

    // Spotlight
    if (step.target) {
      const el = document.querySelector(step.target);
      if (el) {
        positionSpotlight(el);
        positionTutorialCard(el);
      }
    } else {
      // Center card, no spotlight
      dom.tutorialSpotlight.style.display = 'none';
      centerTutorialCard();
    }
  }

  function positionSpotlight (el) {
    const rect = el.getBoundingClientRect();
    const pad = 8;
    dom.tutorialSpotlight.style.display = 'block';
    dom.tutorialSpotlight.style.left   = (rect.left - pad) + 'px';
    dom.tutorialSpotlight.style.top    = (rect.top - pad) + 'px';
    dom.tutorialSpotlight.style.width  = (rect.width + pad * 2) + 'px';
    dom.tutorialSpotlight.style.height = (rect.height + pad * 2) + 'px';
  }

  function positionTutorialCard (el) {
    const rect = el.getBoundingClientRect();
    const card = dom.tutorialCard;
    const cardH = 200; // approximate

    // Try to place below the target
    let top = rect.bottom + 16;
    if (top + cardH > window.innerHeight) {
      top = rect.top - cardH - 16; // place above
    }
    let left = rect.left;
    if (left + 340 > window.innerWidth) {
      left = window.innerWidth - 360;
    }

    card.style.position = 'absolute';
    card.style.top = top + 'px';
    card.style.left = Math.max(12, left) + 'px';
  }

  function centerTutorialCard () {
    const card = dom.tutorialCard;
    card.style.position = 'fixed';
    card.style.top = '50%';
    card.style.left = '50%';
    card.style.transform = 'translate(-50%, -50%)';
  }

  function advanceTutorial () {
    state.tutorialStep++;
    if (state.tutorialStep >= TUTORIAL_STEPS.length) {
      closeTutorial();
    } else {
      // Reset card positioning style
      dom.tutorialCard.style.transform = '';
      renderTutorialStep(state.tutorialStep);
    }
  }

  function closeTutorial () {
    dom.tutorialOverlay.classList.remove('is-open');
    dom.tutorialSpotlight.style.display = 'none';
    dom.tutorialCard.style.transform = '';
    state.tutorialDone = true;
    try { sessionStorage.setItem('rodcut_tutorial_done', '1'); } catch(e) {}
  }

  /* ══════════════════════════════════════════════════
     22. TOAST NOTIFICATIONS
     ══════════════════════════════════════════════════ */
  function showToast (type, message, duration) {
    duration = duration || 3800;
    const icons = { error: '⚠', warning: '⚡', success: '✓', info: 'ℹ' };

    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;

    const icon = document.createElement('span');
    icon.className = 'toast-icon';
    icon.textContent = icons[type] || 'ℹ';

    const text = document.createElement('span');
    text.className = 'toast-text';
    text.textContent = message;

    toast.appendChild(icon);
    toast.appendChild(text);
    dom.toastContainer.appendChild(toast);

    // Auto-remove
    setTimeout(() => {
      toast.classList.add('toast-exit');
      setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 240);
    }, duration);
  }

  /* ══════════════════════════════════════════════════
     23. PRACTICE CHALLENGES
     ══════════════════════════════════════════════════ */
  function showChallenges () {
    dom.challengeBlock.style.display = 'block';
    dom.challengeList.innerHTML = '';
    CHALLENGES.forEach((q, idx) => {
      const item = document.createElement('div');
      item.className = 'challenge-item';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'challenge-checkbox';
      cb.id = 'challenge-' + idx;
      cb.setAttribute('aria-label', q);

      const label = document.createElement('label');
      label.htmlFor = 'challenge-' + idx;
      label.textContent = q;
      label.style.cursor = 'pointer';

      item.appendChild(cb);
      item.appendChild(label);
      dom.challengeList.appendChild(item);
    });
  }

  /* ══════════════════════════════════════════════════
     24. HELP ICON TOOLTIPS
     ══════════════════════════════════════════════════ */
  function initHelpTooltips () {
    qall('.help-icon[data-tooltip]').forEach(icon => {
      const tip = document.createElement('span');
      tip.className = 'tooltip';
      tip.textContent = icon.dataset.tooltip;
      icon.appendChild(tip);
    });
  }

  /* ══════════════════════════════════════════════════
     25. EVENT BINDING
     ══════════════════════════════════════════════════ */
  function attachEvents () {
    // Init button
    dom.initBtn.addEventListener('click', actionInitialize);

    // Controls
    dom.prevBtn.addEventListener('click', actionStepBackward);
    dom.playPauseBtn.addEventListener('click', actionPlayPause);
    dom.nextBtn.addEventListener('click', actionStepForward);
    dom.resetBtn.addEventListener('click', actionReset);

    // Speed slider — no special handler needed; getIntervalMs() reads live value

    // Rod length
    dom.rodLengthSelect.addEventListener('change', onRodLengthChange);

    // Price inputs (delegated)
    dom.priceGrid.addEventListener('input', (e) => {
      if (e.target.classList.contains('price-input')) onPriceChange(e);
    });

    // Preset pills (delegated)
    dom.presetPills.addEventListener('click', (e) => {
      const pill = e.target.closest('.preset-pill');
      if (pill) applyPreset(pill.dataset.presetId);
    });

    // Theme
    dom.themeToggleBtn.addEventListener('click', toggleTheme);

    // Shortcuts modal
    dom.keyboardHelpBtn.addEventListener('click', toggleShortcutsModal);
    dom.shortcutsCloseBtn.addEventListener('click', closeShortcutsModal);
    dom.shortcutsModal.addEventListener('click', (e) => {
      if (e.target === dom.shortcutsModal) closeShortcutsModal();
    });

    // Tutorial
    dom.tutorialNextBtn.addEventListener('click', advanceTutorial);
    dom.tutorialSkipBtn.addEventListener('click', closeTutorial);
    dom.tutorialOverlay.addEventListener('click', (e) => {
      if (e.target === dom.tutorialOverlay || e.target.classList.contains('tutorial-backdrop')) {
        closeTutorial();
      }
    });

    // Global keyboard
    document.addEventListener('keydown', onKeyDown);

    // Help tooltips
    initHelpTooltips();

    // Window resize — reposition tutorial spotlight if active
    window.addEventListener('resize', () => {
      if (!state.tutorialDone && dom.tutorialOverlay.classList.contains('is-open')) {
        renderTutorialStep(state.tutorialStep);
      }
    });
  }

})();