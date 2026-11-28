'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getSession, logout } from '@/lib/cognito';

export default function Home() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const session = await getSession();
      if (!session) return router.replace('/login');
      try {
        const data = await apiFetch('/me');
        setMe(data.user);
      } catch (err) {
        setError(err.message);
      }
    }
    load();
  }, [router]);

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  return (
    <main style={{ maxWidth: 600, margin: '60px auto', padding: 24 }}>
      <h1>Gestor de tareas</h1>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {me && (
        <>
          <p>Sesión: {me.email}</p>
          <p>Grupos: {me.groups.join(', ') || 'ninguno'}</p>
        </>
      )}
      <button onClick={handleLogout}>Cerrar sesión</button>
    </main>
  );
}