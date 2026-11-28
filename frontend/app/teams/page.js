'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { getSession, logout } from '@/lib/cognito';

export default function TeamsPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [teams, setTeams] = useState([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadTeams() {
    try {
      setTeams(await apiFetch('/teams'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function init() {
      const s = await getSession();
      if (!s) return router.replace('/login');
      setSession(s);
      loadTeams();
    }
    init();
  }, [router]);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    try {
      await apiFetch('/teams', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      setName('');
      loadTeams();
    } catch (err) {
      setError(err.message);
    }
  }

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  const isAdmin = session?.groups.includes('admin');

  return (
    <main style={{ maxWidth: 640, margin: '40px auto', padding: 24 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Mis equipos</h1>
        <div>
          <small>{session?.email}</small>{' '}
          <button onClick={handleLogout}>Cerrar sesión</button>
        </div>
      </header>

      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      {isAdmin && (
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: 8, margin: '16px 0' }}>
          <input
            placeholder="Nombre del nuevo equipo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{ flex: 1 }}
          />
          <button type="submit">Crear equipo</button>
        </form>
      )}

      {loading && <p>Cargando...</p>}
      {!loading && teams.length === 0 && (
        <p>No perteneces a ningún equipo todavía.</p>
      )}

      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 8 }}>
        {teams.map((t) => (
          <li key={t.id} style={{ border: '1px solid #444', borderRadius: 6, padding: 12 }}>
            <Link href={`/team?id=${t.id}`}>
              <strong>{t.name}</strong>
            </Link>{' '}
            <small>({t.role})</small>
          </li>
        ))}
      </ul>
    </main>
  );
}