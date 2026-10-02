# Pal (v1)

A fast, lightweight web application for sharing text, links, and files instantly across devices without accounts.

## Features (Version 1)
- **Instant Pairing:** Generate a 6-character code or QR code on your PC, and scan/enter it on your phone to instantly pair devices. Pairing codes expire after 5 minutes for security.
- **Direct Device-to-Device Transfer:** Pal uses WebRTC DataChannels, meaning your files and text are transferred directly between your devices peer-to-peer. The server only acts as a signaling relay and never stores your data.
- **File & Text Sharing:** Send text and links with instant copy buttons, or attach files to send back and forth with real-time progress indicators.
- **Installable PWA:** Pal can be installed to your device's home screen or desktop as a Progressive Web App for a native-like experience.

## Roadmap

### v1.1
- **Better Errors:** Clear messages for common problems like "Code expired", "Wrong code", and connection issues.
- **Dark Mode:** Support for device settings via CSS `prefers-color-scheme`.
- **Device Names:** Display friendly device names (e.g., "Jarom's Phone") instead of generic statuses.
- **Clipboard Sync Button:** A manual "Send my clipboard" button to easily transfer clipboard contents.
- **Multiple Files:** Select or drop several files to send sequentially with individual progress tracking.
- **Auto-reconnect:** Automatically attempt to reconnect if the connection drops due to screen locks or network blips.

### Future Versions
- **v1.2:** Remember paired devices to avoid re-scanning each time.
- **v1.3:** Connect across different networks using a TURN server.
- **v2.0:** Android companion app for notifications.

## Tech Stack
- **Backend:** Spring Boot (Java 21) handling REST API pairing and raw WebSocket signaling.
- **Frontend:** Vite SPA (Vanilla JS) using WebRTC for peer-to-peer data transfers.
- **QR Codes:** Generated securely on the browser using `qrcode.js`.

## How to Run Locally

### 1. Run the Backend
Requires Java 21 and Maven.
```bash
cd backend
mvn spring-boot:run
```

### 2. Run the Frontend
Requires Node.js and NPM.
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser. To test pairing, open the app on two different devices on the same network (e.g., your PC and your phone navigating to your PC's local IP).
