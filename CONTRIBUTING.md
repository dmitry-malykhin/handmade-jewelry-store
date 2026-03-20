# Contributing to Handmade Jewelry Store

> **Solo project.** Claude Code assists with implementation.
> **All commits and pushes are made exclusively by the repository owner.**
> Claude Code does not commit or push under any circumstances.

---

## Prerequisites

| Tool           | Version | Install                                                      |
| -------------- | ------- | ------------------------------------------------------------ |
| Node.js        | ≥ 20.x  | [nodejs.org](https://nodejs.org)                             |
| pnpm           | ≥ 9.x   | `npm i -g pnpm`                                              |
| Docker Desktop | latest  | [docker.com](https://www.docker.com/products/docker-desktop) |

---

## Local Setup

```bash
# 1. Clone
git clone https://github.com/mitrich83/handmade-jewelry-store.git
cd handmade-jewelry-store

# 2. Install dependencies
pnpm install

# 3. Configure environment
cp .env.example .env
# Edit .env — fill in secrets

# 4. Start PostgreSQL
docker-compose up -d

# 5. Run Prisma migrations (after W3)
pnpm db:migrate

# 6. Start all apps
pnpm dev
```

| Service       | URL                       |
| ------------- | ------------------------- |
| Web (Next.js) | http://localhost:3000     |
| API (NestJS)  | http://localhost:4000     |
| Swagger       | http://localhost:4000/api |

---

## Git Workflow

### One rule: one Issue = one branch = one PR

```
main
 └── feature/issue-2-repo-structure   ← работаешь здесь
      └── (PR) → merge → close Issue
```

### Branch naming

```
feature/issue-{N}-{short-description}   # новая функциональность
fix/issue-{N}-{short-description}        # баг-фикс
chore/issue-{N}-{short-description}      # инфра, конфиг, зависимости
docs/issue-{N}-{short-description}       # документация
```

Examples:

```
feature/issue-12-shadcn-setup
fix/issue-34-cart-quantity-bug
chore/issue-2-repo-structure
```

### Creating a branch

```bash
git checkout main
git pull origin main
git checkout -b feature/issue-{N}-{description}
```

### Commit conventions (Conventional Commits)

```
<type>: <short description in English> #<issue>
```

| Type       | When to use                                |
| ---------- | ------------------------------------------ |
| `feat`     | New feature                                |
| `fix`      | Bug fix                                    |
| `chore`    | Config, dependencies, tooling              |
| `docs`     | Documentation only                         |
| `test`     | Adding or updating tests                   |
| `refactor` | Code change without new feature or bug fix |
| `style`    | Formatting, whitespace (no logic change)   |
| `perf`     | Performance improvement                    |

```bash
# Good examples
git commit -m "feat: add product card component #12"
git commit -m "fix: correct cart total calculation #34"
git commit -m "chore: setup turborepo and pnpm workspaces #2"
git commit -m "docs: add API endpoints to swagger #41"

# Bad — avoid
git commit -m "fix"
git commit -m "WIP"
git commit -m "some changes"
```

### Commit size

- **Small, focused commits.** One logical change per commit.
- Commit after each working unit — don't accumulate a day's work into one commit.
- `git add <specific files>` — never `git add .` blindly.

---

## Pull Requests

```bash
git push origin feature/issue-{N}-{description}
# Then open PR on GitHub
```

### PR checklist before opening

- [ ] Branch is up to date with `main` (`git rebase main`)
- [ ] No `any` types in TypeScript
- [ ] `pnpm lint` passes
- [ ] `pnpm build` passes locally
- [ ] PR title follows Conventional Commits format
- [ ] Issue number referenced in PR description (`Closes #N`)

### PR title format

```
feat: add product catalog page (#12)
fix: resolve cart item duplication (#34)
```

### PR body template

```markdown
## Summary

Brief description of what was done and why.

## Changes

- Added X
- Updated Y
- Removed Z

## How to test

Steps to verify the change works correctly.

Closes #N
```

---

## Code Standards

See [docs/03_CODE_RULES.docx](docs/03_CODE_RULES.docx) for the full rules.

### Quick reference

```ts
// ✅ Typed props via interface
interface ProductCardProps {
  product: Product;
  onAddToCart: (id: string) => void;
}

// ✅ Functional component, named export
export function ProductCard({ product, onAddToCart }: ProductCardProps) { ... }

// ❌ No 'any'
const getProduct = (id: any) => { ... }  // forbidden

// ✅ TanStack Query for data fetching — no useEffect for fetch
const { data, isLoading, error } = useQuery({ ... })
```

---

## Package Management

This project uses **pnpm** with workspaces.

```bash
# Install all workspace dependencies
pnpm install

# Add a dependency to a specific app
pnpm --filter @jewelry/web add react-hook-form
pnpm --filter @jewelry/api add @nestjs/passport

# Add a dev dependency to root
pnpm add -D -w prettier

# Add shared package dependency
pnpm --filter @jewelry/web add @jewelry/shared
```

---

## Scripts

| Command                | Description                      |
| ---------------------- | -------------------------------- |
| `pnpm dev`             | Run all apps in development mode |
| `pnpm build`           | Build all apps                   |
| `pnpm lint`            | Lint all apps                    |
| `pnpm test`            | Run all tests                    |
| `pnpm db:migrate`      | Run Prisma migrations            |
| `pnpm db:studio`       | Open Prisma Studio               |
| `docker-compose up -d` | Start PostgreSQL locally         |
| `docker-compose down`  | Stop PostgreSQL                  |
