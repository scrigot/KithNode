import type { Metadata, Viewport } from "next";
import { Space_Grotesk, DM_Sans, Newsreader } from "next/font/google";
import { Providers } from "./providers";
import { cn } from "@/lib/utils";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-editorial",
});

export const metadata: Metadata = {
  metadataBase: new globalThis.URL("https://kithnode.ai"),
  title: {
    default: "KithNode | Warm-path finance recruiting for students",
    template: "%s | KithNode",
  },
  description:
    "KithNode helps ambitious students find warm paths into finance by mapping alumni, scoring the strongest connections, and drafting authentic outreach.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "https://kithnode.ai",
    siteName: "KithNode",
    title: "KithNode | Warm-path finance recruiting for students",
    description:
      "Find alumni, score warm paths, and draft outreach that helps students break into finance.",
    images: [
      {
        url: "/icon.svg",
        width: 1200,
        height: 1200,
        alt: "KithNode",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "KithNode | Warm-path finance recruiting for students",
    description:
      "Find alumni, score warm paths, and draft outreach that helps students break into finance.",
    images: ["/icon.svg"],
  },
  icons: {
    icon: "/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0369A1",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={cn(spaceGrotesk.variable, dmSans.variable, newsreader.variable)}
    >
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
