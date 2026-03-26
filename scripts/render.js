#!/usr/bin/env node
// Usage: bun scripts/render.js ~/no-more-fomo/2026-03-25.md
// Reads markdown digest + template → outputs .html + updates index.html

const fs = require('fs');
const path = require('path');

const mdPath = process.argv[2];
if (!mdPath) {
  console.error('Usage: bun scripts/render.js <path-to-digest.md>');
  process.exit(1);
}

const scriptDir = path.dirname(__filename);
const repoDir = path.dirname(scriptDir);
const templatePath = path.join(repoDir, 'template', 'digest.html');
const indexTemplatePath = path.join(repoDir, 'template', 'index.html');
const outputDir = path.dirname(path.resolve(mdPath));

// --- Helpers ---

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function inlineFmt(text) {
  // Order matters: linkify raw text first (before escaping), then escape the rest, then bold
  // 1. Extract links before escaping (URLs contain & etc.)
  const links = [];
  const withPlaceholders = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
    const idx = links.length;
    links.push(`<a href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a>`);
    return `\x00LINK${idx}\x00`;
  });
  // 2. Escape remaining text
  let result = esc(withPlaceholders);
  // 3. Restore links
  result = result.replace(/\x00LINK(\d+)\x00/g, (_, idx) => links[idx]);
  // 4. Bold
  result = result.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  return result;
}

// Section title zh/en mapping — shared refs to avoid copy-paste drift
const SECTIONS = [
  { zh: '今日要点', en: 'Top Highlights', id: 'highlights' },
  { zh: '模型与发布', en: 'Models & Releases', id: 'models' },
  { zh: '工具与演示', en: 'Tools & Demos', id: 'tools' },
  { zh: 'AI Agents', en: 'AI Agents', id: 'agents' },
  { zh: '实验室动态', en: 'Lab Updates', id: 'labs' },
  { zh: '播客', en: 'Podcasts', id: 'podcasts' },
  { zh: 'HN 讨论', en: 'HN Threads', id: 'hn' },
  { zh: '行业动态', en: 'Industry', id: 'industry' },
  { zh: 'HF 热门论文', en: 'HF Trending Papers', id: 'hf-papers' },
];
const sectionMap = Object.fromEntries(
  SECTIONS.flatMap(s => {
    const entries = [[s.en, s]];
    if (s.zh !== s.en) entries.push([s.zh, s]);
    return entries;
  })
);
// Also match common alternate headings
sectionMap['Podcasts (Last 7 Days)'] = sectionMap['Podcasts'];
sectionMap['播客 (近 7 天)'] = sectionMap['播客'];

function matchSection(heading) {
  // Exact match first
  if (sectionMap[heading]) return sectionMap[heading];
  // Prefix match for arxiv sections
  if (heading.startsWith('arxiv:')) {
    const topic = heading.slice(6).trim();
    const id = 'arxiv-' + topic.toLowerCase().replace(/\s+/g, '-');
    return { zh: heading, en: heading, id };
  }
  // Fuzzy
  for (const [key, val] of Object.entries(sectionMap)) {
    if (heading.includes(key)) return val;
  }
  const id = heading.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return { zh: heading, en: heading, id };
}

// --- Parse Markdown ---

function parseMd(md) {
  const lines = md.split('\n');
  const sections = [];
  let current = null;
  let inBlockquote = false;
  let blockquoteLines = [];

  function flushBlockquote() {
    if (blockquoteLines.length > 0 && current && current.items.length > 0) {
      const lastItem = current.items[current.items.length - 1];
      lastItem.quote = blockquoteLines.join(' ');
      blockquoteLines = [];
    }
    inBlockquote = false;
  }

  for (const line of lines) {
    // H1 title line — skip
    if (line.startsWith('# ')) continue;

    // H2 section header
    if (line.startsWith('## ')) {
      flushBlockquote();
      const heading = line.slice(3).trim();
      current = { heading, items: [], meta: matchSection(heading), isWide: false };
      sections.push(current);
      continue;
    }

    // --- separator (marks wide sections like HF/arxiv)
    if (line.trim() === '---') {
      // Next sections after --- are "wide" in grid view
      // We'll handle this by marking subsequent sections
      if (sections.length > 0) {
        sections[sections.length - 1]._afterSeparator = true;
      }
      continue;
    }

    // Blockquote
    if (line.startsWith('  >') || line.startsWith('> ')) {
      const text = line.replace(/^\s*>\s?/, '');
      blockquoteLines.push(text);
      inBlockquote = true;
      continue;
    }

    if (inBlockquote && line.trim() === '') {
      flushBlockquote();
      continue;
    }

    // List item
    if (line.startsWith('- ') && current) {
      flushBlockquote();
      current.items.push({ raw: line.slice(2) });
      continue;
    }

    // Numbered item (highlights)
    const numMatch = line.match(/^(\d+)\.\s+(.+)/);
    if (numMatch && current) {
      flushBlockquote();
      current.items.push({ raw: numMatch[2], numbered: true });
      continue;
    }

    // Sources/Total line
    if (line.startsWith('Sources:') || line.startsWith('Total:')) {
      if (!sections._footer) sections._footer = '';
      sections._footer = (sections._footer || '') + line + '\n';
    }
  }
  flushBlockquote();

  // Mark sections after --- as wide
  let afterSep = false;
  for (const s of sections) {
    if (afterSep) s.isWide = true;
    if (s._afterSeparator) afterSep = true;
  }

  return sections;
}

