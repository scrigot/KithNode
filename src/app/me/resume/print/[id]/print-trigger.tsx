"use client";

import { useEffect } from "react";

// Auto-opens the print dialog once the paper has rendered, and offers a manual
// button (the dialog is the "Save as PDF" surface).
export default function PrintTrigger() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="no-print" style={{ textAlign: "center", marginBottom: 16 }}>
      <button
        onClick={() => window.print()}
        style={{ background: "#E8643C", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 13, cursor: "pointer" }}
      >
        Print / Save as PDF
      </button>
      <style>{`@media print { .no-print { display: none !important; } }`}</style>
    </div>
  );
}
