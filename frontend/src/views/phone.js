import { joinSession } from '../services/api.js';
import { setupConnection } from '../services/webrtc.js';

export function renderPhone() {
  const container = document.createElement('div');
  container.className = 'text-center';
  
  // Extract code from URL if scanned via QR
  const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
  const codeFromUrl = urlParams.get('code') || '';

  container.innerHTML = `
    <h1>Connect to PC</h1>
    <p>Enter the 6-character code shown on your PC.</p>
    <div class="card">
      <input type="text" id="code-input" placeholder="e.g. A1B2C3" value="${codeFromUrl}" maxlength="6" style="text-transform: uppercase; text-align: center; letter-spacing: 2px; font-size: 24px;">
      <button id="btn-join">Join Session</button>
    </div>
  `;

  setTimeout(() => {
    const btn = container.querySelector('#btn-join');
    const input = container.querySelector('#code-input');

    const handleJoin = async () => {
      const code = input.value.trim().toUpperCase();
      if (code.length !== 6) {
        alert('Please enter a 6-character code');
        return;
      }
      
      btn.disabled = true;
      btn.textContent = 'Connecting...';
      
      try {
        const { sessionId } = await joinSession(code);
        setupConnection(sessionId, false); // false = not initiator (answers)
      } catch (e) {
        let errDiv = container.querySelector('#error-msg');
        if (!errDiv) {
          errDiv = document.createElement('div');
          errDiv.id = 'error-msg';
          errDiv.style.color = 'var(--error)';
          errDiv.style.marginTop = '12px';
          container.querySelector('.card').appendChild(errDiv);
        }
        errDiv.textContent = e.message;
        btn.disabled = false;
        btn.textContent = 'Join Session';
      }
    };

    btn.addEventListener('click', handleJoin);
    
    // Auto-join if code was in URL
    if (codeFromUrl.length === 6) {
      handleJoin();
    }
  }, 0);

  return container;
}
