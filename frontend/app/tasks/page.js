'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { getSession } from '@/lib/cognito';

const STATUSES = ['pendiente', 'en_progreso', 'completada'];

function Tasks() {
  const teamId = useSearchParams().get('team');
  const router = useRouter();
  const [team, setTeam] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');

  async function loadTasks(status = filter) {
    const query = status ? `?status=${status}` : '';
    setTasks(await apiFetch(`/teams/${teamId}/tasks${query}`));
  }

  useEffect(() => {
    async function init() {
      const s = await getSession();
      if (!s) return router.replace('/login');
      if (!teamId) return setError('Falta el id del equipo');
      try {
        setTeam(await apiFetch(`/teams/${teamId}`));
        await loadTasks('');
      } catch (err) {
        setError(err.message);
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, router]);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    try {
      await apiFetch(`/teams/${teamId}/tasks`, {
        method: 'POST',
        body: JSON.stringify({ title, description }),
      });
      setTitle('');
      setDescription('');
      await loadTasks();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleStatus(taskId, status) {
    setError('');
    try {
      await apiFetch(`/teams/${teamId}/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      await loadTasks();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(taskId) {
    setError('');
    try {
      await apiFetch(`/teams/${teamId}/tasks/${taskId}`, { method: 'DELETE' });
      await loadTasks();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleFilter(value) {
    setFilter(value);
    try {
      await loadTasks(value);
    } catch (err) {
      setError(err.message);
    }
  }

  const isTeamAdmin = team?.role === 'admin';

  return (
    <main style={{ maxWidth: 720, margin: '40px auto', padding: 24 }}>
      <p>
        <Link href="/teams">← Mis equipos</Link>{' '}
        <Link href={`/team?id=${teamId}`}>Miembros</Link>
      </p>
      <h1>Tareas {team ? `de ${team.name}` : ''}</h1>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      <form onSubmit={handleCreate} style={{ display: 'grid', gap: 8, margin: '16px 0' }}>
        <input
          placeholder="Título de la tarea"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <input
          placeholder="Descripción (opcional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button type="submit">Crear tarea</button>
      </form>

      <label>
        Filtrar:{' '}
        <select value={filter} onChange={(e) => handleFilter(e.target.value)}>
          <option value="">todas</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </label>

      {tasks.length === 0 && <p>No hay tareas.</p>}

      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 8, marginTop: 16 }}>
        {tasks.map((t) => (
          <li key={t.id} style={{ border: '1px solid #444', borderRadius: 6, padding: 12 }}>
            <strong>{t.title}</strong>
            {t.description && <p style={{ margin: '4px 0' }}>{t.description}</p>}
            <select value={t.status} onChange={(e) => handleStatus(t.id, e.target.value)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>{' '}
            {isTeamAdmin && (
              <button onClick={() => handleDelete(t.id)}>Eliminar</button>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={<p style={{ padding: 24 }}>Cargando...</p>}>
      <Tasks />
    </Suspense>
  );
}
