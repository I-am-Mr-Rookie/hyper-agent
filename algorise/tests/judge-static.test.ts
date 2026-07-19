import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const compose = readFileSync("docker-compose.yml", "utf8");
const dockerExecutor = readFileSync("services/code-engine/src/executor/DockerExecutor.js", "utf8");
const validation = readFileSync("services/code-engine/src/api/middleware/validation.js", "utf8");

describe("judge security wiring (static E1 checks only)", () => {
  it("wires Redis, API, worker, and Docker socket without embedding a production token", () => {
    expect(compose).toContain("judge-api:");
    expect(compose).toContain("judge-worker:");
    expect(compose).toContain("redis:");
    expect(compose).toContain("${JUDGE_AUTH_TOKEN:-replace-local-token}");
    expect(compose).toContain("/var/run/docker.sock");
  });

  it("enforces network, memory, process, filesystem, and capability boundaries in the Docker executor", () => {
    expect(dockerExecutor).toContain("NetworkDisabled: !enable_network");
    expect(dockerExecutor).toContain("MemorySwap: effectiveMemory * 1024");
    expect(dockerExecutor).toContain("PidsLimit: max_processes_and_or_threads");
    expect(dockerExecutor).toContain("ReadonlyRootfs: true");
    expect(dockerExecutor).toContain("SecurityOpt: ['no-new-privileges']");
    expect(dockerExecutor).toContain("CapDrop: ['ALL']");
  });

  it("strips attempts to enable execution-container networking at the API boundary", () => {
    expect(validation).toContain("enable_network: Joi.any().strip().default(false)");
  });
});
