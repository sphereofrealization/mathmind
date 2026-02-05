import React, { useEffect, useMemo, useRef, useState } from "react";

// Lightweight MathJax 3 loader and LaTeX renderer
// Renders a LaTeX document or fragment as a nicely formatted "book" page
export default function LaTeXBookViewer({ source }) {
  const containerRef = useRef(null);
  const [mjReady, setMjReady] = useState(typeof window !== 'undefined' && !!window.MathJax);

  // Strip LaTeX preamble for full documents; keep content between \begin{document} and \end{document}
  const stripped = useMemo(() => {
    const s = source || '';
    const start = s.indexOf('\\begin{document}');
    const end = s.lastIndexOf('\\end{document}');
    if (start !== -1 && end !== -1 && end > start) {
      return s.substring(start + '\\begin{document}'.length, end).trim();
    }
    return s;
  }, [source]);

  // Load MathJax once if not present
  useEffect(() => {
    if (mjReady) return;
    if (typeof window === 'undefined') return;

    if (!document.getElementById('mathjax-script')) {
      window.MathJax = {
        tex: {
          inlineMath: [ ['$', '$'], ['\\(', '\\)'] ],
          displayMath: [ ['$$','$$'], ['\\[','\\]'] ],
          processEscapes: true,
          packages: { '[+]': ['noerrors', 'noundefined'] },
        },
        options: {
          skipHtmlTags: ['script','noscript','style','textarea','pre','code'],
        },
        startup: {
          typeset: false,
        },
      };
      const script = document.createElement('script');
      script.id = 'mathjax-script';
      script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js';
      script.async = true;
      script.onload = () => setMjReady(true);
      document.head.appendChild(script);
    } else {
      setMjReady(true);
    }
  }, [mjReady]);

  // Typeset on content or readiness change
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!mjReady || !window.MathJax || !window.MathJax.typesetPromise) return;
    window.MathJax.typesetClear && window.MathJax.typesetClear([el]);
    window.MathJax.typesetPromise([el]).catch(() => {});
  }, [mjReady, stripped]);

  return (
    <div className="relative">
      <div className="mx-auto max-w-3xl bg-white rounded-xl border shadow overflow-hidden">
        <div className="px-6 py-8 md:px-8 md:py-10 prose prose-neutral max-w-none" ref={containerRef}
             style={{ color: '#0b0b0b' }}>
          {/* Render LaTeX as raw text for MathJax to process */}
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{stripped}</div>
        </div>
      </div>
    </div>
  );
}