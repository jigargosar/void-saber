const fs = require('fs');

const INPUT = 'docs/conversation-dump/ecs-conversation-summary.md';
const OUTPUT = 'docs/conversation-dump/ecs-review.html';

// Agent annotations: line ranges with status and reason
const annotations = [
  // Chunk 1 KEPT
  { start: 1, end: 9, status: 'kept', note: 'Decision: ECS chosen for Beat Saber architecture' },
  { start: 19, end: 141, status: 'kept', note: 'Initial ECS code sketch with components, systems, pipeline' },
  { start: 150, end: 213, status: 'kept', note: 'TypeScript + ECS type safety tension identified' },
  { start: 244, end: 298, status: 'kept', note: 'User challenges TS skepticism with bjs-ecs example' },
  { start: 304, end: 455, status: 'kept', note: '10-round devil\'s advocate analysis of ECS' },
  { start: 458, end: 461, status: 'kept', note: 'User demands creative solutions' },
  { start: 517, end: 643, status: 'kept', note: 'Six solutions to ECS+TypeScript problems' },
  { start: 649, end: 761, status: 'kept', note: 'XR input saber attachment demo in ECS' },

  // Chunk 1 DISCARDED
  { start: 15, end: 16, status: 'discarded', note: 'User asking for demo code — just a prompt' },
  { start: 144, end: 146, status: 'discarded', note: 'User asking about TypeScript impact — just a prompt' },
  { start: 176, end: 178, status: 'discarded', note: 'User pushback prompt — insight is in the response' },
  { start: 182, end: 195, status: 'discarded', note: 'Thinking block — duplicated in response' },
  { start: 217, end: 219, status: 'discarded', note: 'User question about query pattern — just a prompt' },
  { start: 308, end: 382, status: 'discarded', note: 'Extended thinking block — all 10 rounds appear in response' },
  { start: 464, end: 513, status: 'discarded', note: 'Thinking block — duplicated in response' },
  { start: 653, end: 675, status: 'discarded', note: 'Thinking block for XR demo — duplicated in response' },
  { start: 770, end: 804, status: 'discarded', note: 'Thinking block for event handling — duplicated in response' },

  // Chunk 2 KEPT
  { start: 806, end: 948, status: 'kept', note: 'Three ECS event-handling approaches' },
  { start: 952, end: 962, status: 'kept', note: 'Decision: Approach 1+2, skip typed channels' },
  { start: 966, end: 986, status: 'kept', note: 'User directs to install and study miniplex/statery' },
  { start: 990, end: 1066, status: 'kept', note: 'Miniplex architecture findings' },
  { start: 1081, end: 1457, status: 'kept', note: 'Flecs entity relationships article analyzed' },
  { start: 1460, end: 1534, status: 'kept', note: 'Can reactive state provide Flecs-like features?' },
  { start: 1537, end: 1616, status: 'kept', note: 'MobX ecosystem as concept source' },

  // Chunk 2 DISCARDED
  { start: 896, end: 927, status: 'discarded', note: 'Code examples — elaboration of concepts already captured' },
  { start: 931, end: 948, status: 'discarded', note: 'ASCII comparison table — same info as prose' },
  { start: 972, end: 976, status: 'discarded', note: 'User interrupt / tool coordination' },
  { start: 978, end: 986, status: 'discarded', note: 'Network calls logistics — no architectural content' },
  { start: 1069, end: 1078, status: 'discarded', note: 'IDs can be functions — FYI remark with no follow-up' },
  { start: 1081, end: 1405, status: 'discarded', note: 'Full Flecs article paste — external reference, insights captured in analysis' },
  { start: 1407, end: 1425, status: 'discarded', note: 'Thinking block — duplicated in response' },
  { start: 1466, end: 1492, status: 'discarded', note: 'Thinking block — duplicated in response' },
  { start: 1543, end: 1559, status: 'discarded', note: 'Thinking block — duplicated in response' },

  // Chunk 3 KEPT
  { start: 1617, end: 1647, status: 'kept', note: 'Architecture composition table — 7-concern mapping' },
  { start: 1651, end: 1653, status: 'kept', note: 'User challenges overlapping solutions' },
  { start: 1657, end: 1715, status: 'kept', note: 'Assistant admits overcomplexity — reactivity overkill for game loops' },
  { start: 1719, end: 1743, status: 'kept', note: 'User pushback on overcorrection' },
  { start: 1747, end: 1773, status: 'kept', note: 'Assistant acknowledges overcorrection with concrete examples' },
  { start: 1777, end: 1779, status: 'kept', note: 'User asks for proof on MobX relationship cleanup' },
  { start: 1783, end: 1820, status: 'kept', note: 'Pivot: MobX does NOT handle relationship cleanup natively' },
  { start: 1824, end: 1853, status: 'kept', note: 'Decision: Custom relationship layer on library foundations' },
  { start: 1857, end: 1860, status: 'kept', note: 'User shares mobx-utils for review' },
  { start: 2439, end: 2615, status: 'kept', note: 'createTransformer pattern documented in detail' },

  // Chunk 3 DISCARDED
  { start: 1860, end: 1879, status: 'discarded', note: 'mobx-utils README header/badges/install — no architectural content' },
  { start: 1880, end: 1949, status: 'discarded', note: 'mobx-utils table of contents — navigation index' },
  { start: 1950, end: 2056, status: 'discarded', note: 'fromPromise API docs — not relevant to ECS' },
  { start: 2057, end: 2065, status: 'discarded', note: 'isPromiseBasedObservable — trivial utility' },
  { start: 2067, end: 2086, status: 'discarded', note: 'moveItem — trivial array utility' },
  { start: 2087, end: 2119, status: 'discarded', note: 'lazyObservable — no game architecture relevance' },
  { start: 2121, end: 2182, status: 'discarded', note: 'fromResource — not directly relevant to ECS' },
  { start: 2184, end: 2209, status: 'discarded', note: 'toStream — RxJS interop, not part of chosen architecture' },
  { start: 2211, end: 2263, status: 'discarded', note: 'createViewModel — form editing pattern, no game relevance' },
  { start: 2265, end: 2309, status: 'discarded', note: 'keepAlive — minor utility, no architectural decision' },
  { start: 2311, end: 2365, status: 'discarded', note: 'queueProcessor/chunkProcessor — batching, not discussed for game use' },
  { start: 2368, end: 2409, status: 'discarded', note: 'now/resetNowInternalState — game has its own frame clock' },
  { start: 2411, end: 2437, status: 'discarded', note: 'expr — minor optimization utility' },
  { start: 2454, end: 2479, status: 'discarded', note: 'deepObserve — no decision made' },
  { start: 2481, end: 2542, status: 'discarded', note: 'ObservableGroupMap/defineProperty — no decision context' },
  { start: 2544, end: 2582, status: 'discarded', note: 'computedFn — no decision context' },
  { start: 2584, end: 2587, status: 'discarded', note: 'DeepMapEntry/DeepMap — internal utilities' },
  { start: 2617, end: 2780, status: 'discarded', note: 'createTransformer examples — reference material, insights already captured' },

  // Chunk 4 KEPT
  { start: 2782, end: 2827, status: 'kept', note: 'createTransformer as the entity-to-visual bridge' },
  { start: 2806, end: 2863, status: 'kept', note: 'Three mobx-utils patterns for architecture' },
  { start: 2857, end: 2863, status: 'kept', note: 'Final library stack confirmed: 2 libraries' },
  { start: 2867, end: 2963, status: 'kept', note: 'Signals/atoms same concept as MobX — redundant' },
  { start: 2966, end: 3161, status: 'kept', note: 'Documentation plan for reactive-ecs.md' },
  { start: 3133, end: 3136, status: 'kept', note: 'Four documented pivots in architectural thinking' },
  { start: 3147, end: 3151, status: 'kept', note: 'Open questions listed as unverified' },
  { start: 3181, end: 3246, status: 'kept', note: 'Test strategy: plain Node.js assert scripts' },

  // Chunk 4 DISCARDED
  { start: 2783, end: 2802, status: 'discarded', note: 'Thinking block — duplicated in response' },
  { start: 2873, end: 2887, status: 'discarded', note: 'Thinking block — preliminary musing' },
  { start: 2903, end: 2930, status: 'discarded', note: 'Thinking block — duplicated in response' },
  { start: 2972, end: 2993, status: 'discarded', note: 'Thinking block — superseded by response' },
  { start: 3025, end: 3093, status: 'discarded', note: 'Thinking block — content in response' },
  { start: 3185, end: 3218, status: 'discarded', note: 'Thinking block — implementation planning, not architectural' },
  { start: 3222, end: 3224, status: 'discarded', note: 'User interruption marker' },
  { start: 3240, end: 3242, status: 'discarded', note: 'pnpm ls confirmation — trivial' },

  // Chunk 5 KEPT
  { start: 3247, end: 3270, status: 'kept', note: 'Discovery: queueProcessor is single-consumer' },
  { start: 3274, end: 3311, status: 'kept', note: 'Test files moved to docs/architecture/tests/' },
  { start: 3314, end: 3347, status: 'kept', note: 'queueProcessor workaround: fan-out pattern' },
  { start: 3350, end: 3363, status: 'kept', note: 'Testing reveals details discussion misses' },
  { start: 3485, end: 3495, status: 'kept', note: 'Four unverified integration items' },
  { start: 3504, end: 3548, status: 'kept', note: 'MobX proxy identity bug discovered and fixed' },
  { start: 3558, end: 3576, status: 'kept', note: 'All integration claims verified' },
  { start: 3579, end: 3588, status: 'kept', note: 'Onboarding doc created with gotcha focus' },
  { start: 3593, end: 3669, status: 'kept', note: 'ADR-001 re-evaluation in ECS context' },
  { start: 3673, end: 3756, status: 'kept', note: 'Unauthorized implementation without approval — violation caught' },
  { start: 3780, end: 3989, status: 'kept', note: 'Session continuation context — full state summary' },
  { start: 3991, end: 4027, status: 'kept', note: 'Clean state confirmed; pending items' },
  { start: 4030, end: 4070, status: 'kept', note: 'Architecture doc audit — gaps identified' },

  // Chunk 5 DISCARDED
  { start: 3256, end: 3266, status: 'discarded', note: 'ASCII test results table — just formatting' },
  { start: 3282, end: 3289, status: 'discarded', note: 'Mechanical file move plan' },
  { start: 3372, end: 3381, status: 'discarded', note: 'Restatement — no new content' },
  { start: 3384, end: 3434, status: 'discarded', note: 'Step-by-step tool execution — mechanical, no insight' },
  { start: 3438, end: 3448, status: 'discarded', note: 'Commit exchange — git workflow, no architecture' },
  { start: 3452, end: 3476, status: 'discarded', note: 'User interrupt — no content resulted' },
  { start: 3636, end: 3649, status: 'discarded', note: 'Code snippet — illustrative, point already captured' },
  { start: 3679, end: 3700, status: 'discarded', note: 'Line-by-line file count — mechanical assessment' },
  { start: 3703, end: 3706, status: 'discarded', note: 'User interrupt mid-execution' },
  { start: 3715, end: 3727, status: 'discarded', note: 'Status report — recap of unauthorized changes' },
  { start: 3764, end: 3778, status: 'discarded', note: 'Git restore commands — mechanical' },
  { start: 3830, end: 3833, status: 'discarded', note: 'Commit hashes — reference data' },
  { start: 3896, end: 3970, status: 'discarded', note: 'Raw transcript index — no new content' },
  { start: 3997, end: 4008, status: 'discarded', note: 'Thinking block — internal reasoning' },
];

