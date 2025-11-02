# Development Setup and Code Quality

This document outlines the development setup, pre-commit hooks, and IDE integration for maintaining code quality in the Grow with Freya project.

## Pre-commit Hooks

Pre-commit hooks automatically run code quality checks before each commit to prevent issues from reaching the repository.

### What Gets Checked

1. **ESLint**: Automatically fixes linting issues in TypeScript/JavaScript files
2. **TypeScript**: Validates type checking without emitting files
3. **Staged Files Only**: Only checks files that are staged for commit

### How It Works

When you run `git commit`, the following happens automatically:

1. Husky intercepts the commit process
2. lint-staged runs on staged files matching the configured patterns
3. ESLint attempts to fix any issues automatically
4. TypeScript compiler checks for type errors
5. If all checks pass, the commit proceeds
6. If checks fail, the commit is blocked and you must fix the issues

### Setup Commands

```bash
# Navigate to the grow-with-freya directory
cd grow-with-freya

# Install dependencies (includes husky and lint-staged)
npm install

# Initialize husky hooks (runs automatically via prepare script)
npm run prepare

# Alternative: Run the setup script
./scripts/setup-dev-environment.sh
```

Note: The git repository is at the root level (colearn), but the pre-commit hooks are configured to work with the grow-with-freya subdirectory.

### Manual Validation

You can run the same checks manually:

```bash
# Run pre-commit checks on staged files
npm run pre-commit

# Run full validation (type-check + lint + tests)
npm run validate

# Individual checks
npm run lint
npm run lint:fix
npm run type-check
npm run test:ci
```

## IDE Integration

### VS Code Setup

The project includes VS Code configuration for optimal development experience.

#### Automatic Configuration

- **Format on Save**: Automatically formats code when saving files
- **ESLint Integration**: Real-time linting with auto-fix on save
- **TypeScript Support**: Enhanced TypeScript features and error checking
- **Import Organization**: Automatically organizes imports on save

#### Recommended Extensions

The following extensions are automatically suggested when opening the project:

- **ESLint**: Real-time linting and auto-fixing
- **TypeScript**: Enhanced TypeScript support
- **Prettier**: Code formatting
- **Expo Tools**: Expo development support
- **React Native Tools**: React Native debugging and IntelliSense
- **Auto Rename Tag**: Automatically renames paired HTML/JSX tags
- **Path Intellisense**: Autocomplete for file paths
- **Jest**: Testing support and debugging

#### File Associations

- `.tsx` files are treated as TypeScript React files
- `.ts` files are treated as TypeScript files
- Emmet support is enabled for TypeScript React files

### Other IDEs

For other IDEs, ensure the following features are enabled:

1. **ESLint Integration**: Install ESLint plugin for your IDE
2. **TypeScript Support**: Enable TypeScript language server
3. **Format on Save**: Configure automatic formatting
4. **Auto Import Organization**: Enable import sorting and organization

## Hook Configuration

### Pre-commit Hook

Located at `.husky/pre-commit`, this hook:
- Runs `lint-staged` on staged files
- Fixes ESLint issues automatically
- Validates TypeScript types
- Blocks commit if unfixable issues exist

### Pre-push Hook

Located at `.husky/pre-push`, this hook:
- Runs full validation suite before pushing
- Includes type checking, linting, and tests
- Prevents pushing broken code to remote repository

### Commit Message Hook

Located at `.husky/commit-msg`, this hook:
- Currently validates commit message format (basic)
- Can be extended for conventional commit validation

## Lint-staged Configuration

The `lint-staged` configuration in `package.json` defines what happens to staged files:

```json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": [
      "eslint --fix",
      "git add"
    ],
    "*.{ts,tsx}": [
      "tsc --noEmit"
    ]
  }
}
```

This configuration:
- Runs ESLint with auto-fix on JavaScript/TypeScript files
- Runs TypeScript compiler check on TypeScript files
- Re-stages fixed files automatically

## Troubleshooting

### Common Issues

1. **Hooks not running**: Ensure husky is installed with `npm run prepare`
2. **Permission errors**: Make hook files executable with `chmod +x .husky/*`
3. **ESLint errors**: Run `npm run lint:fix` to fix auto-fixable issues
4. **TypeScript errors**: Check `npm run type-check` output for specific issues

### Bypassing Hooks

In emergency situations, you can bypass hooks:

```bash
# Skip pre-commit hooks
git commit --no-verify

# Skip pre-push hooks  
git push --no-verify
```

Note: This should only be used in exceptional circumstances as it bypasses quality checks.

### Updating Hook Configuration

To modify hook behavior:

1. Edit the hook files in `.husky/`
2. Update `lint-staged` configuration in `package.json`
3. Modify npm scripts as needed
4. Test changes with `npm run pre-commit`

## Benefits

This setup provides:

- **Consistent Code Quality**: Automated formatting and linting
- **Early Error Detection**: Catches issues before they reach CI/CD
- **Reduced Pipeline Failures**: Prevents common linting/type errors
- **Developer Productivity**: Real-time feedback in IDE
- **Team Consistency**: Shared configuration across all developers

## Integration with CI/CD

The pre-commit hooks run the same checks as the CI/CD pipeline, ensuring:
- Local validation matches remote validation
- Reduced pipeline failures
- Faster feedback loop for developers
- Consistent code quality standards
