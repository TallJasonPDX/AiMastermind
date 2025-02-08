import { Routes, Route, Navigate } from "react-router-dom";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Config from './pages/Config';
import ConversationFlows from './pages/ConversationFlows';

function Router() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/config" element={<Config />} />
      <Route path="/conversations" element={<Navigate to="/conversationflows" replace />} />
      <Route path="/conversationflows" element={<ConversationFlows />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;