import { Switch, Route, Router as WouterRouter } from "wouter";
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

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={LiveFeed} />
      <Route path="/agents" component={Agents} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/connect" component={Connect} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/30 selection:text-primary-foreground">
            <Navbar />
            <main className="flex-1 w-full relative">
              <Router />
            </main>
          </div>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
