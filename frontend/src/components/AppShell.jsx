import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import API from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Activity,
  LayoutDashboard,
  PlusCircle,
  Package,
  ClipboardCheck,
  Bell,
  Settings,
  LogOut,
  Plus,
  ChevronDown,
  Home,
} from "lucide-react";

const desktopNav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, testId: "sidebar-nav-dashboard" },
  { to: "/new-insight", label: "New Insight", icon: PlusCircle, testId: "sidebar-nav-new-insight" },
  { to: "/products", label: "Products", icon: Package, testId: "sidebar-nav-products" },
  { to: "/recommendations", label: "Recommendations", icon: ClipboardCheck, testId: "sidebar-nav-recommendations" },
  { to: "/alerts", label: "Alerts", icon: Bell, testId: "sidebar-nav-alerts" },
  { to: "/settings", label: "Settings", icon: Settings, testId: "sidebar-nav-settings" },
];

const Logo = ({ compact }) => (
  <div className="flex items-center gap-2.5">
    <span className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
      <Activity className="h-5 w-5 text-primary-foreground" />
    </span>
    {!compact && (
      <div className="leading-tight">
        <p className="font-extrabold text-[15px] tracking-tight text-foreground">ProductPulse AI</p>
        <p className="text-[10px] text-muted-foreground font-medium tracking-wide uppercase">Product Intelligence</p>
      </div>
    )}
  </div>
);

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let active = true;
    API.get("/alerts")
      .then((res) => {
        if (active) setUnread(res.data.filter((a) => !a.read).length);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const pageTitle =
    desktopNav.find((n) => (n.to === "/" ? location.pathname === "/" : location.pathname.startsWith(n.to)))?.label ||
    (location.pathname.startsWith("/products/") ? "Product Detail" : "ProductPulse AI");

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col bg-card border-r border-border z-40">
        <div className="h-16 flex items-center px-5 border-b border-border">
          <Logo />
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1">
          {desktopNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              data-testid={item.testId}
              className={({ isActive }) =>
                cn(
                  "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors duration-150",
                  isActive
                    ? "bg-primary/5 text-primary before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:rounded-full before:bg-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )
              }
            >
              <item.icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
              {item.label}
              {item.to === "/alerts" && unread > 0 && (
                <span className="ml-auto text-[10px] font-bold bg-[hsl(var(--pp-critical))] text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                  {unread}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-border">
          <div className="rounded-lg bg-secondary/70 px-3 py-2.5">
            <p className="text-xs font-semibold text-foreground truncate">{user?.store_name}</p>
            <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
      </aside>

      {/* Topbar */}
      <header className="sticky top-0 z-30 h-14 lg:h-16 bg-background/95 backdrop-blur border-b border-border flex items-center gap-3 px-4 lg:px-8 lg:ml-64">
        <div className="lg:hidden">
          <Logo compact />
        </div>
        <h2 className="hidden lg:block text-sm font-bold text-foreground">{pageTitle}</h2>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="relative lg:hidden"
            onClick={() => navigate("/alerts")}
            data-testid="topbar-alerts-button"
          >
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-[hsl(var(--pp-critical))] ring-2 ring-background" />
            )}
          </Button>
          <Button
            className="hidden lg:inline-flex rounded-lg font-semibold"
            size="sm"
            onClick={() => navigate("/new-insight")}
            data-testid="topbar-new-insight-button"
          >
            <Plus className="h-4 w-4 mr-1.5" /> New Insight
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-lg gap-2 max-w-[180px]" data-testid="topbar-user-menu">
                <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                  {(user?.store_name || "S")[0].toUpperCase()}
                </span>
                <span className="hidden sm:block text-xs font-semibold truncate">{user?.store_name}</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="text-xs">
                <p className="font-bold text-foreground">{user?.store_name}</p>
                <p className="text-muted-foreground font-normal truncate">{user?.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/settings")} data-testid="user-menu-settings">
                <Settings className="h-4 w-4 mr-2" /> Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-[hsl(var(--pp-critical))]" data-testid="user-menu-logout">
                <LogOut className="h-4 w-4 mr-2" /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main content */}
      <main className="lg:ml-64 px-4 lg:px-8 py-6 pb-28 lg:pb-10 max-w-[1280px]">
        <Outlet />
      </main>

      {/* Mobile bottom navigation */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-card border-t border-border pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5 h-16">
          <NavLink to="/" end data-testid="mobile-bottomnav-home" className={({ isActive }) => cn("flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold", isActive ? "text-primary" : "text-muted-foreground")}>
            <Home className="h-5 w-5" /> Home
          </NavLink>
          <NavLink to="/products" data-testid="mobile-bottomnav-products" className={({ isActive }) => cn("flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold", isActive ? "text-primary" : "text-muted-foreground")}>
            <Package className="h-5 w-5" /> Products
          </NavLink>
          <div className="flex items-center justify-center">
            <button
              onClick={() => navigate("/new-insight")}
              data-testid="mobile-bottomnav-add"
              className="h-12 w-12 -mt-5 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-[var(--pp-shadow-md)] active:translate-y-[1px] transition-transform"
              aria-label="New Insight"
            >
              <Plus className="h-6 w-6" />
            </button>
          </div>
          <NavLink to="/alerts" data-testid="mobile-bottomnav-alerts" className={({ isActive }) => cn("relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold", isActive ? "text-primary" : "text-muted-foreground")}>
            <span className="relative">
              <Bell className="h-5 w-5" />
              {unread > 0 && <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[hsl(var(--pp-critical))]" />}
            </span>
            Alerts
          </NavLink>
          <NavLink to="/settings" data-testid="mobile-bottomnav-settings" className={({ isActive }) => cn("flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold", isActive ? "text-primary" : "text-muted-foreground")}>
            <Settings className="h-5 w-5" /> Settings
          </NavLink>
        </div>
      </nav>
    </div>
  );
}
