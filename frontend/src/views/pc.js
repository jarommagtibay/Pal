import { createSession } from '../services/api.js';
import { setupConnection } from '../services/webrtc.js';
import QRCode from 'qrcode';

export function renderPc() {
  const container = document.createElement('div');
  container.className = 'text-center';
  container.innerHTML = `
    <h1>Pair with Phone</h1>
    <p>Scan the QR code or enter the code on your phone.</p>
    <div class="card">
      <div id="qr-container">
        <canvas id="qr-canvas"></canvas>
      </div>
      <div id="pairing-code">...</div>
    </div>
  `;

  setTimeout(async () => {
    try {
      const { sessionId, code } = await createSession();
      container.querySelector('#pairing-code').textContent = code;
      
      const phoneUrl = `${window.location.origin}/#/phone?code=${code}`;
      const canvas = container.querySelector('#qr-canvas');
      await QRCode.toCanvas(canvas, phoneUrl, { width: 250, margin: 2 });

      setupConnection(sessionId, true); // true = initiator
    } catch (e) {
      console.error(e);
      alert('Failed to generate pairing code. Please refresh.');
    }
  }, 0);

  return container;
}
