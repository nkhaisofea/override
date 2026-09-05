import localFont from "next/font/local";
import "./globals.css";

// Self-hosted (not next/font/google) so the build never depends on network
// access to fonts.googleapis.com — matters both for this sandbox's
// restricted egress and for keeping builds fast/reliable in general.
// Rajdhani = display font (headings, logo, big numbers) for the
// "Tech Emerald" feel; DM Sans = body font, replacing the system stack.
const displayFont = localFont({
  src: [
    { path: "./fonts/Rajdhani-Medium.ttf", weight: "500", style: "normal" },
    { path: "./fonts/Rajdhani-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "./fonts/Rajdhani-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-display",
  display: "swap",
});

const bodyFont = localFont({
  src: [{ path: "./fonts/DMSans-VF.ttf", weight: "100 1000", style: "normal" }],
  variable: "--font-body",
  display: "swap",
});

export const metadata = {
  applicationName: "VITAURA",
  title: "VITAURA",
  description: "Instantly verify health claims against trusted sources, in your own language.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "VITAURA",
  },
};

export const viewport = {
  themeColor: "#101827",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${displayFont.variable} ${bodyFont.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
