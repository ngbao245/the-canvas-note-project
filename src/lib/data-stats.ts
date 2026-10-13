/**
 * Số liệu dữ liệu cho Cài đặt → Dữ liệu. Tool sở hữu dữ liệu (hiện là Canvas) đăng ký hàm
 * đếm lúc khởi động (`src/register-tools.ts`); Cài đặt chỉ gọi `countData`, không biết tool nào.
 */
export interface DataCounts {
  boards: number;
  objects: number;
}

type DataCounter = () => Promise<DataCounts>;

let counter: DataCounter | null = null;

export function registerDataCounter(fn: DataCounter): void {
  counter = fn;
}

/** Chưa tool nào đăng ký → 0 hết (không phải lỗi). */
export function countData(): Promise<DataCounts> {
  return counter ? counter() : Promise.resolve({ boards: 0, objects: 0 });
}
