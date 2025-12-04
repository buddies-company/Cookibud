
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

import "./i18n";
import './style.css';
import { ToastProvider } from '@soilhat/react-components';

import { registerSW } from 'virtual:pwa-register';

registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>
);