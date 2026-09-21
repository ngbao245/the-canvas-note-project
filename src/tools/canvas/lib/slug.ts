/**
 * Slug URL cho Board: lowercase, thay khoảng trắng và ký tự đặc biệt bằng dash,
 * bỏ dash đầu/cuối, giới hạn 40 ký tự.
 *
 * Chỉ để URL đọc được ("/canvas/{id}/my-board"). Nguồn chuẩn vẫn là boardId —
 * slug KHÔNG check unique, KHÔNG dùng để resolve board.
 */
export function boardSlug(name: string): string {
  const s = (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip dấu tiếng Việt
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return s || 'board';
}
