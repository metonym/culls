import  { describe, it, expect, beforeEach, afterEach, spyOn, mock } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { culls } from "./culls";

describe("package.json cleaner", () => {
  const originalCwd = process.cwd;
  const originalArgv = process.argv;
  let cwdSpy: ReturnType<typeof spyOn>;
  let joinSpy: ReturnType<typeof spyOn>;

  const mockPackageJsonTest = (mockPackageJson: Record<string, any>) => {
    const readFileSyncSpy = spyOn(fs, "readFileSync").mockReturnValue(
      JSON.stringify(mockPackageJson)
    );
    const writeFileSyncSpy = spyOn(fs, "writeFileSync").mockImplementation(mock(() => {}));

    culls();

    const result = JSON.parse(writeFileSyncSpy.mock.calls[0][1] as string);
    readFileSyncSpy.mockRestore();
    writeFileSyncSpy.mockRestore();
    return result;
  };

  beforeEach(() => {
    process.argv = ["node", "script.js"];
    cwdSpy = spyOn(process, "cwd").mockReturnValue("/fake/path");
    joinSpy = spyOn(path, "join").mockReturnValue("/fake/path/package.json");
  });

  afterEach(() => {
    cwdSpy.mockRestore();
    joinSpy.mockRestore();
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
