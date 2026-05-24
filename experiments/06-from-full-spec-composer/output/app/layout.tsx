import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Work Audit',
  description: 'Audit your recurring work. Find what to fix.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
