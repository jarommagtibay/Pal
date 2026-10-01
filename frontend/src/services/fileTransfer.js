import { sendData } from './webrtc.js';

const CHUNK_SIZE = 64 * 1024; // 64 KB

// Store incoming file chunks
const receivingFiles = new Map();

// Global callback for UI updates
export let onFileProgress = null; 
export let onFileComplete = null;

export async function sendFile(file, id) {
  // 1. Announce file
  const meta = {
    type: 'file-meta',
    id,
    name: file.name,
    size: file.size,
    mime: file.type
  };
  sendData(JSON.stringify(meta));

  // 2. Send chunks
  let offset = 0;
  while (offset < file.size) {
    const chunk = file.slice(offset, offset + CHUNK_SIZE);
    const buffer = await chunk.arrayBuffer();
    
    // Header for chunk: ID (36 bytes for UUID) + binary data
    // To keep it simple, we wrap binary in an ArrayBuffer where first 36 bytes are ID string
    const encoder = new TextEncoder();
    const idBytes = encoder.encode(id.padEnd(36, ' '));
    
    const combined = new Uint8Array(idBytes.length + buffer.byteLength);
    combined.set(idBytes, 0);
    combined.set(new Uint8Array(buffer), idBytes.length);
    
    sendData(combined.buffer);
    
    offset += chunk.size;
    
    if (onFileProgress) {
      onFileProgress(id, offset, file.size);
    }
  }

  // 3. Complete
  sendData(JSON.stringify({ type: 'file-complete', id }));
}

export function handleIncomingData(data) {
  if (typeof data === 'string') {
    const msg = JSON.parse(data);
    
    if (msg.type === 'file-meta') {
      receivingFiles.set(msg.id, {
        meta: msg,
        chunks: [],
        receivedBytes: 0
      });
      if (onFileProgress) onFileProgress(msg.id, 0, msg.size, msg.name);
    } 
    else if (msg.type === 'file-complete') {
      const fileData = receivingFiles.get(msg.id);
      if (fileData) {
        const blob = new Blob(fileData.chunks, { type: fileData.meta.mime });
        const url = URL.createObjectURL(blob);
        if (onFileComplete) onFileComplete(msg.id, fileData.meta.name, url);
        receivingFiles.delete(msg.id);
      }
    }
    else {
      // It's a text message, handled in session.js
      return data;
    }
  } else {
    // ArrayBuffer = chunk
    const decoder = new TextDecoder();
    const idBytes = new Uint8Array(data.slice(0, 36));
    const id = decoder.decode(idBytes).trim();
    
    const fileData = receivingFiles.get(id);
    if (fileData) {
      const chunk = data.slice(36);
      fileData.chunks.push(chunk);
      fileData.receivedBytes += chunk.byteLength;
      if (onFileProgress) onFileProgress(id, fileData.receivedBytes, fileData.meta.size);
    }
  }
  return null;
}
