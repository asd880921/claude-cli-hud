#!/usr/bin/env node
/**
 * Claude Code status line.
 * Displays: current directory, git branch, model name,
 * context usage, and (when available) rate limit usage / reset time.
 * Styled with ANSI truecolor + Nerd Font icons (WezTerm-friendly).
 *
 * Nerd Font glyphs in WezTerm; every other terminal falls back to plain text.
 */

const { execSync } = require('child_process');

// A process can't read the terminal's font, so we key off the terminal program:
// Nerd Font glyphs in WezTerm, plain text symbols everywhere else.
const PLAIN = !(
  process.env.TERM_PROGRAM === 'WezTerm' ||
  process.env.WEZTERM_PANE !== undefined
);

// Icons: Nerd Font glyph (rich) vs. monochrome text symbol (PLAIN fallback).
const ic = {
  dir: PLAIN ? '▸' : '',
  branch: PLAIN ? '⑂' : '',
  model: PLAIN ? '◆' : '',
  effort: PLAIN ? '▲' : '',
  ctx: PLAIN ? '▤' : '',
  reset: PLAIN ? '↻ ' : '  ',
};
const SEP_CH = '│';
const BAR = { fill: '▮', empty: '▯' };

// Nerd Font glyphs get two trailing spaces; plain text symbols need only one.
const lead = (icon) => (icon ? (PLAIN ? `${icon} ` : `${icon}  `) : '');

// --- ANSI helpers ---------------------------------------------------------
const ESC = '\x1b[';
const reset = `${ESC}0m`;
const fg = (r, g, b) => `${ESC}38;2;${r};${g};${b}m`;
const bold = `${ESC}1m`;

const c = {
  dir: fg(94, 158, 255),     // blue
  git: fg(176, 132, 235),    // purple
  model: fg(120, 200, 160),  // teal/green
  label: fg(165, 165, 178),  // light gray for labels
  sep: fg(70, 70, 80),       // separator / empty bar
};

// Color a percentage by severity: green -> yellow -> red.
const pctColor = (p) => {
  if (p >= 90) return fg(235, 100, 100);  // red
  if (p >= 70) return fg(235, 185, 95);   // amber
  if (p >= 40) return fg(225, 215, 110);  // yellow
  return fg(135, 200, 130);               // green
};

const paint = (color, text) => `${color}${text}${reset}`;

// Render a small progress bar — filled cells colored by severity.
const makeBar = (p, width = 6) => {
  const filled = Math.max(0, Math.min(width, Math.round((p / 100) * width)));
  const fillStr = BAR.fill.repeat(filled);
  const emptyStr = BAR.empty.repeat(width - filled);
  return `${pctColor(p)}${fillStr}${reset}${c.sep}${emptyStr}${reset}`;
};

// label + bar + percentage in one segment.
const usage = (label, p) =>
  `${paint(c.label, label)} ${makeBar(p)} ${paint(pctColor(p), `${p}%`)}`;

// --- main -----------------------------------------------------------------
let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => (raw += chunk));
process.stdin.on('end', () => {
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.stdout.write('');
    return;
  }

  // Line 1: context (dir / git / model / effort)
  const line1 = [];
  // Line 2: usage (context window / rate limits / reset time)
  const line2 = [];

  // Current directory (folder name only)
  const cwd = input.workspace?.current_dir || input.cwd || process.cwd();
  const dirName = cwd.split(/[\\/]/).filter(Boolean).pop() || cwd;
  line1.push(paint(c.dir, `${bold}${lead(ic.dir)}${dirName}`));

  // Git branch
  try {
    const branch = execSync('git --no-optional-locks rev-parse --abbrev-ref HEAD', {
      cwd,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
    if (branch && branch !== 'HEAD') {
      line1.push(paint(c.git, `${lead(ic.branch)}${branch}`));
    }
  } catch {
    // not a git repo, skip
  }

  // Model name
  if (input.model?.display_name) {
    line1.push(paint(c.model, `${lead(ic.model)}${input.model.display_name}`));
  }

  // Reasoning effort level
  const effort = input.effort?.level;
  if (effort) {
    const effortColors = {
      low: fg(135, 200, 130),    // green
      medium: fg(225, 215, 110), // yellow
      high: fg(235, 185, 95),    // amber
      max: fg(235, 100, 100),    // red
    };
    line1.push(paint(effortColors[effort] || c.label, `${lead(ic.effort)}${effort}`));
  }

  // Context window usage (shown once data is available)
  const used = input.context_window?.used_percentage;
  if (used !== null && used !== undefined) {
    line2.push(usage(`${lead(ic.ctx)}context`, Math.round(used)));
  }

  // Rate limits (only if exposed by Claude Code)
  const fiveHour = input.rate_limits?.five_hour;
  if (fiveHour?.used_percentage !== undefined) {
    line2.push(usage('5h', Math.round(fiveHour.used_percentage)));
  }

  const sevenDay = input.rate_limits?.seven_day;
  if (sevenDay?.used_percentage !== undefined) {
    line2.push(usage('7d', Math.round(sevenDay.used_percentage)));
  }

  // Reset time (prefer the soonest reset among available windows)
  const resets = [fiveHour?.resets_at, sevenDay?.resets_at].filter(
    (t) => typeof t === 'number'
  );
  if (resets.length) {
    const soonest = Math.min(...resets);
    const resetDate = new Date(soonest * 1000);
    const hh = String(resetDate.getHours()).padStart(2, '0');
    const mm = String(resetDate.getMinutes()).padStart(2, '0');
    line2.push(paint(c.label, `${ic.reset}${hh}:${mm}`));
  }

  const separator = ` ${paint(c.sep, SEP_CH)} `;
  const lines = [line1.join(separator)];
  if (line2.length) lines.push(line2.join(separator));
  process.stdout.write(lines.join('\n') + reset);
});
