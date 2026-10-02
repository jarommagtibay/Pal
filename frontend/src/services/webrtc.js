import { SignalSocket } from './websocket.js';
import { navigate } from '../router.js';

let peerConnection = null;
let dataChannel = null;
let signalSocket = null;

// Global event handlers to be attached by the session view
export let onMessageReceived = null;
export let onDataChannelOpen = null;
export let onDataChannelClose = null;

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
};

let currentSessionId = null;
let currentIsInitiator = false;
let reconnectAttempts = 0;
let isReconnecting = false;
const MAX_RECONNECT = 5;

export function setupConnection(sessionId, isInitiator, isReconnect = false) {
  currentSessionId = sessionId;
  currentIsInitiator = isInitiator;
  
  if (isReconnect) {
    updateStatus('Reconnecting...', 'warning');
    isReconnecting = true;
  } else {
    updateStatus('Connecting...', 'connecting');
    reconnectAttempts = 0;
    isReconnecting = false;
  }
  
  peerConnection = new RTCPeerConnection(ICE_SERVERS);
  
  // Create signal socket
  signalSocket = new SignalSocket(sessionId, async (msg) => {
    switch (msg.type) {
      case 'PEER_JOINED':
        if (isInitiator) {
          createOffer();
        }
        break;
      case 'OFFER':
        if (!isInitiator) {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(msg.offer));
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          signalSocket.send({ type: 'ANSWER', answer });
        }
        break;
      case 'ANSWER':
        if (isInitiator) {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(msg.answer));
        }
        break;
      case 'ICE_CANDIDATE':
        if (msg.candidate) {
          await peerConnection.addIceCandidate(new RTCIceCandidate(msg.candidate));
        }
        break;
      case 'PEER_LEFT':
        handleDisconnect();
        break;
    }
  });

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      signalSocket.send({ type: 'ICE_CANDIDATE', candidate: event.candidate });
    }
  };

  peerConnection.oniceconnectionstatechange = () => {
    if (peerConnection.iceConnectionState === 'failed') {
      updateStatus("Devices couldn't connect. Try the same Wi-Fi.", 'disconnected');
      if (onDataChannelClose) onDataChannelClose();
    }
  };

  if (isInitiator) {
    dataChannel = peerConnection.createDataChannel('pal-transfer');
    setupDataChannel();
  } else {
    peerConnection.ondatachannel = (event) => {
      dataChannel = event.channel;
      setupDataChannel();
    };
  }
}

async function createOffer() {
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  signalSocket.send({ type: 'OFFER', offer });
}

function getDeviceName() {
  let name = localStorage.getItem('pal_device_name');
  if (!name) {
    const isMobile = /Mobile|Android|iP(ad|hone)/i.test(navigator.userAgent);
    name = isMobile ? 'Phone' : 'PC';
    localStorage.setItem('pal_device_name', name);
  }
  return name;
}

export function updateDeviceName(newName) {
  localStorage.setItem('pal_device_name', newName);
  if (dataChannel && dataChannel.readyState === 'open') {
    dataChannel.send(JSON.stringify({ type: 'DEVICE_INFO', name: newName }));
  }
}

function setupDataChannel() {
  dataChannel.binaryType = 'arraybuffer';
  
  dataChannel.onopen = () => {
    reconnectAttempts = 0;
    isReconnecting = false;
    updateStatus('Connected ✓', 'connected');
    dataChannel.send(JSON.stringify({ type: 'DEVICE_INFO', name: getDeviceName() }));
    navigate('/session');
    if (onDataChannelOpen) onDataChannelOpen();
  };
  
  dataChannel.onclose = () => {
    handleDisconnect();
  };
  
  dataChannel.onmessage = (event) => {
    if (typeof event.data === 'string') {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'DEVICE_INFO') {
          updateStatus('Connected to ' + msg.name, 'connected');
          return;
        }
      } catch (e) {}
    }
    if (onMessageReceived) onMessageReceived(event.data);
  };
}

function handleDisconnect() {
  if (reconnectAttempts < MAX_RECONNECT) {
    reconnectAttempts++;
    cleanup();
    setTimeout(() => {
      setupConnection(currentSessionId, currentIsInitiator, true);
    }, 2000);
  } else {
    updateStatus('Disconnected ✗', 'disconnected');
    if (onDataChannelClose) onDataChannelClose();
    cleanup();
  }
}

export function sendData(data) {
  if (dataChannel && dataChannel.readyState === 'open') {
    dataChannel.send(data);
    return true;
  }
  return false;
}

export function cleanup() {
  if (dataChannel) {
    dataChannel.close();
    dataChannel = null;
  }
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  if (signalSocket) {
    signalSocket.close();
    signalSocket = null;
  }
}

function updateStatus(text, className) {
  const bar = document.getElementById('status-bar');
  const textEl = document.getElementById('status-text');
  if (bar && textEl) {
    bar.className = `status-bar ${className}`;
    textEl.textContent = text;
  }
}
