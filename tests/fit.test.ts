import test from "node:test";
import assert from "node:assert/strict";
import { demoTools } from "../src/data/demo-tools";
import { supportedFit } from "../src/lib/catalog/fit";
test("supported fit uses only recorded context/features/pricing, leaves ease and stale verification unknown, and excludes payment",()=>{
 const tool={...demoTools[0],demo:false,verified:true,lastVerified:"2026-10-12T00:00:00Z",features:["CSV export","Automation"],pricing:"unknown" as const};
 const context={category:tool.categoryId},fit=supportedFit(tool,context,{features:["CSV export","No such feature"],pricing:"free"},Date.parse("2026-10-12T10:00:00Z"));
 assert.equal(fit.factors.find(f=>f.name.includes("feature"))?.value,50);assert(fit.missing.includes("Ease of use"));assert(fit.missing.includes("Recorded pricing model"));assert.equal(fit.complete,false);
 assert.deepEqual(supportedFit({...tool,claimed:true},context,{features:[],pricing:"any"},Date.parse("2026-10-12")),supportedFit({...tool,claimed:false},context,{features:[],pricing:"any"},Date.parse("2026-10-12")));
 const old=supportedFit({...tool,lastVerified:"2020-01-01"},context,{features:[],pricing:"any"});assert.equal(old.freshVerification,false);assert(old.missing.includes("Reviewed verification"));
});
