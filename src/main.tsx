import React from "react";
import ReactDOM from "react-dom/client";

import "./styles.css";
import App from "./App";
import { AppQueryProvider } from "./lib/queryClient";

import { useUIStore } from "@/store";

function BootstrapTheme() {
  // Ensure the persisted theme applies ASAP
  React.useEffect(() => {
    const theme = useUIStore.getState().theme;
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, []);
  return null;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppQueryProvider>
      <BootstrapTheme />
      <App />
    </AppQueryProvider>
  </React.StrictMode>
);
