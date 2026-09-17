type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : {};
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function safeHref(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value, 'https://www.liviubucel.com');
    if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) return null;
    return value;
  } catch {
    return null;
  }
}

function renderText(node: UnknownRecord): string {
  const textData = record(node.textData);
  let html = escapeHtml(typeof textData.text === 'string' ? textData.text : '');
  const decorations = Array.isArray(textData.decorations) ? textData.decorations : [];

  for (const decorationValue of decorations) {
    const decoration = record(decorationValue);
    switch (decoration.type) {
      case 'BOLD':
        html = `<strong>${html}</strong>`;
        break;
      case 'ITALIC':
        html = `<em>${html}</em>`;
        break;
      case 'UNDERLINE':
        html = `<u>${html}</u>`;
        break;
      case 'LINK': {
        const linkData = record(decoration.linkData);
        const link = record(linkData.link);
        const href = safeHref(link.url);
        if (href) {
          const target = link.target === 'BLANK' ? ' target="_blank" rel="noopener noreferrer"' : '';
          html = `<a href="${escapeHtml(href)}"${target}>${html}</a>`;
        }
        break;
      }
      default:
        break;
    }
  }

  return html;
}

function renderChildren(node: UnknownRecord): string {
  const children = Array.isArray(node.nodes) ? node.nodes : [];
  return children.map((child) => renderRicosNode(record(child))).join('');
}

function renderRicosNode(node: UnknownRecord): string {
  switch (node.type) {
    case 'TEXT':
      return renderText(node);
    case 'PARAGRAPH':
      return `<p>${renderChildren(node)}</p>`;
    case 'HEADING': {
      const headingData = record(node.headingData);
      const rawLevel = typeof headingData.level === 'number' ? headingData.level : 2;
      const level = Math.min(6, Math.max(1, Math.trunc(rawLevel)));
      return `<h${level}>${renderChildren(node)}</h${level}>`;
    }
    case 'BULLETED_LIST':
      return `<ul>${renderChildren(node)}</ul>`;
    case 'ORDERED_LIST':
      return `<ol>${renderChildren(node)}</ol>`;
    case 'LIST_ITEM':
      return `<li>${renderChildren(node)}</li>`;
    case 'BLOCKQUOTE':
      return `<blockquote>${renderChildren(node)}</blockquote>`;
    default:
      // Unknown structural nodes are fail-soft: render only their already escaped
      // children. This preserves text without allowing raw HTML from Wix content.
      return renderChildren(node);
  }
}

export function ricosToSafeHtml(richContent: unknown): string {
  const document = record(richContent);
  const nodes = Array.isArray(document.nodes) ? document.nodes : [];
  return nodes.map((node) => renderRicosNode(record(node))).join('');
}
