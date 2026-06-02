import type { ReactNode } from "react";

export const metadata = {
  title: "CrownX Jewel — Admin Queue",
  description: "Wave 1 reviewer console for authentication cases and COA records."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          margin: 0,
          background: "#f7f4f0",
          color: "#0b1320"
        }}
      >
        {children}
      </body>
    </html>
  );
}
