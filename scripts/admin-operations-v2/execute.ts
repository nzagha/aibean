import { operatorCommand } from "./operator";
if (
  process.argv[1]
    ?.replaceAll("\\", "/")
    .endsWith("/admin-operations-v2/execute.ts")
)
  void operatorCommand("execute");
