import '@fontsource/noto-sans-arabic/400.css';
import '@fontsource/noto-sans-arabic/700.css';
import '@iqdid/ui/styles.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { VerifierApp } from './App.tsx';
import { defaultVerifierGateway } from './gateway.tsx';

const root = document.getElementById('root');
if (!root) throw new Error('#root missing');
createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <VerifierApp gateway={defaultVerifierGateway()} />
    </BrowserRouter>
  </StrictMode>,
);
