import fs from "node:fs";
import path from "node:path";

type PkgJson = Record<string, unknown> & {
  scripts?: Record<string, string>;
};

/**
 * Default package.json fields to preserve.
 * These fields are commonly used by npm and package consumers.
 * @see https://docs.npmjs.com/cli/v9/configuring-npm/package-json
 */
const DEFAULT_ALLOWED_FIELDS = new Set([
  "author",
  "bin",
  "browser",
  "bugs",
  "contributors",
  "dependencies",
  "description",
  "engines",
  "exports",
  "files",
  "funding",
  "homepage",
  "keywords",
  "license",
  "main",
  "maintainers",
  "module",
  "name",
  "optionalDependencies",
  "peerDependencies",
  "private",
  "publishConfig",
  "repository",
  "scripts",
  "sideEffects",
  "type",
  "types",
  "typesVersions",
  "version",
  "workspaces",
]);

/**
 * Lifecycle scripts to preserve when culling scripts.
 * @see https://docs.npmjs.com/cli/v9/using-npm/scripts#lifecycle-scripts
 */
const LIFECYCLE_SCRIPTS = new Set([
  "postinstall",
  "postuninstall",
  "preinstall",
  "prepare",
  "preuninstall",
]);

/**
 * Removes non-essential fields from package.json while preserving npm-required fields.
 * Keeps a default set of fields and allows for custom field preservation.
 *
 * Specify fields to preserve with the `--preserve` flag.
 * @example --preserve=customField1,customField2
 */
export function culls() {
  console.time("🌿 culls");

  const pkg_path = path.join(process.cwd(), "package.json");
  const pkg = fs.readFileSync(pkg_path, "utf8");
  const pkgJson = JSON.parse(pkg) as PkgJson;

  /**
   * Parse CLI arguments for custom field preservation.
   * Supports --preserve flag with comma-separated field names.
   * @example --preserve=customField1,customField2
   */
  const args = process.argv.slice(2);
  let custom_preserved_fields: string[] = [];

  for (const arg of args) {
    if (arg.startsWith("--preserve=")) {
      custom_preserved_fields = arg.slice(11).split(",").map((k) => k.trim());
      break;
    }
  }

  const all_preserved_fields = custom_preserved_fields.length > 0
    ? new Set([...DEFAULT_ALLOWED_FIELDS, ...custom_preserved_fields])
    : DEFAULT_ALLOWED_FIELDS;

  /**
   * Remove all fields that aren't in the allowed fields set.
   * Tracks removed fields for later reporting.
   */
  const removed_fields: string[] = [];

  for (const key of Object.keys(pkgJson)) {
    if (!all_preserved_fields.has(key)) {
      removed_fields.push(key);
      delete pkgJson[key];
    }
  }

  if (pkgJson.scripts && !custom_preserved_fields.includes("scripts")) {
    let scriptsRemoved = false;

    for (const script of Object.keys(pkgJson.scripts)) {
      if (!LIFECYCLE_SCRIPTS.has(script)) {
        scriptsRemoved = true;
        delete pkgJson.scripts[script];
      }
    }

    // Delete scripts entirely if empty, otherwise report individual removals.
    if (Object.keys(pkgJson.scripts).length === 0) {
      delete pkgJson.scripts;
      removed_fields.push("scripts");
    } else if (scriptsRemoved) {
      // Only report that scripts were modified if we actually removed some
      // but kept lifecycle scripts
    }
  }

  // Write the updated package.json file.
  fs.writeFileSync(pkg_path, JSON.stringify(pkgJson, null, 2) + "\n");

  if (removed_fields.length > 0) {
    console.log("Removed package.json fields:");
    removed_fields.sort().forEach((field) => console.log("-", field));
    console.log("");
  }

  console.timeEnd("🌿 culls");
}
