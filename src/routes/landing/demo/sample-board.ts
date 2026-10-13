import type { DemoLink, DemoObject } from './types';

// Board mẫu của demo. Là dữ liệu (như note người dùng viết), không đi qua bộ dịch.

export function makeSampleObjects(): DemoObject[] {
  return [
    {
      id: 'note-idea',
      x: 0,
      y: 0,
      w: 290,
      h: 190,
      title: 'Ý tưởng gom nguồn',
      body: 'Kéo thử note này đi chỗ khác.\nBấm đúp để sửa chữ.\nKéo note mới từ thanh bên trái.\nCtrl + lăn chuột để phóng to.',
    },
    {
      id: 'quote-q3',
      x: 380,
      y: 30,
      w: 270,
      h: 170,
      title: 'Doanh thu Q3 +18%',
      body: 'So với Q2, nhờ kênh online.',
      source: { file: 'bao-cao-q3.pdf', page: 12, table: 3 },
    },
    {
      id: 'note-todo',
      x: 110,
      y: 260,
      w: 260,
      h: 160,
      title: 'Việc cần làm',
      body: '- Đọc báo cáo Q3\n- So với Q2\n- Gửi kết luận cho nhóm',
    },
  ];
}

export const SAMPLE_LINKS: readonly DemoLink[] = [
  { id: 'link-quote-idea', from: 'quote-q3', to: 'note-idea' },
];
