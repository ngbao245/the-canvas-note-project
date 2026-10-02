/**
 * Helper cho CardClipper feature (Milanote parity) — tách paragraph khỏi Note
 * body HTML thành note mới trên canvas.
 *
 * Body Note = chuỗi HTML Tiptap, gồm top-level block children (p, h1, h2, ul,
 * ol, blockquote, ...). Paragraph index = vị trí trong `template.content.children`.
 * Dùng DOMParser template để parse an toàn, không touch document chính.
 */

function parseBodyChildren(html: string): { fragment: DocumentFragment; children: Element[] } {
  const template = document.createElement('template');
  template.innerHTML = html;
  return { fragment: template.content, children: Array.from(template.content.children) };
}

/** Đếm số top-level block trong body. Dùng để guard index out-of-range. */
export function countParagraphs(html: string): number {
  return parseBodyChildren(html).children.length;
}

/** Extract paragraph HTML tại index N. Null nếu out-of-range. */
export function extractParagraphHtml(html: string, index: number): string | null {
  const { children } = parseBodyChildren(html);
  return children[index]?.outerHTML ?? null;
}

/**
 * Remove paragraph tại index → HTML còn lại. Nếu xoá xong body rỗng → trả về
 * '<p></p>' để Note vẫn có 1 paragraph editable (không bao giờ body === '').
 */
export function removeParagraphAt(html: string, index: number): string {
  const { fragment, children } = parseBodyChildren(html);
  if (index < 0 || index >= children.length) return html;
  children[index].remove();
  const container = document.createElement('div');
  container.appendChild(fragment);
  const result = container.innerHTML.trim();
  return result || '<p></p>';
}
