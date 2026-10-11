import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { TEMPLATE_CONTENT, templateDefaults, validateTemplateValues, templateCopy } from "../lib/template-content";
for (const definition of TEMPLATE_CONTENT) {
  assert.equal(validateTemplateValues(definition.id, templateDefaults(definition.id)), null, definition.id);
  const source = ts.createSourceFile(definition.source, readFileSync(definition.source, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const keys = new Set(definition.fields.map(field => field.key));
  function visit(node: ts.Node) {
    if (ts.isJsxText(node)) assert.equal(node.text.trim(), "", `Unmigrated visible text in ${definition.source}: ${node.text.trim()}`);
    if (ts.isCallExpression(node) && node.expression.getText(source) === "copy") {
      const key = node.arguments[0];
      assert.ok(ts.isStringLiteral(key) && keys.has(key.text), `Unknown CMS content key in ${definition.source}`);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}
const definition = TEMPLATE_CONTENT.find(item => item.id === "shared-forum-moments")!;
assert.match(validateTemplateValues(definition.id, { ...templateDefaults(definition.id), unexpected: "field" })!, /unknown/);
assert.equal(templateCopy({title:"Photograph {value1} of {value2}"})("title",{value1:2,value2:7}), "Photograph 2 of 7");
console.log(`CMS migration checks passed: ${TEMPLATE_CONTENT.length} designs, ${TEMPLATE_CONTENT.reduce((sum,item)=>sum+item.fields.length,0)} fields, no remaining literal JSX copy in migrated designs, complete defaults and known field references.`);
