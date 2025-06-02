# SUNA Entwicklungsumgebung Setup

## Übersicht
Willkommen bei der SUNA AI Plattform Entwicklung! Dieses Dokument beschreibt, wie du deine lokale Entwicklungsumgebung einrichtest.

## ✅ Bereits erledigt (Grundlegende Projektstruktur)

### Backend
- ✅ Poetry ist installiert und konfiguriert
- ✅ Alle Python-Abhängigkeiten sind installiert (Supabase-SDK wurde entfernt)
- ✅ Virtual Environment ist eingerichtet
- ✅ Backend `.env` Datei ist als `.env.example` vorhanden

### Frontend  
- ✅ Node.js Abhängigkeiten sind installiert (Supabase-Bibliotheken wurden entfernt)
- ✅ Frontend `.env` Datei ist als `.env.example` vorhanden
- ✅ Next.js ist konfiguriert

### VS Code Konfiguration
- ✅ Tasks für Entwicklung erstellt
- ✅ Debug-Konfigurationen eingerichtet
- ✅ Workspace-Einstellungen konfiguriert
- ✅ Empfohlene Erweiterungen definiert

## 🔧 Benötigte Schritte für die lokale Entwicklung

### 1. Docker Installation (Empfohlen für Redis & RabbitMQ)
Wenn du Redis und RabbitMQ nicht lokal installieren möchtest, ist Docker der einfachste Weg.
```bash
# Für macOS mit Homebrew
brew install --cask docker

# Oder Docker Desktop von docker.com herunterladen
```

### 2. Alternative: Lokale Services Installation (Redis & RabbitMQ)
Falls du Docker nicht verwenden möchtest, kannst du diese Services lokal installieren:
```bash
# Redis installieren (für Caching und bestimmte Backend-Features)
brew install redis

# RabbitMQ installieren (für asynchrone Tasks, falls genutzt)
brew install rabbitmq
```

### 3. Umgebungsvariablen konfigurieren

#### Backend (`backend/.env`)
Kopiere `backend/.env.example` zu `backend/.env` und konfiguriere die folgenden Variablen:
```env
# Environment Mode (sollte für lokale Entwicklung auf "local" stehen)
ENV_MODE=local

# Aktiviere Mock-Authentifizierung für lokale Entwicklung
# Setze auf "true", um das Supabase-basierte Authentifizierungssystem zu umgehen
# und einen Mock-Benutzer für API-Anfragen zu verwenden.
MOCK_AUTH_ENABLED=true

# Für AI-Funktionalität (essenziell)
ANTHROPIC_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
MODEL_TO_USE= # z.B. anthropic/claude-3-7-sonnet-latest oder openai/gpt-4o-mini

# Redis (falls lokal oder anders als Docker-Default)
REDIS_HOST=localhost # Anpassen, falls nötig
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_SSL=false

# RabbitMQ (falls lokal oder anders als Docker-Default)
RABBITMQ_HOST=localhost # Anpassen, falls nötig
RABBITMQ_PORT=5672

# Andere API Keys nach Bedarf (Tavily, Firecrawl, etc.)
TAVILY_API_KEY=
FIRECRAWL_API_KEY=
# ...
```
**Hinweis:** Die Supabase-spezifischen Umgebungsvariablen (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) werden für die lokale Entwicklung mit Mock-Authentifizierung nicht mehr benötigt.

#### Frontend (`frontend/.env`)
Kopiere `frontend/.env.example` zu `frontend/.env` und konfiguriere:
```env
NEXT_PUBLIC_ENV_MODE="LOCAL" # production, staging oder LOCAL
NEXT_PUBLIC_BACKEND_URL="http://localhost:8000" # URL deines lokalen Backends
NEXT_PUBLIC_URL="http://localhost:3000" # URL deines lokalen Frontends

# Für AI-Funktionalität, falls direkt vom Frontend genutzt (OpenAI wird typischerweise vom Backend gehandhabt)
OPENAI_API_KEY=your_openai_key_if_needed_frontend
# NEXT_PUBLIC_GOOGLE_CLIENT_ID wird für Google Sign-In nicht mehr benötigt
```
**Hinweis:** Die `NEXT_PUBLIC_SUPABASE_URL` und `NEXT_PUBLIC_SUPABASE_ANON_KEY` werden nicht mehr benötigt.

## 🚀 Entwicklung starten

### Option 1: Mit Docker (Empfohlen für Redis/RabbitMQ)
```bash
# Alle Services (Redis, RabbitMQ) starten
docker-compose up -d redis rabbitmq # Beispiel, passe dies an deine docker-compose.yml an

# Backend starten (in eigenem Terminal)
cd backend
poetry run uvicorn api:app --reload --host 0.0.0.0 --port 8000

# Frontend starten (in eigenem Terminal)
cd frontend
npm run dev
```

