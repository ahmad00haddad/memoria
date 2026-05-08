import { Link } from "@tanstack/react-router";
import { Camera } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="container-editorial flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="grid h-9 w-9 place-items-center rounded-sm bg-gradient-gold">
            <Camera className="h-4 w-4 text-charcoal" />
          </div>
          <div className="leading-tight">
            <div className="font-serif text-lg tracking-wide">EliteCapture</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Wedding · Jordan</div>
          </div>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2 text-sm">
          <Link to="/search" className="px-3 py-2 rounded-sm hover:bg-secondary transition-colors">ابحث عن مصوّر</Link>
          <Link to="/pricing" className="hidden sm:inline-flex px-3 py-2 rounded-sm hover:bg-secondary transition-colors">الأسعار</Link>
          <Link to="/photographers/join" className="hidden sm:inline-flex px-3 py-2 rounded-sm hover:bg-secondary transition-colors">انضم كمصوّر</Link>
          <Link
            to="/login"
            className="px-4 py-2 rounded-sm bg-charcoal text-ivory text-sm hover:opacity-90 transition-opacity"
          >
            تسجيل الدخول
          </Link>
        </nav>
      </div>
    </header>
  );
}
