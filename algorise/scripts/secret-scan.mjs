import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const excluded = new Set([".git", ".next", "node_modules", "coverage"]);
const allowedExtensions = new Set([".ts", ".tsx", ".js", ".mjs", ".json", ".md", ".yml", ".yaml", ".prisma", ".html", ".css", ".example", ".txt", ".cpp"]);

function allFiles(directory) {
  const output = [];
  for (const name of readdirSync(directory)) {
    if (excluded.has(name) || name === ".env") continue;
    const absolute = join(directory, name);
    const info = statSync(absolute);
    if (info.isDirectory()) output.push(...allFiles(absolute));
    else output.push(absolute);
  }
  return output;
}

function trackedFiles() {
  try {
    const files = execFileSync("git", ["ls-files", "-z"], { cwd: root }).toString().split("\0").filter(Boolean);
    if (files.length) return files.map((file) => join(root, file));
  } catch {
    // Pre-commit setup: fall back to the worktree.
  }
  return allFiles(root).filter((file) => allowedExtensions.has(file.slice(file.lastIndexOf("."))) || file.endsWith(".env.example"));
}

const patterns = [
  { name: "Freemodel credential", regex: /\bfe_oa_[A-Za-z0-9]{24,}\b/g },
  { name: "OpenAI-style key", regex: /\bsk-[A-Za-z0-9_-]{24,}\b/g },
  { name: "GitHub token", regex: /\b(?:ghp|gho|ghu|ghs|github_pat)_[A-Za-z0-9_]{20,}\b/g },
  { name: "Private key", regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { name: "AWS access key", regex: /\bAKIA[0-9A-Z]{16}\b/g },
];

const findings = [];
for (const file of trackedFiles()) {
  let content;
  try { content = readFileSync(file, "utf8"); } catch { continue; }
  for (const pattern of patterns) {
    const matches = content.match(pattern.regex);
    if (matches) findings.push({ file: relative(root, file), type: pattern.name, count: matches.length });
  }
}

if (findings.length) {
  console.error("Secret scan failed:");
  for (const finding of findings) console.error(`- ${finding.file}: ${finding.type} (${finding.count})`);
  process.exit(1);
}
console.log(`Secret scan passed (${trackedFiles().length} files inspected).`);
