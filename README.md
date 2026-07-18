<img width="1584" height="396" alt="GITHUB BANNER" src="https://github.com/user-attachments/assets/2e3196a4-d4a8-4e58-9fdf-1d8be6d0eda8" />

<h1 align="center">Neko DApp</h1>

<p align="center">
  <strong>Capital routing layer for RWAs on Stellar.</strong>
</p>

<p align="center">
  Pools (lend/borrow) - Swap - Discover - Strategies - Vaults - On/off-ramps
</p>

## Quick Start

### Prerequisites

Before getting started, ensure you have:

- [Node.js](https://nodejs.org/) (v20 or higher)
- [npm](https://www.npmjs.com/) (v11.6.2 or higher)

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/Neko-Protocol/neko-mainnet.git
   cd neko-mainnet
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Build packages:**

   ```bash
   npm run build
   ```

4. **Set up environment variables:**

   Create a `.env.local` file in `apps/web-app/` with all required envs (checkout `apps/web-app/.env.example`).

5. **Start the development server:**

   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:3000`, backend on `http://localhost:4000` and admin on `http://localhost:3001`.

## Available Scripts

### Root Level

- `npm run dev` - Start all development servers (web app)
- `npm run build` - Build all packages and apps for production
- `npm run start` - Start production servers
- `npm run lint` - Run ESLint across all packages
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

### Web App Specific

- `cd apps/web-app && npm run dev` - Start Next.js dev server with Turbopack
- `cd apps/web-app && npm run build` - Build Next.js app for production
- `cd apps/web-app && npm run start` - Start Next.js production server
- `cd apps/web-app && npm run lint` - Run ESLint

## Technology Stack

### Frontend

| Technology          | Version  | Description                     |
| ------------------- | -------- | ------------------------------- |
| Next.js             | 16.1     | React framework with App Router |
| React               | 19.2     | UI library                      |
| Turbopack           | Built-in | Fast bundler for development    |
| Tailwind CSS        | 4.x      | Utility-first CSS framework     |
| Zustand             | -        | Lightweight state management    |
| TanStack Query      | -        | Server state management         |
| Chart.js / Recharts | -        | Data visualization              |

### Monorepo

- **Build System**: Turborepo
- **Package Manager**: npm workspaces (v11.6.2+)
- **Code Quality**: ESLint 9, Prettier 3, Husky 9

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes following conventions (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

Please ensure your code:

- Passes all linting checks (`npm run lint`)
- Is formatted with Prettier (`npm run format`)
- Includes appropriate TypeScript types
- Follows the existing code style
- Uses conventional commits (feat, fix, chore, etc.)

### AI Agent Skills

The `.agents/skills/` directory contains specialized skills for Claude Code and other LLM-based assistants. The `.claude/skills` symbolic link provides integration with Claude Code.

| Skill                           | Description                                                                        | Command                        |
| ------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------ |
| **stellar-dev**                 | Stellar/Soroban development: contracts, SDK, RPC, wallets, testing, security       | `/stellar-dev`                 |
| **neko-brand**                  | Neko brand identity: color tokens, typography, logo usage                          | `/neko-brand`                  |
| **feature-module-conventions**  | Colocated feature-module layout: where new components/hooks/stores/services belong | `/feature-module-conventions`  |
| **tanstack-query**              | TanStack Query v5: patterns, v4→v5 migration, SSR, optimistic updates              | `/tanstack-query`              |
| **tailwind-patterns**           | Tailwind CSS: layouts, cards, navigation, forms, dark mode                         | `/tailwind-patterns`           |
| **next-best-practices**         | Next.js: RSC, data patterns, metadata, error handling, bundling                    | `/next-best-practices`         |
| **vercel-react-best-practices** | React performance: rendering, caching, bundle optimization                         | `/vercel-react-best-practices` |
| **vercel-composition-patterns** | React composition: compound components, render props, context                      | `/vercel-composition-patterns` |
| **remotion-best-practices**     | Remotion video: animations, transitions, audio, captions                           | `/remotion-best-practices`     |
| **commit-work**                 | Git commits: staging, splitting, Conventional Commits                              | `/commit-work`                 |
| **seo-audit**                   | SEO audit: meta tags, structured data, performance                                 | `/seo-audit`                   |
| **web-design-guidelines**       | UI/UX review: accessibility, design best practices                                 | `/web-design-guidelines`       |
| **agent-md-refactor**           | Refactor AGENTS.md/CLAUDE.md with progressive disclosure                           | `/agent-md-refactor`           |
| **skill-creator**               | Guide for creating custom skills                                                   | `/skill-creator`               |
| **find-skills**                 | Discover and install skills from [skills.sh](https://skills.sh/)                   | `/find-skills`                 |

**Installing new skills:**

```bash
npx skills find [query]              # Search for skills
npx skills add <owner/repo@skill>    # Install a skill
npx skills check                     # Check for updates
```

## License

This project is licensed under the MIT License.

## Links

- [Brand & Design System (BRAND.md)](./BRAND.md)
- [Stellar Documentation](https://developers.stellar.org/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Turborepo Documentation](https://turbo.build/repo/docs)

## Support

For questions and support, please open an issue on [GitHub](https://github.com/Neko-Protocol/neko-mainnet/issues).
