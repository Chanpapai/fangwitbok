import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { SiteProvider } from "./context/SiteContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <SiteProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </SiteProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
