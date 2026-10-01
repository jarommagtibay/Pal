const BASE_URL = '/api/pair';

export async function createSession() {
  const res = await fetch(`${BASE_URL}/create`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to create session');
  return res.json();
}

export async function joinSession(code) {
  const res = await fetch(`${BASE_URL}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  });
  if (!res.ok) throw new Error('Invalid or expired code');
  return res.json();
}
