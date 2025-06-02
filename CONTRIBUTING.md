# Contributing to Suna AI Platform

We love your input! We want to make contributing to Suna AI Platform as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

### Pull Request Process

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. If you've changed APIs, update the documentation
4. Ensure the test suite passes
5. Make sure your code lints
6. Issue that pull request!

## Development Setup

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ and npm
- Python 3.11+ and pip
- Git

### Backend Development

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run the development server
uvicorn api:app --reload --port 8000
```

### Frontend Development

```bash
cd frontend
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Run the development server
npm run dev
```

## Code Style Guidelines

- Follow existing code style and patterns
- Use descriptive commit messages
- Keep PRs focused on a single feature or fix

### Python (Backend)

We use the following tools for code formatting and linting:

- **Black** for code formatting
- **isort** for import sorting
- **pylint** for linting
- **mypy** for type checking

```bash
# Format code
black .
isort .

# Lint code
pylint backend/
mypy backend/
```

### TypeScript/JavaScript (Frontend)

- **ESLint** for linting
- **Prettier** for formatting

```bash
# Lint and format
npm run lint
npm run format
```

## Commit Messages

We follow the [Conventional Commits](https://conventionalcommits.org/) specification:

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation changes
- `style:` formatting, missing semi colons, etc
- `refactor:` code change that neither fixes a bug nor adds a feature
- `test:` adding missing tests
- `chore:` maintain

Examples:
```
feat: add new agent tool for web scraping
fix: resolve memory leak in docker containers
docs: update API documentation for thread endpoints
```

## Adding New Agent Tools

When creating new agent tools:

1. Extend the base `Tool` class in `backend/agentpress/tool.py`
2. Implement required methods: `execute()`, `get_schema()`
3. Add proper error handling and validation
4. Write comprehensive tests
5. Update documentation with usage examples

Example:
```python
from agentpress.tool import Tool

class MyNewTool(Tool):
    name = "my_new_tool"
    description = "Description of what this tool does"
    
    def execute(self, **kwargs):
        # Tool implementation
        pass
    
    def get_schema(self):
        return {
            "type": "object",
            "properties": {
                "param1": {"type": "string", "description": "Parameter description"}
            },
            "required": ["param1"]
        }
```

## Testing

### Running Tests

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test

# End-to-end tests
npm run test:e2e
```

## Security Guidelines

- Never commit sensitive information (API keys, passwords, etc.)
- Use environment variables for configuration
- Validate all user inputs
- Follow principle of least privilege for Docker containers
- Keep dependencies up to date

## Getting Help

- Check existing issues and discussions
- Read the documentation thoroughly
- Provide detailed information when asking for help

## License

By contributing, you agree that your contributions will be licensed under the Apache License 2.0.
