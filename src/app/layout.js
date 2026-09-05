import "./globals.css";

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
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
