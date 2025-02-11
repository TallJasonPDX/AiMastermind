import { Route, Switch } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Config from './pages/Config';
import ConversationFlows from './pages/ConversationFlows';

function Router() {
  console.log("[App] Initializing Router");
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/config" component={Config} />
      <Route path="/conversations" component={ConversationFlows} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  console.log("[App] Initializing App");
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;