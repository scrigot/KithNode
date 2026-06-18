// Feature flag for the Kith & Nodes social layer. Default OFF.
// Server code gates on KITH_NODES_ENABLED; client components read
// NEXT_PUBLIC_ENABLE_KITH_NODES directly (Next inlines it at build time).
export const KITH_NODES_ENABLED = process.env.ENABLE_KITH_NODES === "true";
