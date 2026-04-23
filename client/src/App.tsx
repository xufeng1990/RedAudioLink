import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { AdminApp } from "@/admin/AdminApp";
import { adminQueryClient } from "@/admin/lib/queryClient";

function Router() {
  return (
    <Switch>
      <Route path="/admin">
        <QueryClientProvider client={adminQueryClient}>
          <AdminApp />
        </QueryClientProvider>
      </Route>
      <Route path="/admin/:rest*">
        <QueryClientProvider client={adminQueryClient}>
          <AdminApp />
        </QueryClientProvider>
      </Route>
      <Route path="/">
        <Redirect to="/admin" />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
