import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Work Audit',
  description: 'Real-time collaborative work audit for engineering teams',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
