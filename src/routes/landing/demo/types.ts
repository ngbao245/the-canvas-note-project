// Kiểu dữ liệu của canvas mini trên landing. Cố ý không dùng kiểu của canvas
// thật: demo độc lập, canvas thật đổi gì demo không vỡ theo.

export interface DemoCamera {
  /** Độ dời màn hình (px) của gốc toạ độ board. */
  x: number;
  y: number;
  zoom: number;
}

export interface DemoRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Nguồn của 1 trích dẫn: file nào, trang nào, bảng nào. */
export interface DemoSource {
  file: string;
  page: number;
  table: number;
}

export interface DemoObject extends DemoRect {
  id: string;
  title: string;
  body: string;
  /** Có nguồn = trích dẫn (hiện dòng nguồn + nút Mở nguồn). Không có = note thường. */
  source?: DemoSource;
}

/** Đường nối tĩnh giữa 2 object, đi theo vị trí. Thiếu 1 đầu thì ẩn. */
export interface DemoLink {
  id: string;
  from: string;
  to: string;
}

export interface DemoDraft {
  title: string;
  body: string;
}
