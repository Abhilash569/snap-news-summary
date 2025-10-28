import { createRoot } from "react-dom/client";
import { StrictMode } from 'react';
import App from "./App.tsx";
import "./index.css";

console.log("Starting app initialization...");

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("Root element not found!");
  throw new Error("Root element not found");
}

console.log("Root element found, creating React root...");
const root = createRoot(rootElement);

console.log("Rendering app...");
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
