// Landing và app chạy ở 2 domain riêng (vd canvasnote.xxx và app.canvasnote.xxx),
// nên link sang canvas phải là URL tuyệt đối. Đặt VITE_APP_URL lúc build landing.
// Thiếu biến thì trỏ app dev ở cổng 3000.
const raw: unknown = import.meta.env.VITE_APP_URL;
const base = typeof raw === 'string' && raw.length > 0 ? raw.replace(/\/+$/, '') : 'http://localhost:3000';

export const APP_CANVAS_URL = `${base}/canvas`;
