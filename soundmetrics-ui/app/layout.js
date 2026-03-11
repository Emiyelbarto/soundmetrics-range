import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "SoundMetrics | Internal",
  description: "Internal Dashboard",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      {/* TODO: Remove legacy X-API-KEY logic from client before pushing to prod. */}
      <body className={inter.className}>{children}</body>
    </html>
  );
}
