# Contributing to TY Kobudo Library

Thank you for your interest in contributing to the TY Kobudo Library project.

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Supabase account (for database)
- Vercel account (for deployment, optional)

### Development Setup

1. Fork and clone the repository
2. Install dependencies:
   \`\`\`bash
   npm install --legacy-peer-deps
   \`\`\`
   Note: The `--legacy-peer-deps` flag is required due to React 19 peer dependency conflicts.
3. Set up environment variables:
   \`\`\`bash
   cp .env.template .env.local
   # Edit .env.local with your values
   \`\`\`
   See \`.env.template\` for a fully documented template with all required and optional variables.
4. Run the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

For detailed setup instructions including Supabase configuration and database migrations, see the [Local Development Setup](README.md#local-development-setup) section in the README.

## Development Workflow

### Code Standards

- **TypeScript**: All code must be written in TypeScript
- **Linting**: Run `npm run lint` before committing
- **Formatting**: Run `npm run format` to format code with Prettier
- **Type Checking**: Run `npm run type-check` to verify types

### Testing

- Run tests: `npm test`
- Run tests with coverage: `npm run test:coverage`
- Run tests in watch mode: `npm run test:watch`

All pull requests should include appropriate tests and maintain or improve code coverage.

### Commit Messages

Use clear, descriptive commit messages that explain what changed and why.

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Ensure all tests pass and linting is clean
4. Submit a pull request with a clear description of changes
5. Address any review feedback

## Reporting Issues

When reporting bugs, please include:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Browser/environment details (if applicable)

## Security Issues

For security vulnerabilities, please see [SECURITY.md](SECURITY.md). Do not open public issues for security concerns.

## Questions

For questions about contributing, please open a discussion or contact the maintainers.
