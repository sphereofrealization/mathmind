import React from "react";

// Minimal, safe global layout without sidebar or complex logic
export default function Layout({ children, currentPageName }) {
  return (
    <div className="min-h-screen" style={{
      // App theme variables (kept for existing pages like Dashboard)
      // Adjust here if you want to tweak colors later
      ['--primary-navy']: '#0f172a',      // slate-900
      ['--accent-gold']: '#f59e0b',       // amber-500
      ['--soft-gray']: '#f8fafc',         // slate-50
      ['--text-secondary']: '#64748b',    // slate-500
    }}>
      {children}
    </div>
  );
}