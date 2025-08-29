# End-to-End Testing with Playwright

This directory contains comprehensive E2E tests for the llms-txt hub application using Playwright.

## 🚀 Quick Start

```bash
# Install Playwright browsers
npm run test:install

# Run all E2E tests  
npm run test:e2e

# Run only smoke tests (fastest)
npm run test:e2e:smoke

# Run with visual interface
npm run test:e2e:ui

# Debug tests step-by-step
npm run test:e2e:debug
```

## 📁 Test Structure

```
apps/e2e/
├── tests/
│   ├── pages.spec.ts           # Page load and content tests
│   ├── interactions.spec.ts    # User interaction tests  
│   └── home.spec.ts           # Original homepage test
├── playwright.config.ts       # Playwright configuration
└── README.md                  # This file
```

## 🧪 Test Categories

### 1. **Page Tests** (`pages.spec.ts`)
- **Main Pages**: Homepage, About, Guides, Websites, Members, Projects, FAQ, News
- **Category Pages**: Developer Tools, Featured categories
- **Search Functionality**: Search page with query parameters  
- **Legal Pages**: Privacy, Terms, Cookies
- **Error Handling**: 404 page testing
- **Responsive Design**: Mobile viewport testing
- **Performance**: Load time validation
- **Accessibility**: Basic accessibility checks

### 2. **Interaction Tests** (`interactions.spec.ts`)
- **Search**: Search input and submission
- **Filtering**: Category and sort controls
- **Load More**: Pagination and infinite scroll
- **Navigation**: Footer links, breadcrumbs, back-to-top
- **Forms**: Newsletter signup, contact forms
- **Mobile**: Mobile menu, mobile search
- **External Links**: External link verification

## ⚙️ Configuration Optimizations

### Performance Settings
```typescript
{
  workers: 4,                    // Parallel execution locally
  timeout: 30000,                // 30 seconds per test
  actionTimeout: 10000,          // 10 seconds for actions
  navigationTimeout: 15000,      // 15 seconds for page loads
  fullyParallel: true           // Maximum parallelization
}
```

### Browser Optimizations
- **Chrome args** for faster execution:
  - `--disable-dev-shm-usage`
  - `--disable-extensions` 
  - `--no-sandbox`
  - Background throttling disabled

### Test Environments
- **Desktop**: Primary Chromium testing
- **Mobile**: Pixel 5 simulation (reduced test scope)
- **Cross-browser**: Firefox/Safari commented out for speed

## 🔧 Available Scripts

| Script | Description |
|--------|-------------|
| `test:e2e` | Run all E2E tests across all browsers |
| `test:e2e:fast` | Run tests only on Chromium (fastest) |
| `test:e2e:smoke` | Run essential page tests only |
| `test:e2e:ui` | Run tests with Playwright UI |
| `test:e2e:debug` | Debug tests step-by-step |
| `test:e2e:headed` | Run tests with visible browser |
| `test:install` | Install Playwright browsers |
| `report` | View last test results |

## 🔄 Lefthook Integration

### Pre-push Hook
E2E smoke tests automatically run before pushing code:

```yaml
e2e-smoke:
  run: cd apps/e2e && npm run test:e2e:smoke
```

This ensures:
- ✅ Critical user journeys work
- ✅ Main pages load correctly  
- ✅ No regressions in core functionality
- ⚡ Fast execution (~2-3 minutes)

## 🎯 Test Philosophy

### Focused on User Journeys
Tests simulate real user behavior:
- Page navigation
- Search and filtering
- Form interactions
- Mobile usage patterns

### Performance Optimized
- **Fast feedback**: Smoke tests complete quickly
- **Parallel execution**: Multiple tests run simultaneously
- **Browser optimization**: Reduced overhead for speed
- **Smart retries**: Only retry on CI environments

### Resilient & Maintainable
- **Flexible selectors**: Tests work across UI changes
- **Conditional interactions**: Handle optional UI elements gracefully
- **Clear test structure**: Easy to understand and maintain

## 📊 Expected Coverage

The E2E tests cover:
- **~15 main pages** across the application
- **~20 user interactions** including search, navigation, forms
- **Mobile responsiveness** for critical flows  
- **Error states** and edge cases
- **Performance benchmarks** for load times

## 🐛 Debugging Tips

### Test Failures
1. **Check screenshots**: Available in `test-results/` after failures
2. **View trace**: Use `report` command to see detailed execution trace
3. **Run headed**: Use `test:e2e:headed` to see browser visually
4. **Debug mode**: Use `test:e2e:debug` for step-by-step debugging

### Common Issues
- **Timing issues**: Increase timeout values in config
- **Selector changes**: Update selectors when UI changes
- **Server not ready**: Ensure dev server starts before tests

### Performance Issues
- **Slow tests**: Check network conditions and server performance
- **Parallel conflicts**: Reduce worker count if tests interfere
- **Memory issues**: Increase system memory or reduce parallelization

## 🚀 CI/CD Integration

The configuration automatically adjusts for CI environments:
- **Single worker** in CI (prevents conflicts)
- **More retries** for flaky network conditions
- **GitHub reporter** for clean CI output
- **Video recording** only on failures (saves space)

## 🔮 Future Enhancements

Potential improvements:
- **Visual regression testing** with Playwright screenshots
- **API testing** alongside UI tests
- **Cross-browser matrix** for comprehensive coverage
- **Mobile device testing** with real device farm
- **Load testing** integration

---

The E2E test suite provides confidence that the application works correctly from a user perspective while maintaining fast feedback cycles for developers.