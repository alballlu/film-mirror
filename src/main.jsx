import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { PosterProvider } from './context/PosterContext';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <PosterProvider>
        <App />
      </PosterProvider>
    </BrowserRouter>
  </React.StrictMode>
);