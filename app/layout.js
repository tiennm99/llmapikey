import "./globals.css";

import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "llmapikey — free OpenRouter API key",
  description:
    "Get a free, capped OpenRouter API key — one per GitHub account. No signup beyond GitHub.",
};

/**
 * Root layout wrapping every page with the session-aware site header.
 *
 * @param {{ children: React.ReactNode }} props
 */
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