function main() {
  const raw = fs.readFileSync(INPUT, 'utf8');
  const allLines = raw.split('\n');
  const totalLines = allLines.length;

  // Parse into sections split by ---
  const sections = [];
  let currentStart = 1;
  let currentLines = [];

  for (let i = 0; i < allLines.length; i++) {
    const lineNum = i + 1;
    const line = allLines[i];

    if (line.trim() === '---' && currentLines.length > 0) {
      sections.push({
        startLine: currentStart,
        endLine: lineNum - 1,
        lines: currentLines
      });
      currentLines = [];
      currentStart = lineNum + 1;
    } else if (line.trim() !== '---') {
      if (currentLines.length === 0) currentStart = lineNum;
      currentLines.push({ num: lineNum, text: line });
    }
  }
  if (currentLines.length > 0) {
    sections.push({
      startLine: currentStart,
      endLine: totalLines,
      lines: currentLines
    });
  }

  // Determine role and preview for each section
  for (const sec of sections) {
    const firstNonEmpty = sec.lines.find(l => l.text.trim() !== '');
    const text = firstNonEmpty ? firstNonEmpty.text : '';

    if (text.startsWith('**User:**')) {
      sec.role = 'user';
    } else if (text.startsWith('**Assistant:**')) {
      sec.role = 'assistant';
    } else if (text.includes('<summary>Thinking</summary>')) {
      sec.role = 'thinking';
    } else {
      sec.role = 'unknown';
    }

    // Preview: first meaningful text content
    const contentLines = sec.lines
      .map(l => l.text)
      .filter(t => !t.startsWith('**User:**') && !t.startsWith('**Assistant:**') && !t.includes('<summary>') && !t.includes('<details>') && !t.includes('</details>') && t.trim() !== '');
    sec.preview = (contentLines[0] || '').substring(0, 100);
  }

  // Match sections to annotations
  for (const sec of sections) {
    const midpoint = Math.floor((sec.startLine + sec.endLine) / 2);
    // Find best matching annotation (most overlap)
    let bestMatch = null;
    let bestOverlap = 0;

    for (const ann of annotations) {
      const overlapStart = Math.max(sec.startLine, ann.start);
      const overlapEnd = Math.min(sec.endLine, ann.end);
      const overlap = overlapEnd - overlapStart;

      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        bestMatch = ann;
      }
    }

    if (bestMatch && bestOverlap > 0) {
      sec.status = bestMatch.status;
      sec.annotation = bestMatch.note;
    } else {
      sec.status = 'unreviewed';
      sec.annotation = 'Not covered by any agent';
    }
  }

  // Generate HTML
  const sectionsHtml = sections.map((sec, idx) => {
    const statusClass = sec.status;
    const statusLabel = sec.status.toUpperCase();
    const roleLabel = sec.role.charAt(0).toUpperCase() + sec.role.slice(1);
    const lineRange = `L${sec.startLine}-L${sec.endLine}`;
    const lineCount = sec.endLine - sec.startLine + 1;

    const contentHtml = sec.lines
      .map(l => `<span class="ln">${String(l.num).padStart(4)}</span> ${escapeHtml(l.text)}`)
      .join('\n');

    return `<div class="section ${statusClass}" data-status="${sec.status}" data-role="${sec.role}">
  <div class="header" onclick="toggle(this)">
    <span class="badge ${statusClass}">${statusLabel}</span>
    <span class="role-badge ${sec.role}">${roleLabel}</span>
    <span class="line-range">[${lineRange}]</span>
    <span class="line-count">(${lineCount} lines)</span>
    <span class="preview">${escapeHtml(sec.preview)}</span>
    <button class="copy-btn" onclick="event.stopPropagation(); copyRange('${lineRange}')" title="Copy line range">Copy</button>
    <span class="arrow">+</span>
  </div>
  <div class="annotation">${escapeHtml(sec.annotation)}</div>
  <pre class="content" style="display:none">${contentHtml}</pre>
</div>`;
  }).join('\n');

  const stats = {
    kept: sections.filter(s => s.status === 'kept').length,
    discarded: sections.filter(s => s.status === 'discarded').length,
    unreviewed: sections.filter(s => s.status === 'unreviewed').length,
    total: sections.length
  };

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ECS Conversation Review</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: #1a1a1a; color: #ccc; font-family: monospace; font-size: 13px; }
.toolbar {
  position: sticky; top: 0; z-index: 100;
  background: #111; border-bottom: 1px solid #333;
  padding: 10px 16px; display: flex; gap: 8px; flex-wrap: wrap; align-items: center;
}
.toolbar button {
  background: #333; color: #ccc; border: 1px solid #555; padding: 4px 10px;
  border-radius: 4px; cursor: pointer; font-family: monospace; font-size: 12px;
}
.toolbar button:hover { background: #444; }
.toolbar button.active { background: #555; border-color: #888; }
.stats { margin-left: auto; font-size: 11px; color: #888; }
.stats .kept-c { color: #4a4; }
.stats .discarded-c { color: #a44; }
.stats .unreviewed-c { color: #888; }
#container { padding: 8px 16px; }
.section { margin-bottom: 2px; border: 1px solid #2a2a2a; border-radius: 4px; }
.section.kept { border-left: 3px solid #4a4; }
.section.discarded { border-left: 3px solid #a44; }
.section.unreviewed { border-left: 3px solid #666; }
.section.hidden { display: none; }
.header {
  padding: 6px 10px; cursor: pointer; display: flex; align-items: center; gap: 8px;
  background: #222; border-radius: 4px;
}
.header:hover { background: #2a2a2a; }
.badge {
  font-size: 10px; padding: 1px 6px; border-radius: 3px; font-weight: bold;
}
.badge.kept { background: #1a3a1a; color: #4c4; }
.badge.discarded { background: #3a1a1a; color: #c44; }
.badge.unreviewed { background: #2a2a2a; color: #888; }
.role-badge {
  font-size: 10px; padding: 1px 6px; border-radius: 3px;
}
.role-badge.user { background: #1a2a3a; color: #4ac; }
.role-badge.assistant { background: #2a1a3a; color: #a4c; }
.role-badge.thinking { background: #3a2a1a; color: #ca4; }
.role-badge.unknown { background: #2a2a2a; color: #888; }
.line-range { color: #888; font-size: 11px; }
.line-count { color: #555; font-size: 11px; }
.preview { color: #999; font-size: 11px; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.copy-btn {
  background: #333; color: #aaa; border: 1px solid #555; padding: 1px 6px;
  border-radius: 3px; cursor: pointer; font-size: 10px; font-family: monospace;
}
.copy-btn:hover { background: #444; }
.arrow { color: #666; font-size: 14px; min-width: 14px; text-align: center; }
.annotation { padding: 2px 10px 4px 16px; font-size: 11px; color: #888; font-style: italic; }
.content {
  padding: 8px 10px; background: #181818; border-top: 1px solid #2a2a2a;
  overflow-x: auto; line-height: 1.5; white-space: pre-wrap; word-wrap: break-word;
}
.ln { color: #555; user-select: none; }
.toast {
  position: fixed; bottom: 20px; right: 20px; background: #333; color: #ccc;
  padding: 6px 14px; border-radius: 4px; font-size: 12px; opacity: 0;
  transition: opacity 0.3s;
}
.toast.show { opacity: 1; }
</style>
</head>
<body>
<div class="toolbar">
  <button onclick="expandAll()">Expand All</button>
  <button onclick="collapseAll()">Collapse All</button>
  <button onclick="filterBy('all')" class="active" data-filter="all">All</button>
  <button onclick="filterBy('kept')" data-filter="kept">Kept</button>
  <button onclick="filterBy('discarded')" data-filter="discarded">Discarded</button>
  <button onclick="filterBy('unreviewed')" data-filter="unreviewed">Unreviewed</button>
  <div class="stats">
    <span class="kept-c">${stats.kept} kept</span> /
    <span class="discarded-c">${stats.discarded} discarded</span> /
    <span class="unreviewed-c">${stats.unreviewed} unreviewed</span> /
    ${stats.total} total
  </div>
</div>
<div id="container">
${sectionsHtml}
</div>
<div class="toast" id="toast">Copied!</div>
<script>
function toggle(header) {
  const content = header.parentElement.querySelector('.content');
  const arrow = header.querySelector('.arrow');
  if (content.style.display === 'none') {
    content.style.display = 'block';
    arrow.textContent = '-';
  } else {
    content.style.display = 'none';
    arrow.textContent = '+';
  }
}

function expandAll() {
  document.querySelectorAll('.section:not(.hidden) .content').forEach(c => c.style.display = 'block');
  document.querySelectorAll('.section:not(.hidden) .arrow').forEach(a => a.textContent = '-');
}

function collapseAll() {
  document.querySelectorAll('.content').forEach(c => c.style.display = 'none');
  document.querySelectorAll('.arrow').forEach(a => a.textContent = '+');
}

function filterBy(status) {
  document.querySelectorAll('.toolbar button[data-filter]').forEach(b => b.classList.remove('active'));
  document.querySelector('.toolbar button[data-filter="' + status + '"]').classList.add('active');

  document.querySelectorAll('.section').forEach(sec => {
    if (status === 'all' || sec.dataset.status === status) {
      sec.classList.remove('hidden');
    } else {
      sec.classList.add('hidden');
    }
  });
}

function copyRange(range) {
  navigator.clipboard.writeText(range).then(() => {
    const toast = document.getElementById('toast');
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 1500);
  });
}
</script>
</body>
</html>`;

  fs.writeFileSync(OUTPUT, html, 'utf8');
  console.log(`Written ${sections.length} sections to ${OUTPUT} (${(Buffer.byteLength(html) / 1024).toFixed(1)} KB)`);
  console.log(`  Kept: ${stats.kept}, Discarded: ${stats.discarded}, Unreviewed: ${stats.unreviewed}`);
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

main();
