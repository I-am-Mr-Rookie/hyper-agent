import { readFileSync } from "node:fs";
import YAML from "yaml";

const compose = YAML.parse(readFileSync("docker-compose.yml", "utf8"));
const required = ["postgres", "redis", "web-migrate", "web", "judge-api", "judge-worker"];
for (const service of required) {
  if (!compose.services?.[service]) throw new Error(`Missing Compose service: ${service}`);
}
if (compose.services.web.ports?.[0] !== "3000:3000") throw new Error("Web must bind localhost port 3000");
if (compose.services["judge-api"].ports?.[0] !== "3100:3000") throw new Error("Judge API must bind localhost port 3100");
if (!compose.services.web.depends_on?.["web-migrate"]) throw new Error("Web must wait for database migrations");
if (!String(compose.services["judge-api"].volumes).includes("/var/run/docker.sock")) throw new Error("Judge API Docker executor socket is not wired");
console.log(`Compose contract passed (${required.join(", ")}).`);
