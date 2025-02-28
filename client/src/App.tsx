import { Route, Switch } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Config from "./pages/Config";
import ConversationFlows from "./pages/ConversationFlows";
import TestEcho from "./pages/TestEcho";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/config" component={Config} />
      <Route path="/conversations" component={ConversationFlows} />
      <Route path="/test-echo" component={TestEcho} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <>
      <Router />
      <Toaster />
    </>
  );
}

export default App;