// --- Render HTML fragments ---

function renderItem(item) {
  const raw = item.raw;
  let html = `<div class="item">`;

  // Parse: **Title** — description | links | @source | NL
  const titleMatch = raw.match(/^\*\*([^*]+)\*\*\s*[—–-]\s*(.*)/);
  if (titleMatch) {
    html += `<div class="item-title">${esc(titleMatch[1])}</div>`;
    const rest = titleMatch[2];
    // Split by | for meta parts
    const parts = rest.split('|').map(p => p.trim());
    const desc = parts[0] || '';
    html += `<div class="item-desc">${inlineFmt(desc)}</div>`;
    if (parts.length > 1) {
      const metaParts = parts.slice(1).map(p => {
        // @handle → badge
        if (p.match(/^@\w+/)) return `<span class="badge badge-source">${esc(p)}</span>`;
        // HN Npts → green badge
        if (p.match(/HN \d+/)) return `<span class="badge badge-green">${esc(p)}</span>`;
        // [link](url) → link
        if (p.match(/\[.*\]\(.*\)/)) return `<span class="item-links">${inlineFmt(p)}</span>`;
        return esc(p);
      });
      html += `<div class="item-meta">${metaParts.join(' ')}</div>`;
    }
  } else {
    // Simple format: **Title** rest
    const simpleMatch = raw.match(/^\*\*([^*]+)\*\*\s*(.*)/);
    if (simpleMatch) {
      html += `<div class="item-title">${esc(simpleMatch[1])}</div>`;
      if (simpleMatch[2]) html += `<div class="item-desc">${inlineFmt(simpleMatch[2])}</div>`;
    } else {
      html += `<div class="item-desc">${inlineFmt(raw)}</div>`;
    }
  }

  // Blockquote (podcast summary or HN context)
  if (item.quote) {
    html += `<div class="podcast-summary"><div class="tldr">${inlineFmt(item.quote)}</div></div>`;
  }

  html += `</div>`;
  return html;
}

function renderHighlights(section) {
  let html = `<div class="highlights-title" data-zh="今日要点" data-en="Today's Highlights">今日要点</div>`;
  html += `<ol>`;
  for (const item of section.items) {
    html += `<li>${inlineFmt(item.raw)}</li>`;
  }
  html += `</ol>`;
  return html;
}

function renderSection(section) {
  const { meta, isWide } = section;
  const wideClass = isWide ? ' wide' : '';
  let html = `<div class="section${wideClass}" id="${meta.id}">`;
  html += `<div class="section-header" data-zh="${esc(meta.zh)}" data-en="${esc(meta.en)}">${esc(meta.zh)} <span class="section-count">${section.items.length}</span></div>`;

  if (section.items.length === 0) {
    html += `<div class="item-empty" data-zh="暂无内容" data-en="No items">暂无内容</div>`;
  } else {
    for (const item of section.items) {
      html += renderItem(item);
    }
  }

  html += `</div>`;
  return html;
}

function renderSidebarNav(sections) {
  return sections
    .filter(s => s.meta.id !== 'highlights')
    .map(s => `<a href="#${s.meta.id}" data-zh="${esc(s.meta.zh)}(${s.items.length})" data-en="${esc(s.meta.en)}(${s.items.length})">${esc(s.meta.zh)}(${s.items.length})</a>`)
    .join('\n      ');
}

// --- Main ---

const md = fs.readFileSync(path.resolve(mdPath), 'utf-8');
const template = fs.readFileSync(templatePath, 'utf-8');

