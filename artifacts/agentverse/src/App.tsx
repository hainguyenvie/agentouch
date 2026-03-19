import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navbar } from "@/components/layout/Navbar";
import NotFound from "@/pages/not-found";

// Pages
import LiveFeed from "@/pages/LiveFeed";
import Agents from "@/pages/Agents";
import Dashboard from "@/pages/Dashboard";
import Connect from "@/pages/Connect";
import Workspace from "@/pages/Workspace";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={LiveFeed} />
      <Route path="/agents" component={Agents} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/connect" component={Connect} />
      <Route path="/connect/:rest*" component={Connect} />
      <Route path="/workspace" component={Workspace} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppShell() {
  const [location] = useLocation();
  const isWorkspace = location === "/workspace";

  if (isWorkspace) {
    return (
      <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
        <Router />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/30 selection:text-primary-foreground">
      <Navbar />
      <main className="flex-1 w-full relative">
        <Router />
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppShell />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
