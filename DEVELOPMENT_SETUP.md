# SUNA Development Environment Setup

## Übersicht
Die SUNA AI Platform ist jetzt bereit für die Entwicklung! Hier ist eine Zusammenfassung des aktuellen Status und nächsten Schritte.

## ✅ Bereits erledigt

### Backend
- ✅ Poetry ist installiert und konfiguriert
- ✅ Alle Python-Abhängigkeiten sind installiert
- ✅ Virtual Environment ist eingerichtet
- ✅ Backend .env Datei ist erstellt

### Frontend  
- ✅ Node.js Abhängigkeiten sind installiert
- ✅ Frontend .env Datei ist erstellt
- ✅ Next.js ist konfiguriert

### VS Code Konfiguration
- ✅ Tasks für Entwicklung erstellt
- ✅ Debug-Konfigurationen eingerichtet
- ✅ Workspace-Einstellungen konfiguriert
- ✅ Empfohlene Erweiterungen definiert

## 🔧 Noch zu erledigende Schritte

### 1. Docker Installation (Empfohlen)
```bash
# Für macOS mit Homebrew
brew install --cask docker

# Oder Docker Desktop von docker.com herunterladen
```

### 2. Alternative: Lokale Services Installation
```bash
# Redis installieren (für Session-Management)
brew install redis

# RabbitMQ installieren (für Message Queue)
brew install rabbitmq
```

### 3. Umgebungsvariablen konfigurieren

#### Backend (.env)
Die wichtigsten Variablen, die konfiguriert werden müssen:
```env
# Für AI-Funktionalität
ANTHROPIC_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here

# Für Datenbank (Supabase oder lokal)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

#### Frontend (.env)
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## 🚀 Entwicklung starten

### Option 1: Mit Docker (Empfohlen)
```bash
# Alle Services starten
docker-compose up -d

# Logs verfolgen
docker-compose logs -f
```

### Option 2: Lokale Entwicklung
```bash
# 1. Redis starten (in eigenem Terminal)
redis-server

# 2. Backend starten (in eigenem Terminal)
cd backend
poetry run uvicorn api:app --reload --host 0.0.0.0 --port 8000

# 3. Frontend starten (in eigenem Terminal)
cd frontend
npm run dev
```

### VS Code Tasks verwenden
- **Cmd+Shift+P** → "Tasks: Run Task"
- Wähle gewünschte Task aus:
  - "Start Backend (Development)"
  - "Start Frontend (Development)"
  - "Start All Services (Docker)"

## 📱 Zugriff auf die Anwendung

Nach dem Start sind folgende URLs verfügbar:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Dokumentation**: http://localhost:8000/docs
- **RabbitMQ Management** (falls Docker): http://localhost:15672

## 🔍 Debugging

### Backend Debugging
1. F5 drücken oder "Debug Backend API" aus dem Debug-Panel starten
2. Breakpoints in Python-Code setzen

### Frontend Debugging
1. Browser Developer Tools verwenden
2. VS Code Debugger für Node.js konfigurieren

## ⚠️ Wichtige Hinweise

1. **API Keys**: Ohne gültige API Keys (OpenAI/Anthropic) funktioniert die AI-Funktionalität nicht
2. **Supabase**: Für vollständige Funktionalität ist eine Supabase-Instanz erforderlich
3. **Docker**: Für einfachste Einrichtung Docker verwenden
4. **Ports**: Stelle sicher, dass Ports 3000, 8000, 6379, 5672 verfügbar sind

## 🆘 Troubleshooting

### Port bereits belegt
```bash
# Port-Nutzung prüfen
lsof -i :3000
lsof -i :8000

# Prozess beenden
kill -9 PID
```

### Backend-Fehler
```bash
# Dependencies neu installieren
cd backend
poetry install --no-cache

# Virtual Environment neu erstellen
poetry env remove python
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

1. API Keys für OpenAI/Anthropic besorgen
2. Supabase-Projekt erstellen (optional)
3. Docker installieren (empfohlen)
4. Entwicklung beginnen!

Viel Erfolg bei der Entwicklung mit SUNA! 🚀
