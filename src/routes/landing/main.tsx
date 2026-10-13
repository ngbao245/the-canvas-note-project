import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { LandingRoot } from './LandingRoot';
// drawably nạp TRƯỚC để index.css (token theme) override được.
import 'drawably/style.css';
import '@/styles/index.css';

// Entry riêng của landing (build bằng vite.landing.config.ts, domain riêng với app).
const root = document.getElementById('root');
if (!root) throw new Error('Không tìm thấy phần tử #root');

createRoot(root).render(
  <StrictMode>
    <LandingRoot />
  </StrictMode>,
);
