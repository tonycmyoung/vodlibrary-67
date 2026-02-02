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
   npm install
   \`\`\`
3. Set up environment variables (see README.md for required variables)
4. Run the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

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
