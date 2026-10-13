import { operatorCommand } from "./operator";
if (
  process.argv[1]
    ?.replaceAll("\\", "/")
    .endsWith("/admin-operations-v2/verify.ts")
)
  void operatorCommand("verify");
