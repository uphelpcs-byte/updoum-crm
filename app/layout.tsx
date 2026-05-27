import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "업도움 CRM",
  description: "CS 외주 영업을 위한 인하우스 CRM",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
