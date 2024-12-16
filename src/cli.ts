import fs from "node:fs";
import path from "node:path";

type PkgJson = Record<string, unknown> & {
  scripts?: Record<string, string>;
};

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
   * Default package.json fields to preserve.
   * These fields are commonly used by npm and package consumers.
   * @see https://docs.npmjs.com/cli/v9/configuring-npm/package-json
   */
  const default_allowed_fields = new Set([
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
   * Parse CLI arguments for custom field preservation.
   * Supports --preserve flag with comma-separated field names.
   * @example --preserve=customField1,customField2
   */
  const args = process.argv.slice(2);
  const valid_args = new Set(["--preserve"]);

  let custom_preserved_fields: string[] = [];

  for (const arg of args) {
    const [key, value] = arg.split("=");
    if (valid_args.has(key)) {
      custom_preserved_fields = value.split(",").map((k) => k.trim());
    }
  }

  const all_preserved_fields = new Set([
    ...Array.from(default_allowed_fields),
    ...custom_preserved_fields,
  ]);

  /**
   * Remove all fields that aren't in the allowed fields set.
   * Tracks removed fields for later reporting.
   */
  const keys_to_remove = Object.keys(pkgJson).filter(
    (key) => !all_preserved_fields.has(key)
  );

  let removed_fields: string[] = [];

  for (const key of keys_to_remove) {
    removed_fields.push(key);
    delete pkgJson[key];
  }

  if (pkgJson.scripts && !custom_preserved_fields.includes("scripts")) {
    /**
     * The scripts property is a special case because of lifecycle scripts.
     * @see https://docs.npmjs.com/cli/v9/using-npm/scripts#lifecycle-scripts
     */
    const scripts_to_keep = new Set([
      "postinstall",
      "postuninstall",
      "preinstall",
      "prepare",
      "preuninstall",
    ]);

    for (const script in pkgJson.scripts) {
      if (!scripts_to_keep.has(script)) {
        removed_fields.push(`scripts.${script}`);
        delete pkgJson.scripts[script];
      }
    }

    // Delete scripts entirely if empty.
    if (Object.keys(pkgJson.scripts).length === 0) {
      delete pkgJson.scripts;
      removed_fields = removed_fields.filter(
        (field) => !field.startsWith("scripts.")
      );
      removed_fields.push("scripts");
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
