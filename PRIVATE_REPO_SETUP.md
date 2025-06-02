# 🔒 Private Repository Setup für SUNA AI Platform

## Übersicht
Diese Anleitung hilft Ihnen dabei, die SUNA AI Platform als privates GitHub Repository einzurichten.

## 🚀 Schneller Setup

### Option 1: Automatisches Script
```bash
# Führe das Setup-Script aus
./setup-private-repo.sh
```

### Option 2: Manueller Setup

#### 1. Alle Änderungen committen
```bash
git add .
git commit -m "feat: Complete development environment setup"
```

#### 2. Privates Repository auf GitHub erstellen
1. Gehe zu https://github.com/new
2. **Repository name**: `suna-ai-platform` (oder gewünschter Name)
3. **Visibility**: 🔒 **Private** auswählen
4. **Initialize**: Nichts auswählen (leeres Repository)
5. **Create repository** klicken

#### 3. Remote hinzufügen und pushen
```bash
# Remote hinzufügen (ersetze YOUR_USERNAME mit deinem GitHub Username)
git remote add origin https://github.com/YOUR_USERNAME/suna-ai-platform.git

# Code pushen
git push -u origin main
```

## 🔧 CI/CD Konfiguration (Optional)

### GitHub Actions Secrets
Für erweiterte Features können Sie diese Secrets konfigurieren:

**Repository → Settings → Secrets and variables → Actions**

| Secret Name | Beschreibung | Erforderlich |
|-------------|--------------|--------------|
| `ANTHROPIC_API_KEY` | Anthropic Claude API Key | Optional |
| `OPENAI_API_KEY` | OpenAI API Key | Optional |
# | `SUPABASE_URL` | Supabase Projekt URL | Veraltet | (Datenbank-Secrets hängen von der gewählten Backend-DB ab)
# | `SUPABASE_ANON_KEY` | Supabase Anonymous Key | Veraltet |
# | `SUPABASE_SERVICE_KEY` | Supabase Service Role Key | Veraltet |
| `YOUR_DATABASE_URL` | Connection string for your chosen backend database (Beispiel) | Optional |
| `MOCK_AUTH_ENABLED` | Auf "true" setzen, falls CI im Mock-Auth-Modus laufen soll | Optional |

**Hinweis**: `GITHUB_TOKEN` wird automatisch von GitHub bereitgestellt.

### CI/CD Features
Die GitHub Actions Pipeline bietet:
- ✅ **Automatische Tests** (Backend + Frontend)
- ✅ **Code-Qualität** (Linting, Type-Checking)
- ✅ **Sicherheitscans** (Trivy, Bandit)
- ✅ **Docker Builds** (GitHub Container Registry)
- ✅ **E2E Tests** (Playwright)

## 🔐 Warum privates Repository?

### Vorteile
- **🔒 Schutz von API Keys** und sensiblen Daten
- **👥 Kontrollierter Zugriff** nur für Teammitglieder
- **🔍 Private Entwicklung** ohne öffentliche Einsicht
- **📊 GitHub Actions** kostenlos auch für private Repos

### Nachteile
- **📈 Begrenzte Collaborators** (je nach GitHub Plan)
- **🌍 Nicht open-source** sichtbar

## 🛡️ Sicherheits-Best-Practices

### Lokale Entwicklung
```bash
# .env Dateien sind bereits in .gitignore
# Niemals API Keys in Code committen
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### GitHub Repository
- ✅ Repository auf **Private** setzen
- ✅ **Branch Protection Rules** für main branch
- ✅ **Required Reviews** für Pull Requests
- ✅ **Secrets** für API Keys verwenden
- ✅ **Dependabot** für Security Updates aktivieren

## 🎯 Nächste Schritte

Nach dem Setup:

1. **Entwicklung starten**:
   ```bash
   make dev
   ```

2. **Team einladen**:
   - Repository → Settings → Manage access
   - Invite collaborators

3. **Branch Protection**:
   - Repository → Settings → Branches
   - Add rule für main branch

4. **API Keys konfigurieren**:
   - Lokale .env Dateien
   - GitHub Secrets (für CI/CD)

## 🆘 Troubleshooting

### Remote bereits existiert
```bash
# Aktueller Remote prüfen
git remote -v

# Remote ändern falls nötig
git remote set-url origin https://github.com/YOUR_USERNAME/suna-ai-platform.git
```

### Push-Probleme
```bash
# Force push falls nötig (VORSICHT!)
git push --force-with-lease origin main

# Oder neuen Branch erstellen
git checkout -b setup
git push -u origin setup
```

### CI/CD Fehler
- **Secrets fehlen**: Optional, nur für erweiterte Features
- **Tests fehlschlagen**: Lokal testen mit `make test`
- **Docker Build Fehler**: `make docker-build` lokal testen

---

**🎉 Ihr privates SUNA AI Platform Repository ist ready! 🚀**
