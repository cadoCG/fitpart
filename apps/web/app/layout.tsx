import type { Metadata, Viewport } from "next";
import { Archivo, IBM_Plex_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";

const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo" });
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
});

const SITE_DESCRIPTION =
  "Passgenaue 3D-Druck-Funktionsteile aus Foto + geführter Messung.";

export const metadata: Metadata = {
  metadataBase: new URL("https://fitpart.app"),
  title: { default: "FitPart", template: "%s · FitPart" },
  description: SITE_DESCRIPTION,
  applicationName: "FitPart",
  openGraph: {
    type: "website",
    siteName: "FitPart",
    title: "FitPart",
    description: SITE_DESCRIPTION,
    locale: "de_CH",
  },
  twitter: {
    card: "summary_large_image",
    title: "FitPart",
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfbfc" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0d10" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${archivo.variable} ${plexMono.variable}`}>
      <body className="min-h-screen antialiased">
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
