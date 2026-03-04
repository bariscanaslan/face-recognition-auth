import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Face Recognition Auth",
  description: "It's the app that for using authentication with face recognition.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