### Option 2: Lokale Entwicklung (Services manuell starten)
```bash
# 1. Redis starten (falls lokal installiert, in eigenem Terminal)
redis-server

# 2. RabbitMQ starten (falls lokal installiert, in eigenem Terminal)
# Befehl variiert je nach Installation, z.B. brew services start rabbitmq

# 3. Backend starten (in eigenem Terminal)
cd backend
poetry run uvicorn api:app --reload --host 0.0.0.0 --port 8000

# 4. Frontend starten (in eigenem Terminal)
cd frontend
npm run dev
```

### VS Code Tasks verwenden
- **Cmd+Shift+P** → "Tasks: Run Task"
- Wähle gewünschte Task aus (Pfade und Befehle in `tasks.json` müssen ggf. angepasst werden):
  - "Start Backend (Development)"
  - "Start Frontend (Development)"

## 💻 Lokales Authentifizierungs- und Datensystem

Für die lokale Entwicklung verwendet SUNA jetzt ein Mock-Authentifizierungssystem und RxDB für das Datenmanagement im Frontend:

*   **Mock-Authentifizierung**:
    *   Das Frontend verwendet `frontend/src/lib/auth.ts` für die Benutzerauthentifizierung. Es wird kein Supabase-Login benötigt.
    *   Um dich als **normaler Mock-Benutzer** anzumelden, verwende eine beliebige E-Mail/Passwort-Kombination auf der Login-Seite.
    *   Um dich als **Admin Mock-Benutzer** anzumelden, verwende eine E-Mail, die dem Muster `admin@example.com` entspricht (oder eine andere konfigurierte Admin-E-Mail). Admins haben vollen Zugriff auf alle Features im lokalen Modus.
    *   Das Backend verwendet die Umgebungsvariable `MOCK_AUTH_ENABLED=true`, um die Supabase JWT-Validierung zu umgehen und stattdessen eine feste `MOCK_USER_ID` (definiert in `backend/utils/auth_utils.py`) für authentifizierte Anfragen zu nutzen. Diese ID wird für Admin-Funktionen im Backend als Admin erkannt.

*   **RxDB im Frontend**:
    *   Das Frontend nutzt RxDB als lokale In-Browser-Datenbank, um Daten wie Projekte, Threads, Nachrichten und lokale Einstellungen zu speichern.
    *   Die Daten sind persistent, solange der Browser-Speicher nicht gelöscht wird.

*   **Admin-Einstellungen (Lokal)**:
    *   Eine einfache Admin-Seite ist unter `/admin/settings` im Dashboard verfügbar (nach Anmeldung als Admin).
    *   Hier können lokale Konfigurationen, die in RxDB gespeichert sind, eingesehen und bearbeitet werden.

## 📱 Zugriff auf die Anwendung

Nach dem Start sind folgende URLs verfügbar:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Dokumentation**: http://localhost:8000/docs
- **RabbitMQ Management** (falls via Docker gestartet): http://localhost:15672 (Standard-Credentials: guest/guest)

## 🔍 Debugging

### Backend Debugging
1. F5 drücken oder "Debug Backend API" aus dem Debug-Panel in VS Code starten.
2. Breakpoints in Python-Code setzen.

### Frontend Debugging
1. Browser Developer Tools verwenden.
2. VS Code Debugger für Node.js verwenden (Launch-Konfiguration "Next.js: debug client-side").

## ⚠️ Wichtige Hinweise

1.  **API Keys**: Ohne gültige API Keys (OpenAI/Anthropic, etc. in `backend/.env`) funktioniert die Kern-AI-Funktionalität nicht.
2.  **Mock-System**: Die lokale Entwicklungsumgebung ist für schnelles Prototyping und UI-Entwicklung gedacht. Das Datenmodell in RxDB und die Mock-Antworten des Backends sind Vereinfachungen des Produktionssystems.
3.  **Docker**: Für einfachste Einrichtung von externen Services wie Redis/RabbitMQ wird Docker empfohlen.
4.  **Ports**: Stelle sicher, dass Ports 3000, 8000 (und ggf. Redis 6379, RabbitMQ 5672) verfügbar sind.

## 🆘 Troubleshooting

(Dieser Abschnitt bleibt größtenteils gleich, aber Supabase-spezifische Fehlerbehebungen sind entfernt)

### Port bereits belegt
```bash
# Port-Nutzung prüfen
lsof -i :3000 # Für Frontend
lsof -i :8000 # Für Backend

# Prozess beenden (ersetze PID mit der Prozess-ID)
kill -9 PID
```

### Backend-Fehler
```bash
# Dependencies neu installieren
cd backend
poetry install --no-cache

# Virtual Environment neu erstellen (falls notwendig)
poetry env remove python # Oder den spezifischen Namen des venv
poetry install
```

### Frontend-Fehler
```bash
# Node modules neu installieren
cd frontend
rm -rf node_modules package-lock.json
npm install
```

## 📚 Nächste Schritte

1.  Notwendige API Keys für AI-Provider in `backend/.env` eintragen.
2.  Docker installieren oder lokale Services (Redis, RabbitMQ) einrichten, falls benötigt.
3.  Entwicklung starten!

Viel Erfolg bei der Entwicklung mit SUNA! 🚀
