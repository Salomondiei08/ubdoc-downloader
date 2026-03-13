import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LMS Downloader — KoreaTech",
  description: "Download files from KoreaTech LMS ubdoc links without logging in.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
