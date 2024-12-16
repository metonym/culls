import fs from "node:fs";
import path from "node:path";
import { cull } from "../src/cli";

vi.mock("node:fs");
vi.mock("node:path");

describe("package.json cleaner", () => {
  const originalCwd = process.cwd;
  const originalArgv = process.argv;

  const mockPackageJsonTest = (mockPackageJson: Record<string, any>) => {
    vi.spyOn(fs, "readFileSync").mockReturnValue(
      JSON.stringify(mockPackageJson)
    );
    vi.spyOn(fs, "writeFileSync").mockImplementation(vi.fn());

    cull();

    return JSON.parse((fs.writeFileSync as any).mock.calls[0][1]);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.argv = ["node", "script.js"];
    vi.spyOn(process, "cwd").mockImplementation(() => "/fake/path");
    vi.spyOn(path, "join").mockImplementation(() => "/fake/path/package.json");
  });

  afterEach(() => {
    process.cwd = originalCwd;
    process.argv = originalArgv;
  });

  it("should preserve default allowed fields", () => {
    const result = mockPackageJsonTest({
      name: "test-package",
      version: "1.0.0",
      description: "Test package",
      customField: "should be removed",
      scripts: {
        test: "jest",
        build: "tsc",
        prepare: "husky install",
      },
    });

    expect(result).toEqual({
      name: "test-package",
      version: "1.0.0",
      description: "Test package",
      scripts: {
        prepare: "husky install",
      },
    });
  });

  it("should handle custom preserved fields", () => {
    // Set CLI arguments with custom preserve
    process.argv = ["node", "script.js", "--preserve=customField,anotherField"];

    const result = mockPackageJsonTest({
      name: "test-package",
      version: "1.0.0",
      customField: "should be kept",
      anotherField: "also keep",
      removeThis: "should be removed",
    });

    expect(result).toEqual({
      name: "test-package",
      version: "1.0.0",
      customField: "should be kept",
      anotherField: "also keep",
    });
  });

  it("should preserve scripts", () => {
    // Set CLI arguments with custom preserve
    process.argv = ["node", "script.js", "--preserve=scripts"];

    const result = mockPackageJsonTest({
      name: "test-package",
      version: "1.0.0",
      scripts: {
        test: "jest",
      },
    });

    expect(result).toEqual({
      name: "test-package",
      version: "1.0.0",
      scripts: {
        test: "jest",
      },
    });
  });

  it("should remove scripts property if no lifecycle scripts exist", () => {
    const result = mockPackageJsonTest({
      name: "test-package",
      version: "1.0.0",
      scripts: {
        test: "jest",
        build: "tsc",
      },
    });

    expect(result).toEqual({
      name: "test-package",
      version: "1.0.0",
    });
  });

  it("should preserve lifecycle scripts", () => {
    const result = mockPackageJsonTest({
      name: "test-package",
      version: "1.0.0",
      scripts: {
        test: "jest",
        prepare: "husky install",
        postinstall: "some-command",
        preinstall: "another-command",
      },
    });

    expect(result).toEqual({
      name: "test-package",
      version: "1.0.0",
      scripts: {
        prepare: "husky install",
        postinstall: "some-command",
        preinstall: "another-command",
      },
    });
  });
});
