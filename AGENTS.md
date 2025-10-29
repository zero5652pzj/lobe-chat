# LobeChat Development Guidelines

This document serves as a comprehensive guide for all team members when developing LobeChat.

## Tech Stack

Built with modern technologies:

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI Components**: Ant Design, @lobehub/ui, antd-style
- **State Management**: Zustand, SWR
- **Database**: PostgreSQL, PGLite, Drizzle ORM
- **Testing**: Vitest, Testing Library
- **Package Manager**: pnpm (monorepo structure)
- **Build Tools**: Next.js (Turbopack in dev, Webpack in prod)

## Directory Structure

The project follows a well-organized monorepo structure:

- `apps/` - Main applications
- `packages/` - Shared packages and libraries
- `src/` - Main source code
- `docs/` - Documentation
- `.cursor/rules/` - Development rules and guidelines

## Development Workflow

### Git Workflow

- Use rebase for git pull
- Git commit messages should prefix with gitmoji
- Git branch name format: `username/feat/feature-name`
- Use `.github/PULL_REQUEST_TEMPLATE.md` for PR descriptions

### Package Management

- Use `pnpm` as the primary package manager
- Use `bun` to run npm scripts
- Use `bunx` to run executable npm packages
- Navigate to specific packages using `cd packages/<package-name>`

### Code Style Guidelines

#### TypeScript

- Prefer interfaces over types for object shapes

### Testing Strategy

**Required Rule**: `testing-guide/testing-guide.mdc`

**Commands**:

- Web: `bunx vitest run --silent='passed-only' '[file-path-pattern]'`
- Packages: `cd packages/[package-name] && bunx vitest run --silent='passed-only' '[file-path-pattern]'` (each subpackage contains its own vitest.config.mts)

**Important Notes**:

- Wrap file paths in single quotes to avoid shell expansion
- Never run `bun run test` - this runs all tests and takes \~10 minutes

### Type Checking

- Use `bun run type-check` to check for type errors

### i18n

- **Keys**: Add to `src/locales/default/namespace.ts`
- **Dev**: Translate `locales/zh-CN/namespace.json` locale file only for preview
- DON'T run `pnpm i18n`, let CI auto handle it

## Project Rules Index

All following rules are saved under `.cursor/rules/` directory:

### Backend

- `drizzle-schema-style-guide.mdc` – Style guide for defining Drizzle ORM schemas

### Frontend

- `react-component.mdc` – React component style guide and conventions
- `i18n.mdc` – Internationalization guide using react-i18next
- `typescript.mdc` – TypeScript code style guide
- `packages/react-layout-kit.mdc` – Usage guide for react-layout-kit

### State Management

- `zustand-action-patterns.mdc` – Recommended patterns for organizing Zustand actions
- `zustand-slice-organization.mdc` – Best practices for structuring Zustand slices

### Desktop (Electron)

- `desktop-feature-implementation.mdc` – Implementing new Electron desktop features
- `desktop-controller-tests.mdc` – Desktop controller unit testing guide
- `desktop-local-tools-implement.mdc` – Workflow to add new desktop local tools
- `desktop-menu-configuration.mdc` – Desktop menu configuration guide
- `desktop-window-management.mdc` – Desktop window management guide

### Debugging

- `debug-usage.mdc` – Using the debug package and namespace conventions

### Testing

- `testing-guide/testing-guide.mdc` – Comprehensive testing guide for Vitest
- `testing-guide/electron-ipc-test.mdc` – Electron IPC interface testing strategy
- `testing-guide/db-model-test.mdc` – Database Model testing guide
