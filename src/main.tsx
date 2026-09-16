import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
// drawably nạp TRƯỚC để index.css của app override được (padding badge, ...)
import 'drawably/style.css';
import './styles/index.css';

const root = document.getElementById('root');
if (!root) {
  throw new Error('Không tìm thấy phần tử #root');
}

const queryClient = new QueryClient();

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
