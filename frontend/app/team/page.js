'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { getSession } from '@/lib/cognito';

function TeamDetail() {
  const id = useSearchParams().get('id');
  const router = useRouter();
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('miembro');
  const [error, setError] = useState('');

  async function loadMembers() {
    setMembers(await apiFetch(`/teams/${id}/members`));
  }

  useEffect(() => {
    async function init() {
      const s = await getSession();
      if (!s) return router.replace('/login');
      if (!id) return setError('Falta el id del equipo');
      try {
        setTeam(await apiFetch(`/teams/${id}`));
        await loadMembers();
      } catch (err) {
        setError(err.message);
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, router]);

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    try {
      await apiFetch(`/teams/${id}/members`, {
        method: 'POST',
        body: JSON.stringify({ email, role }),
      });
      setEmail('');
      await loadMembers();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRemove(userId) {
    setError('');
    try {
      await apiFetch(`/teams/${id}/members/${userId}`, { method: 'DELETE' });
      await loadMembers();
    } catch (err) {
      setError(err.message);
    }
  }

  const isTeamAdmin = team?.role === 'admin';

  return (
    <main style={{ maxWidth: 640, margin: '40px auto', padding: 24 }}>
      <p><Link href="/teams">← Volver a mis equipos</Link></p>
      <h1>{team ? team.name : 'Equipo'}</h1>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      <h2>Miembros</h2>
      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 8 }}>
        {members.map((m) => (
          <li key={m.id} style={{ border: '1px solid #444', borderRadius: 6, padding: 12 }}>
            {m.name || m.email} <small>({m.email} · {m.role})</small>{' '}
            {isTeamAdmin && (
              <button onClick={() => handleRemove(m.id)}>Quitar</button>
            )}
          </li>
        ))}
      </ul>

      {isTeamAdmin && (
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <input
            type="email"
            placeholder="Correo del nuevo miembro"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ flex: 1 }}
          />
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="miembro">miembro</option>
            <option value="admin">admin</option>
          </select>
          <button type="submit">Agregar</button>
        </form>
      )}
    </main>
  );
}

export default function TeamPage() {
  return (
    <Suspense fallback={<p style={{ padding: 24 }}>Cargando...</p>}>
      <TeamDetail />
    </Suspense>
  );
}