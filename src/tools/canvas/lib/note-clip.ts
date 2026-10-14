import { BLOCK_KEY_ATTR, findBlockIndex, type BlockTarget } from './note-block-keys';

/**
 * Helper cho CardClipper feature (Milanote parity) — tách 1 khối khỏi Note
 * body HTML thành note mới trên canvas.
 *
 * Body Note = chuỗi HTML Tiptap, gồm top-level block children (p, h1, h2, ul,
 * ol, blockquote, ...). Khối tìm theo mã `data-key` (spec canvas-note-block-keys),
 * note cũ chưa có mã thì theo vị trí.
 * Dùng template để parse, không touch document chính.
 */

function parseBodyChildren(html: string): { fragment: DocumentFragment; children: Element[] } {
  const template = document.createElement('template');
  template.innerHTML = html;
  return { fragment: template.content, children: Array.from(template.content.children) };
}

function resolveBlock(children: Element[], target: BlockTarget): Element | null {
  const i = findBlockIndex(
    children.map((c) => c.getAttribute(BLOCK_KEY_ATTR)),
    target,
  );
  return i >= 0 ? children[i] : null;
}

/** HTML của khối cần tách. Null nếu không tìm thấy (đã bị xoá / ngoài phạm vi). */
export function extractBlockHtml(html: string, target: BlockTarget): string | null {
  return resolveBlock(parseBodyChildren(html).children, target)?.outerHTML ?? null;
}

/**
 * Xoá khối → HTML còn lại. Không tìm thấy → trả nguyên. Xoá xong body rỗng → trả
 * '<p></p>' để Note vẫn có 1 paragraph editable (không bao giờ body === '').
 */
export function removeBlock(html: string, target: BlockTarget): string {
  const { fragment, children } = parseBodyChildren(html);
  const block = resolveBlock(children, target);
  if (!block) return html;
  block.remove();
  const container = document.createElement('div');
  container.appendChild(fragment);
  const result = container.innerHTML.trim();
  return result || '<p></p>';
}