const dateMatch = path.basename(mdPath).match(/(\d{4}-\d{2}-\d{2})/);
const date = dateMatch ? dateMatch[1] : 'unknown';
const isZh = path.basename(mdPath).includes('-zh');

// Compute all available dates for date nav
const allDates = fs.readdirSync(outputDir)
  .filter(f => /^\d{4}-\d{2}-\d{2}\.html$/.test(f))
  .map(f => f.replace('.html', ''))
  .sort();
const currentIdx = allDates.indexOf(date);
const prevDate = currentIdx > 0 ? allDates[currentIdx - 1] : null;
const nextDate = currentIdx < allDates.length - 1 ? allDates[currentIdx + 1] : null;

const sections = parseMd(md);
const highlightsSection = sections.find(s => s.meta.id === 'highlights');
const contentSections = sections.filter(s => s.meta.id !== 'highlights');

// Extract footer from raw md (support both EN and ZH)
const footerMatch = md.match(/^((?:Sources|来源):.+)$/m);
const totalMatch = md.match(/^((?:Total|总计):.+)$/m);
const footerText = [footerMatch?.[1], totalMatch?.[1]].filter(Boolean).join(' | ');

// Meta for header: just total items count, keep it short
const totalItems = totalMatch ? totalMatch[1] : '';
const metaText = totalItems;

// Build date nav HTML
function buildDateNav() {
  const dateUrl = d => `./${d}${isZh ? '-zh' : ''}.html`;
  const prevLink = prevDate
    ? `<a href="${dateUrl(prevDate)}" class="date-nav-btn">← ${prevDate}</a>`
    : `<span class="date-nav-btn disabled">← </span>`;
  const nextLink = nextDate
    ? `<a href="${dateUrl(nextDate)}" class="date-nav-btn">${nextDate} →</a>`
    : `<span class="date-nav-btn disabled"> →</span>`;

  const dateBtns = allDates.map(d => {
    const cls = d === date ? 'date-chip active' : 'date-chip';
    return `<a href="${dateUrl(d)}" class="${cls}">${d.slice(5)}</a>`; // MM-DD
  }).join('');

  return `${prevLink}<div class="date-chips">${dateBtns}</div>${nextLink}`;
}

const html = template
  .replace(/\{\{DIGEST_DATE\}\}/g, date)
  .replace(/\{\{DIGEST_LANG\}\}/g, isZh ? 'zh' : 'en')
  .replace(/\{\{DIGEST_META\}\}/g, esc(metaText))
  .replace('{{DIGEST_HIGHLIGHTS}}', highlightsSection ? renderHighlights(highlightsSection) : '')
  .replace('{{DIGEST_SIDEBAR_NAV}}', renderSidebarNav(contentSections))
  .replace('{{DIGEST_SECTIONS}}', contentSections.map(renderSection).join('\n'))
  .replace('{{DIGEST_FOOTER}}', `<span class="footer-text">${esc(footerText)}</span>`)
  .replace('{{DIGEST_DATE_NAV}}', buildDateNav());

const htmlPath = path.resolve(mdPath.replace(/\.md$/, '.html'));
fs.writeFileSync(htmlPath, html);
console.log(`Written: ${htmlPath}`);

// --- Update index.html ---

if (fs.existsSync(indexTemplatePath)) {
  const files = [...allDates].reverse();

  const entries = files.map((d, i) => {
    const latestClass = i === 0 ? ' latest' : '';
    // Try to read first highlight from corresponding .md
    let highlight = '';
    let itemCount = '';
    const correspondingMd = path.join(outputDir, d + '.md');
    if (fs.existsSync(correspondingMd)) {
      const content = fs.readFileSync(correspondingMd, 'utf-8');
      const hlMatch = content.match(/^1\.\s+\*\*([^*]+)\*\*/m);
      if (hlMatch) highlight = hlMatch[1];
      const srcMatch = content.match(/^Total:\s*(.+)$/m);
      if (srcMatch) itemCount = srcMatch[1];
    }
    return `<a href="./${d}.html" class="date-card${latestClass}">
      <div class="date-card-date">${d}</div>
      <div class="date-card-meta">${esc(itemCount)}</div>
      <div class="date-card-highlight">${esc(highlight)}</div>
    </a>`;
  }).join('\n    ');

  const indexTemplate = fs.readFileSync(indexTemplatePath, 'utf-8');
  const indexHtml = indexTemplate.replace('{{INDEX_ENTRIES}}', entries);
  const indexPath = path.join(outputDir, 'index.html');
  fs.writeFileSync(indexPath, indexHtml);
  console.log(`Written: ${indexPath}`);
}
