import { test } from "node:test";
import assert from "node:assert/strict";
import { streamedDocument } from "../scripts/local-website-qa/phase2/streamed-form";
test("HTTP form decoding assembles React literal segments without executing scripts", () => {
  const dom = streamedDocument(
    '<form><input name="name" value="synthetic"><template id="P:1"></template></form><div hidden id="S:1"><select name="pricing"><option selected>free</option></select><template id="P:2"></template></div><div hidden id="S:2"><input name="listingTypeId" value="LST-01"></div><script>window.secretSideEffect=true;$RS("S:1","P:1");$RS("S:2","P:2")</script>',
  );
  const form = dom.window.document.forms[0];
  assert.deepEqual(
    Array.from(form.elements).map((e) => e.getAttribute("name")),
    ["name", "pricing", "listingTypeId"],
  );
  assert.equal(Reflect.get(dom.window, "secretSideEffect"), undefined);
  assert.equal(
    dom.window.document.querySelectorAll('div[hidden][id^="S:"]').length,
    0,
  );
  dom.window.close();
});
test("HTTP segment decoder never evaluates expressions or accepts cyclic placements", () => {
  const inert = streamedDocument(
    '<form><template id="P:1"></template></form><div hidden id="S:1"><input name="ignored"></div><script>$RS("S:"+1,"P:1");fetch("https://example.invalid/")</script>',
  );
  assert.equal(inert.window.document.forms[0].elements.length, 0);
  inert.window.close();
  assert.throws(
    () =>
      streamedDocument(
        '<div id="S:1"><template id="P:1"></template></div><script>$RS("S:1","P:1")</script>',
      ),
    /Invalid HTTP segment placement/,
  );
});
