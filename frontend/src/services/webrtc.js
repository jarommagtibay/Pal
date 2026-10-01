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

export function setupConnection(sessionId, isInitiator) {
  updateStatus('Connecting...', 'connecting');
  
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

function setupDataChannel() {
  dataChannel.binaryType = 'arraybuffer';
  
  dataChannel.onopen = () => {
    updateStatus('Connected ✓', 'connected');
    navigate('/session');
    if (onDataChannelOpen) onDataChannelOpen();
  };
  
  dataChannel.onclose = () => {
    handleDisconnect();
  };
  
  dataChannel.onmessage = (event) => {
    if (onMessageReceived) onMessageReceived(event.data);
  };
}

function handleDisconnect() {
  updateStatus('Disconnected ✗', 'disconnected');
  if (onDataChannelClose) onDataChannelClose();
  cleanup();
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
