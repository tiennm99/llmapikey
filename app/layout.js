import "./globals.css";

import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "llmapikey — pending OpenRouter API key giveaway",
  description:
    "Pending free, capped OpenRouter API key giveaway — paused until a suitable provider is selected.",
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
