import { renderLanding } from './views/landing.js';
import { renderPc } from './views/pc.js';
import { renderPhone } from './views/phone.js';
import { renderSession } from './views/session.js';

const routes = {
  '/': renderLanding,
  '/pc': renderPc,
  '/phone': renderPhone,
  '/session': renderSession
};

export function initRouter() {
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}

export function navigate(path) {
  window.location.hash = path;
}

function handleRoute() {
  const path = window.location.hash.slice(1) || '/';
  const rawPath = path.split('?')[0]; // strip query params
  
  const container = document.getElementById('router-view');
  container.innerHTML = '';
  
  const renderFn = routes[rawPath] || routes['/'];
  container.appendChild(renderFn());
}
