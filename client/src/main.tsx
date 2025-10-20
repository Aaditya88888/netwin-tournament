// Temporarily removed App Check debug token assignment to allow Firebase to generate a new debug token
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { ThemeProvider } from "./components/ui/theme-provider";
import { AppCheckService } from "./lib/firebase/appcheck";
import React from "react";


// Initialize App Check before rendering the app
AppCheckService.initializeAppCheck().then((success) => {
  console.log('App Check initialization result:', success);
});

createRoot(document.getElementById("root")!).render(
  <ThemeProvider defaultTheme="dark" storageKey="netwin-theme">
    <App />
  </ThemeProvider>
);
