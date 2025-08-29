# Setup Dependencies Composite Action

A reusable GitHub Action for installing Node.js dependencies with proper native module rebuilding support in CI environments.

## Purpose

This action solves the common CI issue where native modules (like `lightningcss`) fail to load due to missing or incompatible binary dependencies. It ensures:

- Deterministic installs using `npm ci` (respects `package-lock.json`)
- Optional dependencies are installed when needed
- Native modules are properly rebuilt for the CI platform
- Fast-fail verification of native bindings

## Prerequisites

**Required**: Run `actions/setup-node@v4` before using this action.
Ensure the `node-version` matches your local/runtime version (e.g., `'20'`).

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: npm
```

## Usage

### Basic Usage (with defaults)

```yaml
- uses: ./.github/actions/setup-deps
```

### Full Configuration

```yaml
- uses: ./.github/actions/setup-deps
  with:
    module: 'lightningcss/node/index.js'  # Module to verify
    rebuild: 'lightningcss'               # Package to rebuild
    optional: 'true'                      # Install optional deps
    audit: 'false'                        # Skip npm audit/fund
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `module` | Module path to sanity-check (require.resolve path) | No | `lightningcss/node/index.js` |
| `rebuild` | Package name to rebuild with `npm rebuild` | No | `lightningcss` |
| `optional` | Whether to install optional dependencies | No | `'true'` |
| `audit` | Whether to run npm audit and fund checks | No | `'false'` |

_Note:_ Inputs are strings (`'true'` / `'false'`) due to GitHub Actions input semantics.

## Platform Support

- ✅ Linux (glibc)
- ✅ Linux (musl/Alpine) - with warnings
- ✅ macOS
- ⚠️ Windows - not supported by this action. Gate in your workflow and use native npm:
  ```yaml
  - uses: ./.github/actions/setup-deps
    if: runner.os != 'Windows'
  - run: npm ci
    if: runner.os == 'Windows'
  ```

## Features

- **Smart Rebuild**: Only rebuilds if the module is actually installed
- **Platform Detection**: Warns about musl vs glibc differences
- **Grouped Logs**: Uses GitHub Actions log groups for clean output
- **Fast Fail**: Immediately fails if native binding is missing
- **CI Optimized**: Disables Husky hooks via `HUSKY=0`, skips audit/fund by default

## Troubleshooting

### Error: Cannot find module '../lightningcss.linux-x64-gnu.node'

This is the exact error this action fixes. Ensure you're using it in all jobs that run Next.js/Tailwind builds.

### Running on Alpine/musl

The action will warn you if running on musl. You may need to:
```bash
npm i -D lightningcss-linux-x64-musl
```

### Windows Support

This action uses bash and Unix commands. For Windows runners, use the pattern shown in Platform Support above.

## Example Workflow

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js 20 with npm cache
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: npm
      
      - name: Install dependencies with native rebuild (Linux/macOS)
        if: runner.os != 'Windows'
        uses: ./.github/actions/setup-deps
        with:
          module: 'lightningcss/node/index.js'
          rebuild: 'lightningcss'
      
      - name: Build
        run: npm run build
```

## Maintenance

To add support for additional native modules, either:

1. Call the action multiple times with different inputs:
   ```yaml
   - uses: ./.github/actions/setup-deps
     with:
       module: 'lightningcss/node/index.js'
       rebuild: 'lightningcss'
   
   - uses: ./.github/actions/setup-deps
     with:
       module: 'sharp/build/Release/sharp-linux-x64.node'
       rebuild: 'sharp'
   ```

2. Extend the action to accept arrays of modules (future enhancement)

## Testing

After implementing, verify success by checking for this log message in your CI output:
```
✓ Native binding verified: lightningcss/node/index.js
```

## License

Part of the Seneca Protocol project.