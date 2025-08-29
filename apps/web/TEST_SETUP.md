# Test Setup & Configuration

This document explains the optimized test configuration for the llms-txt hub web application.

## 🚀 Quick Overview

The test setup is optimized for **speed** and **developer productivity**:

- **Pre-commit**: Only runs tests related to modified files (⚡ fast)
- **Pre-push**: Runs complete test suite (🔍 thorough)
- **Jest optimizations**: Caching, parallel execution, early exit on failure

## 📋 Available Commands

```bash
# Run all tests
npm test

# Run tests with coverage report
npm test:coverage  

# Run tests in watch mode for development
npm test:watch

# Run only tests related to specific files (used by lefthook)
npm run test:related <file-paths>

# Example: Run tests related to a specific component
npm run test:related components/ui/favorite-button.tsx
```

## 🔄 Lefthook Integration

### Pre-commit Hook (Fast ⚡)
Runs automatically before each commit:
- **Scope**: Only tests related to staged files
- **Speed**: Uses `--findRelatedTests` for minimal test execution
- **CPU Usage**: 50% cores (leaves room for other development work)
- **Behavior**: Fails fast with `--bail` on first test failure

```yaml
test-modified:
  glob: "apps/web/**/*.{test,spec}.{js,ts,tsx}"
  run: cd apps/web && npm test -- --findRelatedTests {staged_files} --passWithNoTests --bail --maxWorkers=50%
```

### Pre-push Hook (Thorough 🔍)
Runs automatically before pushing to remote:
- **Scope**: Complete test suite
- **Purpose**: Catch integration issues and ensure full compatibility
- **CPU Usage**: 75% cores for faster full suite execution
- **Output**: Non-verbose for cleaner CI-like logs

```yaml
test-all:
  run: cd apps/web && npm test -- --passWithNoTests --maxWorkers=75% --verbose=false
```

## ⚙️ Jest Configuration Optimizations

### Performance Settings
```typescript
{
  maxWorkers: '50%',           // Parallel execution
  cache: true,                 // Enable Jest cache
  bail: 1,                     // Stop on first failure
  clearMocks: true,           // Auto-clear mocks between tests
  verbose: false              // Reduce output noise
}
```

### Module Resolution
Optimized module mapping for monorepo structure:
- Design system components
- Internal packages
- Next.js and React testing utilities

## 🧪 Test Structure

```
apps/web/
├── __tests__/                    # Main test directory
│   └── basic-smoke-tests.test.tsx    # Core component smoke tests
├── components/
│   └── **/__tests__/             # Component-specific tests
└── jest.config.ts               # Jest configuration
```

## 📊 Current Test Coverage

- **23 tests** across core functionality
- **Smoke tests** for all major components and utilities
- **Error boundary** testing
- **Mock setup** for external dependencies

### Test Categories
1. **Component Rendering**: Ensures components render without errors
2. **Utility Functions**: Tests core helper functions
3. **Error Handling**: Validates error states and boundaries
4. **Integration**: Tests component interactions

## 🎯 Benefits of This Setup

### Developer Experience
- **Fast feedback**: Pre-commit tests complete in ~2-3 seconds
- **Focused testing**: Only relevant tests run during development
- **Parallel work**: Leaves CPU available for other development tasks

### Quality Assurance  
- **Comprehensive coverage**: Full test suite runs before push
- **Early detection**: Catches issues at commit level
- **Integration safety**: Prevents broken code from reaching shared branches

### CI/CD Friendly
- **Consistent behavior**: Same Jest config used locally and in CI
- **Performance optimized**: Efficient resource usage
- **Clear reporting**: Clean output for logs and reporting

## 🔧 Customization

### Adjust CPU Usage
Edit `maxWorkers` values in:
- `lefthook.yml` for hook-specific settings
- `jest.config.ts` for default behavior

### Add More Test Types
1. Add new test files following the pattern: `*.test.tsx`
2. Place in appropriate directories (`__tests__/` or component-specific)
3. Tests will automatically be picked up by Jest and lefthook

### Skip Tests Temporarily
```bash
# Skip pre-commit tests
LEFTHOOK=0 git commit -m "message"

# Skip pre-push tests  
git push --no-verify
```

## 🐛 Troubleshooting

### Tests Not Running on Commit
1. Check that lefthook is installed: `lefthook version`
2. Verify hooks are installed: `lefthook install` 
3. Check glob patterns match your file paths

### Slow Test Performance
1. Increase `maxWorkers` if you have more CPU cores
2. Check for expensive operations in test setup
3. Use `--verbose` flag to identify slow tests

### Module Resolution Issues
1. Check `moduleNameMapper` in `jest.config.ts`
2. Verify package paths in monorepo structure
3. Clear Jest cache: `npx jest --clearCache`