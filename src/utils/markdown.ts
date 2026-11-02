const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

/** 旧站路径 → Hash 路由 */
const ROUTE_MAP: { pattern: RegExp; build: (m: RegExpMatchArray) => string }[] = [
  { pattern: /^\/results\/person\/([A-Za-z0-9]+)\/?$/, build: (m) => `#/results/person/${m[1]}` },
  { pattern: /^\/results\/competition\/([A-Za-z0-9]+)\/?$/, build: (m) => `#/results/competition/${m[1]}` },
  { pattern: /^\/results\/rankings\/?$/, build: () => '#/results/rankings' },
  { pattern: /^\/results\/records\/?$/, build: () => '#/results/records' },
  { pattern: /^\/results\/statistics\/?$/, build: () => '#/results/statistics' },
  { pattern: /^\/results\/person\/?$/, build: () => '#/results/person' },
  { pattern: /^\/results\/?$/, build: () => '#/results' },
  { pattern: /^\/competition\/([-A-Za-z0-9]+)(?:\/results)?\/?$/, build: (m) => `#/competition/${m[1]}` },
  { pattern: /^\/competition\/?$/, build: () => '#/competition' },
  { pattern: /^\/post\/([-A-Za-z0-9]+)\/?$/, build: (m) => `#/post/${m[1]}` },
  { pattern: /^\/faq(?:\/(\d+))?\/?$/, build: (m) => (m[1] ? `#/faq/${m[1]}` : '#/faq') },
  { pattern: /^\/tools\/luckyDraw\/?$/, build: () => '#/tools/luckyDraw' },
  { pattern: /^\/about\.html\/?$/, build: () => '#/about.html' },
  { pattern: /^\/contact\.html\/?$/, build: () => '#/contact.html' },
  { pattern: /^\/links\.html\/?$/, build: () => '#/links.html' },
  { pattern: /^\/disclaimer\.html\/?$/, build: () => '#/disclaimer.html' },
];

function mapInternalLink(href: string): string {
  if (/^(https?:)?\/\//i.test(href) || href.startsWith('#') || href.startsWith('mailto:')) {
    return href;
  }
  const path = href.startsWith('/') ? href : `/${href}`;
  for (const rule of ROUTE_MAP) {
    const match = path.match(rule.pattern);
    if (match) return rule.build(match);
  }
  return href;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isHtmlContent(text: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(text);
}

/** 是否已包含块级结构（真正需要原样输出的 HTML） */
function hasBlockMarkup(text: string): boolean {
  return /<(p|div|ul|ol|h[1-6]|blockquote|table|section|figure|pre)\b/i.test(text);
}

/**
 * 旧站资讯正文为 HTML，新站 API 返回 Markdown。
 * 这里做最小可用的 Markdown 渲染：链接、加粗、斜体、图片、代码、换行。
 */
export function renderContent(raw: string | null | undefined): string {
  if (!raw) return '';

  const normalizeBreaks = (text: string) =>
    text.replace(/\r\n?/g, '\n').replace(/<br\s*\/?>/gi, '\n');

  if (hasBlockMarkup(raw)) {
    return raw.replace(
      /href=["']([^"']+)["']/gi,
      (_match, href: string) => `href="${escapeHtml(mapInternalLink(href))}"`,
    );
  }

  let html = escapeHtml(normalizeBreaks(raw));

  html = html.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt: string, src: string) => {
    const url = /^(https?:)?\/\//i.test(src) || src.startsWith('data:')
      ? src
      : `${BASE}/f/images/${src.replace(/^\/+/, '')}`;
    return `<img src="${url}" alt="${alt}" />`;
  });

  html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, text: string, href: string) => {
    const target = mapInternalLink(href);
    const external = /^(https?:)?\/\//i.test(target) || target.startsWith('mailto:');
    const attrs = external ? ' target="_blank" rel="noopener"' : '';
    return `<a href="${target}"${attrs}>${text}</a>`;
  });

  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');

  const blocks = html.split(/\n\s*\n/);
  const out: string[] = [];
  for (const block of blocks) {
    const lines = block
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length) continue;

    const heading = /^(#{1,6})\s+(.*)$/.exec(lines[0]!);
    if (heading && lines.length === 1) {
      const level = heading[1]!.length;
      out.push(`<h${level}>${heading[2]}</h${level}>`);
      continue;
    }

    if (lines.every((line) => /^[-*+]\s+/.test(line))) {
      const items = lines.map((line) => `<li>${line.replace(/^[-*+]\s+/, '')}</li>`);
      out.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    if (lines.every((line) => /^\d+[.)]\s+/.test(line))) {
      const items = lines.map((line) => `<li>${line.replace(/^\d+[.)]\s+/, '')}</li>`);
      out.push(`<ol>${items.join('')}</ol>`);
      continue;
    }

    if (/^<(p|div|ul|ol|h[1-6]|blockquote|table|img|section)/i.test(lines[0]!)) {
      out.push(lines.join('\n'));
      continue;
    }

    out.push(lines.map((line) => `<p>${line}</p>`).join('\n'));
  }

  return out.join('\n');
}

/** 纯文本摘要（用于列表页） */
export function renderSummary(raw: string | null | undefined, maxLength = 220): string {
  if (!raw) return '';
  const text = isHtmlContent(raw)
    ? raw.replace(/<[^>]+>/g, ' ')
    : raw
        .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/[*`_#>]/g, '');
  const normalized = text.replace(/\s+/g, ' ').trim();
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength)}…`
    : normalized;
}
