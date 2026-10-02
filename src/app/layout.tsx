import type { Metadata, Viewport } from "next";
import AmbientBackground from "@/components/AmbientBackground";
import Providers from "@/components/Providers";
import RegisterSW from "@/components/RegisterSW";
import "./globals.css";

const site =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

const description =
  "KPAI! - Dead or Wounded, naija style. Crack your friend's secret code before they crack yours. Play the computer, a friend online, or pass-and-play.";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: { default: "KPAI! - Dead or Wounded, naija style", template: "%s | KPAI!" },
  description,
  applicationName: "KPAI!",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "KPAI!", statusBarStyle: "black-translucent" },
  openGraph: {
    type: "website",
    siteName: "KPAI!",
    title: "KPAI! - Dead or Wounded, naija style",
    description: "Oya come play! Crack the secret code before your friend cracks yours 💀🩸",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "KPAI! - Dead or Wounded, naija style" }],
  },
  twitter: { card: "summary_large_image", title: "KPAI! - Dead or Wounded, naija style", description, images: ["/og.png"] },
};

export const viewport: Viewport = {
  themeColor: "#07110c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <AmbientBackground />
          {children}
        </Providers>
        <RegisterSW />
      </body>
    </html>
  );
}
