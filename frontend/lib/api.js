import { getSession } from './cognito';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Llama a la API de Jose enviando el ID token de Cognito
export async function apiFetch(path, options = {}) {
  const session = await getSession();
  if (!session) throw new Error('Sesión expirada');

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.idToken}`,
      ...(options.headers || {}),
    },
  });

  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}