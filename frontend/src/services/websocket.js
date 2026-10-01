export class SignalSocket {
  constructor(sessionId, onMessage, onOpen, onClose) {
    this.sessionId = sessionId;
    this.onMessage = onMessage;
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // If dev server proxy is used, this works. For prod, might need full host.
    const wsUrl = `${protocol}//${window.location.host}/ws/signal`;
    
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      this.send({ type: 'JOIN', sessionId });
      if (onOpen) onOpen();
    };
    
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (this.onMessage) this.onMessage(data);
      } catch (e) {
        console.error('Failed to parse signal message', e);
      }
    };
    
    this.ws.onclose = () => {
      if (onClose) onClose();
    };
  }

  send(data) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  close() {
    this.ws.close();
  }
}
