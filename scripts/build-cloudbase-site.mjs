import { execFile } from "node:child_process";
import {
  cp,
  lstat,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const outputDirectory = path.join(repositoryRoot, "cloudbase-dist");
const mirrorBasePath = "/emily-ib-learning";

const learnerFiles = [
  "index.html",
  "favicon.svg",
  "robots.txt",
  "assets/access-gate.js",
  "assets/class-page.js",
  "assets/classes.js",
  "assets/homework.js",
  "assets/portal.js",
  "assets/presence.js",
  "assets/site.css",
  "class/index.html",
];
const learnerDirectories = ["handouts"];
const forbiddenSegments = new Set([
  ".git",
  ".github",
  ".planning",
  "docs",
  "edge-functions",
  "private",
  "scripts",
  "teacher",
  "teacher-admin",
]);

function assertInsideRepository(targetPath) {
  const relative = path.relative(repositoryRoot, targetPath);
  if (
    relative === "" ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new Error(`Unsafe build target: ${targetPath}`);
  }
}

async function copyRequiredEntry(relativePath) {
  const source = path.join(repositoryRoot, relativePath);
  const destination = path.join(outputDirectory, relativePath);
  const sourceStats = await lstat(source);

  if (sourceStats.isSymbolicLink()) {
    throw new Error(`Learner release entry cannot be a symlink: ${relativePath}`);
  }

  await mkdir(path.dirname(destination), { recursive: true });
  await cp(source, destination, {
    recursive: sourceStats.isDirectory(),
    dereference: false,
    errorOnExist: true,
  });
}

async function listFiles(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = path.posix.join(prefix, entry.name);
    const absolutePath = path.join(directory, entry.name);

    if (entry.isSymbolicLink()) {
      throw new Error(`Learner build contains a symlink: ${relativePath}`);
    }

    if (entry.isDirectory()) {
      files.push(...(await listFiles(absolutePath, relativePath)));
    } else if (entry.isFile()) {
      files.push(relativePath);
    } else {
      throw new Error(`Unsupported learner build entry: ${relativePath}`);
    }
  }

  return files;
}

async function sourceCommit() {
  if (process.env.GITHUB_SHA) {
    return process.env.GITHUB_SHA;
  }

  try {
    return (
      await readFile(
        path.join(repositoryRoot, ".cloudbase-source-commit"),
        "utf8",
      )
    ).trim();
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }

  const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  return stdout.trim();
}

async function rewriteRootRelativeHtml() {
  const outputFiles = await listFiles(outputDirectory);

  for (const file of outputFiles.filter((entry) => entry.endsWith(".html"))) {
    const absolutePath = path.join(outputDirectory, file);
    const source = await readFile(absolutePath, "utf8");
    const rewritten = source.replace(
      /\b(href|src)="\/(?!\/)/g,
      `$1="${mirrorBasePath}/`,
    );
    await writeFile(absolutePath, rewritten, "utf8");
  }
}

async function main() {
  assertInsideRepository(outputDirectory);
  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(outputDirectory, { recursive: true });

  for (const file of learnerFiles) {
    await copyRequiredEntry(file);
  }

  for (const directory of learnerDirectories) {
    await copyRequiredEntry(directory);
  }

  const config = [
    "window.EMILY_PORTAL_CONFIG = {",
    '  serviceEndpoint: "https://1308268428-bbvil6ebcp.ap-hongkong.tencentscf.com",',
    '  serviceTransport: "relay-post",',
    "};",
    "",
  ].join("\n");
  await mkdir(path.join(outputDirectory, "assets"), { recursive: true });
  await writeFile(path.join(outputDirectory, "assets/config.js"), config, "utf8");

  const apiSource = await readFile(
    path.join(repositoryRoot, "assets/api.js"),
    "utf8",
  );
  const teacherBridgeBranch = `    if (
      action === "claimTeacherDevice" &&
      window.EMILY_PORTAL_CONFIG?.teacherBridgeEndpoint
    ) {
      return legacyJsonp(
        action,
        parameters,
        window.EMILY_PORTAL_CONFIG.teacherBridgeEndpoint,
      );
    }
`;
  if (!apiSource.includes(teacherBridgeBranch)) {
    throw new Error("Expected teacher bridge branch was not found in assets/api.js.");
  }
  await writeFile(
    path.join(outputDirectory, "assets/api.js"),
    apiSource.replace(teacherBridgeBranch, ""),
    "utf8",
  );

  await rewriteRootRelativeHtml();

  const commit = await sourceCommit();
  await writeFile(
    path.join(outputDirectory, "deployment-meta.json"),
    `${JSON.stringify({ sourceCommit: commit }, null, 2)}\n`,
    "utf8",
  );

  const outputFiles = (await listFiles(outputDirectory)).sort();

  for (const file of outputFiles) {
    const segments = file.split("/");
    const forbiddenSegment = segments.find((segment) =>
      forbiddenSegments.has(segment),
    );
    if (forbiddenSegment) {
      throw new Error(
        `Private or operational path entered learner build: ${file}`,
      );
    }
  }

  const requiredFiles = [
    "index.html",
    "class/index.html",
    "assets/config.js",
    "deployment-meta.json",
  ];
  for (const file of requiredFiles) {
    if (!outputFiles.includes(file)) {
      throw new Error(`Learner build is missing ${file}.`);
    }
  }

  process.stdout.write(
    [
      `CloudBase learner build ready: ${outputFiles.length} files`,
      `Source commit: ${commit}`,
      `Output: ${outputDirectory}`,
    ].join("\n") + "\n",
  );
}

await main();
