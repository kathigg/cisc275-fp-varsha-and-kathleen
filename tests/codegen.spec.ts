import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { buildPythonStarter } from "../src/codegen";
import { createDemoProjects } from "../src/demoProjects";

test("generated Drafter code follows the documented entry points", () => {
    const project = createDemoProjects()[0];
    const generatedCode = buildPythonStarter(project);

    expect(generatedCode).toContain("from drafter import *");
    expect(generatedCode).toContain("def index(");
    expect(generatedCode).toContain("start_server(ClubFairState())");
    expect(generatedCode).not.toContain("Text(");
    expect(generatedCode).toContain(
        '"Search by category or jump straight into the featured events list."',
    );
});

test("generated Drafter code is valid Python syntax", () => {
    const project = createDemoProjects()[0];
    const generatedCode = buildPythonStarter(project);
    const tempDirectory = mkdtempSync(join(tmpdir(), "drafter-export-"));
    const filePath = join(tempDirectory, "generated_site.py");

    try {
        writeFileSync(filePath, generatedCode, "utf8");
        execFileSync("python3", ["-m", "py_compile", filePath], {
            cwd: tempDirectory,
            stdio: "pipe",
        });
    } finally {
        rmSync(tempDirectory, { recursive: true, force: true });
    }
});
