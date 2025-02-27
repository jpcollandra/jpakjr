# CLAUDE.md - Agent Guidelines for jpakjr Portfolio

## Build and Test Commands
- Start dev server: `yarn start` or `npm start`
- Build for production: `yarn build` or `npm run build`
- Run all tests: `yarn test` or `npm test`
- Run single test: `npx jest path/to/test.test.ts`

## Code Style Guidelines
- **TypeScript**: Use strict typing with interfaces/types (see ThemeContext.tsx)
- **React Components**: Functional components with hooks (useState, useEffect, useContext)
- **CSS/Styling**: SCSS with Bootstrap components from react-bootstrap
- **Imports**: Group imports by: React/hooks, components, utilities, styles
- **Naming**: 
  - PascalCase for components and interfaces
  - camelCase for variables, functions, and instances
- **File Structure**: Component files in src/Pages/ with matching .tsx and styles
- **Error Handling**: Use optional chaining (?.) and nullish coalescing (??) for null checks

## Tech Stack
React, TypeScript, Bootstrap, Three.js, Framer Motion, SCSS