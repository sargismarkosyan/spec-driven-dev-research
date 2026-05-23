'use client';
// Redirect to home — the canvas page is unused in this experiment
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
export default function CanvasPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/'); }, [router]);
  return null;
}
