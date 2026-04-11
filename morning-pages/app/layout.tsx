import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Morning Pages — The Artist's Way",
  description: "매일 아침, 검열 없이 씁니다",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}