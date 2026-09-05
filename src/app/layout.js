import localFont from "next/font/local";
import "./globals.css";
import DevServiceWorkerCleanup from "@/components/DevServiceWorkerCleanup";

// Self-hosted (not next/font/google) so the build never depends on network
// access to fonts.googleapis.com — matters both for this sandbox's
// restricted egress and for keeping builds fast/reliable in general.
//
// Rajdhani = display face (logo, headings, big numbers, tracked micro-labels)
// for the "Tech Emerald" look; DM Sans = body copy.
//
// NOTE: the CSS variables are named `--font-rajdhani` / `--font-body`, NOT
// `--font-display` / `--font-sans`. Those two names are Tailwind theme tokens
// registered in globals.css, which reference these — reusing the name here
// would make the token self-referential and silently kill both fonts.
const displayFont = localFont({
  src: [
    { path: "./fonts/Rajdhani-Medium.ttf", weight: "500", style: "normal" },
    { path: "./fonts/Rajdhani-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "./fonts/Rajdhani-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-rajdhani",
  display: "swap",
});

const bodyFont = localFont({
  src: [{ path: "./fonts/DMSans-VF.ttf", weight: "100 1000", style: "normal" }],
  variable: "--font-body",
  display: "swap",
});

export const metadata = {
  applicationName: "VITAURA",
  title: {
    default: "VITAURA — Your health reality layer",
    template: "%s · VITAURA",
  },
  description:
    "Instantly verify health claims against trusted sources, in your own language.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VITAURA",
  },
  formatDetection: { telephone: false },
};

export const viewport = {
  // Matches --color-background in globals.css. Was #101827 (a leftover from
  // an earlier palette), which made the installed PWA's status bar and splash
  // screen a visibly different colour from the app itself.
  themeColor: "#0a0a0a",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${displayFont.variable} ${bodyFont.variable}`}
      suppressHydrationWarning
    >
      <body
        className="min-h-full flex flex-col font-sans bg-background text-foreground"
        suppressHydrationWarning
      >
        {/* Dev-only: removes a service worker left installed by a previous
            production build, which would otherwise serve stale precached
            chunks to the dev server. No-op (and dead code) in production. */}
        <DevServiceWorkerCleanup />
        {children}
      </body>
    </html>
  );
}
