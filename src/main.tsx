import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./cloud/Auth";
import "@fontsource/golos-text/cyrillic-400.css";
import "@fontsource/golos-text/latin-400.css";
import "@fontsource/golos-text/cyrillic-500.css";
import "@fontsource/golos-text/latin-500.css";
import "@fontsource/golos-text/cyrillic-700.css";
import "@fontsource/golos-text/latin-700.css";
import "@fontsource/unbounded/cyrillic-500.css";
import "@fontsource/unbounded/latin-500.css";
import "./styles.css";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
);
