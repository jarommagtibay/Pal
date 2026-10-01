import { navigate } from '../router.js';

export function renderLanding() {
  const container = document.createElement('div');
  container.className = 'text-center';
  container.innerHTML = `
    <h1>Welcome to Pal</h1>
    <p>Share text, links, and files instantly across devices.</p>
    <div class="card">
      <h2>How do you want to connect?</h2>
      <button id="btn-pc" style="margin-bottom: 12px;">This is my PC (Show QR Code)</button>
      <button id="btn-phone" class="secondary">This is my Phone (Scan/Enter Code)</button>
    </div>
  `;

  container.querySelector('#btn-pc').addEventListener('click', () => navigate('/pc'));
  container.querySelector('#btn-phone').addEventListener('click', () => navigate('/phone'));

  return container;
}
