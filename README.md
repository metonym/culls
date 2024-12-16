# culls

> CLI to optimize package.json for NPM

`culls` is a minimal CLI that removes unnecessary fields from `package.json` intended to be run _before_ publishing to NPM. The changes to `package.json` should not be checked into source control. The goal of `culls` is to create the absolute smallest possible `package.json` file for publishing to NPM.

For example, `culls` will remove `devDependencies` from `package.json`, which, while automatically excluded during package installation, still adds unnecessary bulk to your published package. Other development-specific fields that can be removed include linting or testing configs, like for Prettier, Jest, or ESLint.

## Usage

The CLI must be run with a valid `package.json` file in the current working directory.

```bash
# NPM
npx culls

# Bun
bunx culls
```

### Preserved fields

By default, `culls` preserves fields that are typically required for publishing NPM packages.

<details>
<summary>Default preserved <code>package.json</code> fields</summary>

- author
- bin
- browser
- bugs
- contributors
- dependencies
- description
- engines
- exports
- files
- funding
- homepage
- keywords
- license
- main
- maintainers
- module
- name
- optionalDependencies
- peerDependencies
- private
- publishConfig
- repository
- scripts
- sideEffects
- type
- types
- typesVersions
- version
- workspaces

</details>

To specify fields to preserve, use the `--preserve` flag. Fields should be comma-separated.

```bash
# NPM
npx culls --preserve=scripts,customField

# Bun
bunx culls --preserve=scripts,customField
```

## Sample GitHub Actions workflow

This sample workflow demonstrates using `culls` when automating package publishing.

```yaml
# .github/workflows/publish.yml
on:
  push:
    # Trigger on tag push.
    # E.g., `git tag v1.0.0; git push origin v1.0.0`
    tags:
      - "v*"

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20.x"
          registry-url: "https://registry.npmjs.org"

      - name: Install dependencies
        run: npm install

      # Run any necessary build steps.
      # In this case, `scripts` are still needed.
      - name: Build package
        run: npm run build

      # Run `culls` to remove unnecessary fields.
      - name: Prune package.json
        run: npx culls

      - name: Publish package
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_AUTH_TOKEN }}
        run: npm publish --provenance --access public
```

## Changelog

[CHANGELOG.md](CHANGELOG.md)

## License

[MIT](LICENSE)
