import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

console.log('[Main] Starting application initialization');
const rootElement = document.getElementById("root");
console.log('[Main] Root element found:', rootElement ? 'yes' : 'no');

if (rootElement) {
  console.log('[Main] Creating React root');
  const root = createRoot(rootElement);
  console.log('[Main] Rendering app');
  root.render(
    <App />
  );
  console.log('[Main] Initial render complete');
} else {
  console.error('[Main] Root element not found!');
}