'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/cognito';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    getSession().then((s) => router.replace(s ? '/teams' : '/login'));
  }, [router]);

  return <p style={{ padding: 24 }}>Cargando...</p>;
}
