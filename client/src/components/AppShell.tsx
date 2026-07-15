import type { ReactNode } from "react";
import { Bookmark, BookOpen, FilePlus2, Home, ShieldCheck, UserRound } from "lucide-react";
import { NavLink } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { initials } from "../lib/format";
import { Brand } from "./Brand";
import { cx } from "./ui";

const mainItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/library", label: "Library", icon: BookOpen },
  { to: "/submit", label: "Submit", icon: FilePlus2 },
  { to: "/saved", label: "Saved", icon: Bookmark }
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <Brand />
          <nav className="desktop-nav" aria-label="Main navigation">
            {mainItems.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === "/"} className={({ isActive }) => cx("nav-link", isActive && "active")}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="topbar-actions">
            {user.role === "moderator" || user.role === "admin" ? (
              <NavLink to="/moderation" className="tool-link">
                <ShieldCheck size={17} />
                Moderation
              </NavLink>
            ) : null}
            {user.role === "admin" ? <NavLink to="/admin" className="tool-link">Admin</NavLink> : null}
            <NavLink to="/profile" className="avatar-link" aria-label="Open profile">
              <span className="avatar">{initials(user)}</span>
            </NavLink>
          </div>
        </div>
      </header>

      <main className="app-main">{children}</main>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {mainItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink key={item.to} to={item.to} end={item.to === "/"} className={({ isActive }) => cx("mobile-nav-link", isActive && "active")}>
              <Icon size={21} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
        <NavLink to="/profile" className={({ isActive }) => cx("mobile-nav-link", isActive && "active")}>
          <UserRound size={21} />
          <span>Profile</span>
        </NavLink>
      </nav>
    </div>
  );
}
