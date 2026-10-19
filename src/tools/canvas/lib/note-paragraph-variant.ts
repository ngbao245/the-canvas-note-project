import { Extension } from '@tiptap/react';

/**
 * Biến thể đoạn văn cho Note: Small text + Callout (Milanote parity).
 *
 * Milanote có Small text và Callout trong Text style. Hai cái này không phải
 * node riêng — chỉ là đoạn văn (`paragraph`) với kiểu hiển thị khác. Thay vì
 * thêm node mới (phức tạp cho schema + Card Clipper + mã khối), ta thêm 1 thuộc
 * tính `variant` vào paragraph, ghi ra HTML là `data-variant="small" | "callout"`.
 *
 * Vì thuộc tính nằm trong schema (`addGlobalAttributes`), bộ lọc `sanitizeNoteHtml`
 * giữ nguyên khi hiển thị lại (INV-NOTE-02 / INV-NOTE-03). CSS cho 2 biến thể ở
 * `NOTE_CONTENT_CLASS` (NoteObject.tsx), dùng chung lúc xem lẫn lúc sửa.
 *
 * Lệnh `setParagraphVariant(null | 'small' | 'callout')`: chuyển đoạn hiện tại
 * về paragraph rồi gắn variant. null = đoạn thường (bỏ variant).
 */

export type ParagraphVariant = 'small' | 'callout';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    noteParagraphVariant: {
      setParagraphVariant: (variant: ParagraphVariant | null) => ReturnType;
    };
  }
}

export const NoteParagraphVariant = Extension.create({
  name: 'noteParagraphVariant',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph'],
        attributes: {
          variant: {
            default: null,
            // Chỉ nhận giá trị đã biết: HTML dán vào / data cũ không mang giá trị lạ
            // qua được bộ lọc.
            parseHTML: (element): ParagraphVariant | null => {
              const v = element.getAttribute('data-variant');
              return v === 'small' || v === 'callout' ? v : null;
            },
            renderHTML: (attributes) => {
              const v = attributes.variant as ParagraphVariant | null;
              if (!v) return {};
              return { 'data-variant': v };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setParagraphVariant:
        (variant) =>
        ({ chain }) =>
          // Luôn chuyển về paragraph trước (phòng khi đang là heading/quote),
          // rồi gắn variant qua updateAttributes.
          chain().setParagraph().updateAttributes('paragraph', { variant }).run(),
    };
  },
});
