import { Switch, Route, Redirect, useLocation } from "wouter";
import { AdminAuthProvider, useAdminAuth } from "./lib/AuthContext";
import { LangProvider } from "./lib/i18n";
import { AdminLayout } from "./AdminLayout";
import { AdminLogin } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { UsersPage } from "./pages/Users";
import { TasksPage } from "./pages/Tasks";
import { ReportsPage } from "./pages/Reports";
import { BusinessesPage } from "./pages/Businesses";
import { AdminsPage } from "./pages/Admins";
import { AuditPage } from "./pages/Audit";
import { useEffect } from "react";

export function AdminApp() {
  return (
    <LangProvider>
      <AdminAuthProvider>
        <AdminRouter />
      </AdminAuthProvider>
    </LangProvider>
  );
}

function AdminRouter() {
  const { loading, admin } = useAdminAuth();
  const [location, setLocation] = useLocation();

  // Redirect / → /admin/login or /admin/dashboard
  useEffect(() => {
    if (loading) return;
    if (location === "/admin" || location === "/admin/") {
      setLocation(admin ? "/admin/dashboard" : "/admin/login");
    }
  }, [loading, admin, location]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Loading...
      </div>
    );
  }

  if (!admin) {
    return (
      <Switch>
        <Route path="/admin/login" component={AdminLogin} />
        <Route>
          <Redirect to="/admin/login" />
        </Route>
      </Switch>
    );
  }

  return (
    <AdminLayout>
      <Switch>
        <Route path="/admin/dashboard" component={Dashboard} />
        <Route path="/admin/users" component={UsersPage} />
        <Route path="/admin/tasks" component={TasksPage} />
        <Route path="/admin/reports" component={ReportsPage} />
        <Route path="/admin/businesses" component={BusinessesPage} />
        <Route path="/admin/admins" component={AdminsPage} />
        <Route path="/admin/audit" component={AuditPage} />
        <Route path="/admin/login">
          <Redirect to="/admin/dashboard" />
        </Route>
        <Route>
          <Redirect to="/admin/dashboard" />
        </Route>
      </Switch>
    </AdminLayout>
  );
}
