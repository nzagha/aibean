import { operatorCommand } from "./operator";
if (
  process.argv[1]?.replaceAll("\\", "/").endsWith("/admin-review-v1/verify.ts")
)
  void operatorCommand("verify");
