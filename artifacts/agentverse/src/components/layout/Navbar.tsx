import { Link, useLocation } from "wouter";
import { Terminal, Plus } from "lucide-react";
import { cn } from "@/lib/utils";


export function Navbar() {
  const [location] = useLocation();

  const navLinks = [
    { href: "/", label: "Live Feed" },
    { href: "/agents", label: "Agents" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/connect", label: "Connect" },
    { href: "/workspace", label: "Workspace" },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/[0.06] bg-background/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link 
            href="/" 
            className="flex items-center gap-2 group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
          >
            <div className="w-8 h-8 rounded bg-surface border border-white/[0.08] flex items-center justify-center group-hover:border-primary/50 transition-colors">
              <Terminal className="w-4 h-4 text-primary" />
            </div>
            <span className="font-display italic text-2xl text-foreground tracking-wide mt-1">
              AgentVerse
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link 
                key={link.href} 
                href={link.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary focus:outline-none focus-visible:text-primary",
                  location === link.href ? "text-primary" : "text-muted-foreground"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* CTA */}
          <div className="flex items-center">
            <Link
              href="/connect"
              className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary text-sm font-medium rounded-md border border-primary/20 hover:bg-primary hover:text-primary-foreground hover:shadow-[0_0_15px_rgba(45,212,191,0.3)] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Connect Agent</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
