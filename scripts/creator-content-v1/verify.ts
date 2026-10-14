import { operatorCommand } from "./operator";
if (
  process.argv[1]
    ?.replaceAll("\\", "/")
    .endsWith("/creator-content-v1/verify.ts")
)
  void operatorCommand("verify");
