import * as webrtc from '../services/webrtc.js';
import * as fileTransfer from '../services/fileTransfer.js';

export function renderSession() {
  const container = document.createElement('div');
  container.className = 'view active';
  container.style.height = '100%';
  
  container.innerHTML = `
    <div id="history-panel" class="history-panel"></div>
    <div class="chat-input card" style="margin-bottom:0;">
      <input type="file" id="file-input" style="display:none" multiple>
      <button id="btn-attach" class="secondary" style="width:50px; padding: 14px 0;" title="Attach File">📎</button>
      <button id="btn-clipboard" class="secondary" style="width:50px; padding: 14px 0;" title="Send Clipboard">📋</button>
      <input type="text" id="text-input" placeholder="Type a message or paste a link..." autocomplete="off">
      <button id="btn-send" style="width:80px;">Send</button>
    </div>
  `;

  const historyPanel = container.querySelector('#history-panel');
  const textInput = container.querySelector('#text-input');
  const fileInput = container.querySelector('#file-input');
  const btnSend = container.querySelector('#btn-send');
  const btnAttach = container.querySelector('#btn-attach');
  const btnClipboard = container.querySelector('#btn-clipboard');

  // Helper: Append to history
  function appendHistory(html, isSent) {
    const div = document.createElement('div');
    div.className = `history-item ${isSent ? 'sent' : 'received'}`;
    div.innerHTML = html;
    historyPanel.appendChild(div);
    historyPanel.scrollTop = historyPanel.scrollHeight;
    return div;
  }

  // Handle sending text
  function sendText() {
    const text = textInput.value.trim();
    if (!text) return;
    
    const msg = { type: 'text', content: text };
    if (webrtc.sendData(JSON.stringify(msg))) {
      appendHistory(`<div>${escapeHTML(text)}</div>`, true);
      textInput.value = '';
    }
  }

  btnSend.addEventListener('click', sendText);
  textInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendText();
  });

  // Handle sending files
  btnAttach.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    if (fileInput.files.length === 0) return;
    for (const file of fileInput.files) {
      await sendSingleFile(file);
    }
    fileInput.value = '';
  });

  async function sendSingleFile(file) {
    const id = crypto.randomUUID();
    const item = appendHistory(`
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>📄 ${escapeHTML(file.name)} <br><small>${formatBytes(file.size)}</small></div>
        <div id="prog-${id}">0%</div>
      </div>
    `, true);

    await fileTransfer.sendFile(file, id);
    item.querySelector(`#prog-${id}`).textContent = 'Sent ✓';
  }

  // Handle Clipboard
  btnClipboard.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;
      const msg = { type: 'text', content: text };
      if (webrtc.sendData(JSON.stringify(msg))) {
        appendHistory(`<div>📋 ${escapeHTML(text)}</div>`, true);
      }
    } catch (err) {
      alert('Could not read clipboard. Please make sure you have granted permission.');
    }
  });

  // Drag and drop for files
  container.addEventListener('dragover', (e) => e.preventDefault());
  container.addEventListener('drop', async (e) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      for (const file of e.dataTransfer.files) {
        await sendSingleFile(file);
      }
    }
  });

  // Handle receiving data
  webrtc.onMessageReceived = (data) => {
    const textMsg = fileTransfer.handleIncomingData(data);
    if (textMsg) {
      const msg = JSON.parse(textMsg);
      if (msg.type === 'text') {
        const content = detectAndLinkify(escapeHTML(msg.content));
        appendHistory(`
          <div>${content}</div>
          <button class="btn secondary" style="padding: 4px 8px; font-size:12px; margin-top:8px; width:auto;" onclick="navigator.clipboard.writeText('${escapeQuotes(msg.content)}')">Copy</button>
        `, false);
      }
    }
  };

  // Handle incoming file progress
  fileTransfer.onFileProgress = (id, received, total, name) => {
    let el = document.getElementById(`file-${id}`);
    if (!el && name) {
      el = appendHistory(`
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>📄 ${escapeHTML(name)} <br><small>${formatBytes(total)}</small></div>
          <div id="prog-${id}">0%</div>
        </div>
        <div id="dl-${id}"></div>
      `, false);
      el.id = `file-${id}`;
    }
    
    const progEl = document.getElementById(`prog-${id}`);
    if (progEl) {
      const percent = Math.round((received / total) * 100);
      progEl.textContent = `${percent}%`;
    }
  };

  // Handle incoming file complete
  fileTransfer.onFileComplete = (id, name, url) => {
    const progEl = document.getElementById(`prog-${id}`);
    if (progEl) progEl.textContent = 'Received ✓';
    
    const dlEl = document.getElementById(`dl-${id}`);
    if (dlEl) {
      dlEl.innerHTML = `<a href="${url}" download="${escapeHTML(name)}" class="btn" style="padding: 8px 12px; margin-top: 8px; font-size:14px;">Download</a>`;
    }
  };

  return container;
}

// Utils
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag])
  );
}

function escapeQuotes(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function detectAndLinkify(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(urlRegex, url => `<a href="${url}" target="_blank" style="color:var(--primary);">${url}</a>`);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
