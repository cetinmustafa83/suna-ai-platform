#!/bin/bash

# =====================================================================================
# IMPORTANT NOTE: This script is currently outdated.
# The Suna AI Platform has removed Supabase as a direct dependency for local
# development, opting for a local mock authentication system and RxDB for frontend data.
# This script requires a complete rewrite to reflect the new setup procedures,
# which will involve configuring a chosen backend database and other services manually
# or via a new setup mechanism.
# =====================================================================================

# SUNA AI Platform - Private GitHub Repository Setup
# Dieses Script richtet das Repository als privates GitHub Repository ein

set -e

echo "🔒 Setting up SUNA AI Platform as Private GitHub Repository"
echo "==========================================================="

# Repository-Name
REPO_NAME="suna-ai-platform"
GITHUB_USERNAME="$(git config user.name || echo 'your-username')"

echo "📋 Repository Information:"
echo "  Name: $REPO_NAME"
echo "  GitHub User: $GITHUB_USERNAME"
echo "  Visibility: Private"
echo ""

# 1. Staging aller Änderungen
echo "📦 Staging all changes..."
git add .

# 2. Commit der Entwicklungsumgebung
echo "💾 Committing development environment setup..."
git commit -m "feat: Complete development environment setup

- ✅ Backend: Poetry + FastAPI + all dependencies installed
- ✅ Frontend: Next.js + React + all dependencies installed  
- ✅ VS Code: Tasks, debug configs, workspace settings
- ✅ Docker: Production-ready compose configuration
- ✅ CI/CD: GitHub Actions workflow for private repository
- ✅ Documentation: Setup guides and development docs

Ready for AI agent development! 🚀" || echo "No changes to commit"

# 3. Prüfen ob Remote existiert
if git remote get-url origin >/dev/null 2>&1; then
    echo "🔗 Remote 'origin' already exists"
    REMOTE_URL=$(git remote get-url origin)
    echo "   Current remote: $REMOTE_URL"
    
    # Push zu existierendem Remote
    echo "⬆️  Pushing to existing remote..."
    git push origin main
else
    echo "❌ No remote 'origin' found"
    echo ""
    echo "🚀 To set up a new private GitHub repository:"
    echo ""
    echo "1. Create a new PRIVATE repository on GitHub:"
    echo "   https://github.com/new"
    echo "   📝 Repository name: $REPO_NAME"
    echo "   🔒 Visibility: Private"
    echo "   ✅ Initialize with: Nothing (empty repository)"
    echo ""
    echo "2. Add the remote and push:"
    echo "   git remote add origin https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"
    echo "   git push -u origin main"
    echo ""
    echo "3. Or run this command after creating the repository:"
    echo "   git remote add origin https://github.com/$GITHUB_USERNAME/$REPO_NAME.git && git push -u origin main"
fi

echo ""
echo "🔐 GitHub Actions Secrets Setup"
echo "================================"
echo ""
echo "For the CI/CD pipeline to work, configure these secrets in your repository:"
echo "Go to: https://github.com/$GITHUB_USERNAME/$REPO_NAME/settings/secrets/actions"
echo ""
echo "Optional Secrets (for enhanced features):"
echo "  ANTHROPIC_API_KEY       - For Anthropic Claude API"
echo "  OPENAI_API_KEY         - For OpenAI API"
echo "  SUPABASE_URL           - For database connection"
echo "  SUPABASE_ANON_KEY      - For Supabase authentication"
echo "  SUPABASE_SERVICE_KEY   - For Supabase admin operations"
echo ""
echo "Note: GITHUB_TOKEN is automatically provided by GitHub Actions"

echo ""
echo "✅ Repository setup complete!"
echo ""
echo "📱 Next steps:"
echo "  1. Create private GitHub repository if not done yet"
echo "  2. Push code: git push origin main"  
echo "  3. Configure GitHub Actions secrets (optional)"
echo "  4. Start developing: make dev"
echo ""
echo "🌟 Your SUNA AI Platform is ready for private development!"
