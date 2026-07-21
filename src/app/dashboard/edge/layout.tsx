import { NetworkNav } from "@/components/network-nav";
export default function EdgeLayout({ children }: { children: React.ReactNode }) { return <div className="min-h-full"><NetworkNav />{children}</div>; }
