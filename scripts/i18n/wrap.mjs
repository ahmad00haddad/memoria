// Codemod: wrap Arabic UI text in t() / data renders in tx().
// usage: node scripts/i18n/wrap.mjs <file...>   (--dry: report only)
// Leftover Arabic it won't touch (module-level data, comparisons) is listed for review.
import { parse } from "@babel/parser";
import MagicString from "magic-string";
import fs from "node:fs";

const AR = /[؀-ۿ]/;
const args = process.argv.slice(2);
const dry = args.includes("--dry");
const files = args.filter((a) => !a.startsWith("--"));

const SKIP_ATTRS = new Set(["className", "key", "id", "href", "to", "src", "type", "value", "dir", "lang", "role", "rel", "target", "htmlFor", "style", "data-testid"]);
const TEXT_ATTRS = new Set(["title", "placeholder", "alt", "aria-label", "label", "description", "subtitle", "heading", "text", "hint", "caption", "eyebrow", "tooltip"]);
const SKIP_CALLEE_PROPS = new Set(["includes", "startsWith", "endsWith", "indexOf", "replace", "replaceAll", "split", "eq", "neq", "match", "ilike", "like", "localeCompare", "has", "get", "set", "getItem", "setItem"]);
const DATA_KEYS = new Set(["value", "id", "key", "status", "type", "slug", "code", "kind"]);
const FN = new Set(["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression", "ObjectMethod", "ClassMethod"]);

const norm = (s) => s.replace(/\s+/g, " ").trim();
// JSX text whitespace: lines with a newline collapse; same-line spaces stay
function jsxClean(raw) {
  if (!raw.includes("\n")) return raw;
  const lines = raw.split(/\r?\n/);
  const out = [];
  lines.forEach((l, i) => {
    let s = l.replace(/\t/g, " ");
    if (i > 0) s = s.replace(/^ +/, "");
    if (i < lines.length - 1) s = s.replace(/ +$/, "");
    if (s) out.push(s);
  });
  return out.join(" ");
}

const keys = fs.existsSync("scripts/i18n/keys.json") ? JSON.parse(fs.readFileSync("scripts/i18n/keys.json", "utf8")) : {};
const leftovers = [];

function isSafeScalar(e) {
  if (!e) return false;
  if (["Identifier", "MemberExpression", "OptionalMemberExpression", "NumericLiteral"].includes(e.type)) return true;
  if (e.type === "TemplateLiteral") return !e.quasis.some((q) => AR.test(q.value.cooked ?? ""));
  if (e.type === "BinaryExpression") return isSafeScalar(e.left) && isSafeScalar(e.right);
  if (e.type === "CallExpression" || e.type === "OptionalCallExpression") {
    const c = e.callee;
    return (c.type === "MemberExpression" || c.type === "OptionalMemberExpression" || c.type === "Identifier") && !/^[A-Z]/.test(c.name ?? "") && e.arguments.every((a) => a.type !== "JSXElement" && !(a.type === "StringLiteral" && AR.test(a.value)));
  }
  return false;
}

for (const file of files) {
  const src = fs.readFileSync(file, "utf8");
  let ast;
  try {
    ast = parse(src, { sourceType: "module", plugins: ["jsx", "typescript"], errorRecovery: true });
  } catch (e) {
    console.error("PARSE FAIL", file, e.message);
    continue;
  }
  const ms = new MagicString(src);
  const used = new Set();
  const ids = new Set();
  let fileKeys = 0;
  const handled = new Set(); // nodes consumed by a merged run
  const lineOf = (pos) => src.slice(0, pos).split("\n").length;

  // pick names that don't collide with the file's own identifiers
  (function collect(n) {
    if (!n || typeof n.type !== "string") return;
    if (n.type === "Identifier") ids.add(n.name);
    for (const k in n) {
      if (k === "loc" || k === "start" || k === "end") continue;
      const v = n[k];
      if (Array.isArray(v)) v.forEach(collect);
      else if (v && typeof v.type === "string") collect(v);
    }
  })(ast.program);
  const T = ids.has("t") ? "tr" : "t";
  const TX = ids.has("tx") ? "trx" : "tx";

  const addKey = (k) => {
    k = norm(k);
    if (!k) return;
    (keys[k] ??= []).includes(file) || keys[k].push(file);
    fileKeys++;
  };

  function processChildren(children) {
    let run = [];
    const flush = () => {
      const hasAr = run.some((c) => c.type === "JSXText" && AR.test(c.value));
      const exprs = run.filter((c) => c.type === "JSXExpressionContainer");
      if (hasAr && exprs.length) {
        // trim pure-whitespace text at the run's ends
        while (run.length && run[0].type === "JSXText" && !run[0].value.trim()) run.shift();
        while (run.length && run[run.length - 1].type === "JSXText" && !run[run.length - 1].value.trim()) run.pop();
        let text = "";
        let i = 0;
        const ex = [];
        for (const c of run) {
          if (c.type === "JSXText") text += jsxClean(c.value);
          else { text += `{${i++}}`; ex.push(c); }
        }
        const first = run[0], last = run[run.length - 1];
        // keep the outer whitespace of the run outside the t() call
        const lead = first.type === "JSXText" ? first.value.match(/^\s*/)[0] : "";
        const trail = last.type === "JSXText" ? last.value.match(/\s*$/)[0] : "";
        const leadSp = lead && !lead.includes("\n") ? " " : "";
        const trailSp = trail && !trail.includes("\n") ? " " : "";
        const core = text.trim();
        addKey(core);
        let opened = false;
        for (const c of run) {
          handled.add(c);
          if (c.type === "JSXText") {
            if (c.end > c.start) ms.remove(c.start, c.end);
            if (!opened) { ms.appendLeft(c.start, `${leadSp ? `{" "}` : ""}{${T}(${JSON.stringify(core)}, [`); opened = true; }
          } else {
            if (!opened) { ms.appendLeft(c.start, `{${T}(${JSON.stringify(core)}, [`); opened = true; }
            if (c.expression.start > c.start) ms.remove(c.start, c.expression.start);
            if (c.end > c.expression.end) ms.remove(c.expression.end, c.end);
            if (c !== ex[ex.length - 1]) ms.appendLeft(c.expression.end, ", ");
          }
        }
        ms.appendLeft(last.end, `])}${trailSp ? `{" "}` : ""}`);
        used.add(T);
      }
      run = [];
    };
    for (const c of children) {
      if (c.type === "JSXText" || (c.type === "JSXExpressionContainer" && isSafeScalar(c.expression))) run.push(c);
      else flush();
    }
    flush();
  }

  function walk(n, anc, inFn) {
    if (!n || typeof n.type !== "string") return;
    const parent = anc[anc.length - 1];
    if (handled.has(n) && n.type === "JSXText") return;

    if (n.type === "JSXElement" || n.type === "JSXFragment") {
      const tag = n.openingElement?.name?.name;
      if (tag === "script" || tag === "style") return;
      processChildren(n.children);
    }

    if (n.type === "JSXText" && AR.test(n.value) && !handled.has(n)) {
      const raw = n.value;
      const lead = raw.match(/^\s*/)[0], trail = raw.match(/\s*$/)[0];
      const core = jsxClean(raw).trim();
      addKey(core);
      const ls = lead && !lead.includes("\n") ? `{" "}` : lead;
      const ts = trail && !trail.includes("\n") ? `{" "}` : trail;
      ms.overwrite(n.start, n.end, `${ls}{${T}(${JSON.stringify(core)})}${ts}`);
      used.add(T);
      return;
    }

    if (n.type === "JSXAttribute") {
      const name = typeof n.name.name === "string" ? n.name.name : n.name.name?.name;
      const v = n.value;
      if (v?.type === "StringLiteral" && AR.test(v.value) && !SKIP_ATTRS.has(name)) {
        addKey(v.value);
        ms.overwrite(v.start, v.end, `{${T}(${JSON.stringify(norm(v.value))})}`);
        used.add(T);
        return;
      }
      if (v?.type === "JSXExpressionContainer" && TEXT_ATTRS.has(name) && ["Identifier", "MemberExpression", "OptionalMemberExpression"].includes(v.expression.type)) {
        ms.appendLeft(v.expression.start, `${TX}(`);
        ms.appendLeft(v.expression.end, ")");
        used.add(TX);
        return;
      }
    }

    if (n.type === "JSXExpressionContainer" && !handled.has(n) && (parent?.type === "JSXElement" || parent?.type === "JSXFragment")) {
      const e = n.expression;
      if (["MemberExpression", "OptionalMemberExpression"].includes(e.type) || (e.type === "Identifier" && e.name !== "children")) {
        ms.appendLeft(e.start, `${TX}(`);
        ms.appendLeft(e.end, ")");
        used.add(TX);
        return;
      }
    }

    if ((n.type === "StringLiteral" && AR.test(n.value)) || (n.type === "TemplateLiteral" && n.quasis.some((q) => AR.test(q.value.cooked ?? "")))) {
      const reason = skipReason(n, parent, anc, inFn);
      if (reason) {
        // module-level data is rendered elsewhere through tx(): it still needs a translation
        if ((reason === "module-level" || reason === "done") && n.type === "StringLiteral") addKey(n.value);
        if (reason === "done") return;
        leftovers.push(`${file}:${lineOf(n.start)} [${reason}] ${norm(src.slice(n.start, n.end)).slice(0, 70)}`);
      } else if (n.type === "StringLiteral") {
        addKey(n.value);
        ms.overwrite(n.start, n.end, `${T}(${JSON.stringify(norm(n.value))})`);
        used.add(T);
        return;
      } else {
        let text = "";
        n.quasis.forEach((q, i) => { text += q.value.cooked.replace(/[{}]/g, ""); if (i < n.expressions.length) text += `{${i}}`; });
        const core = norm(text);
        addKey(core);
        const exs = n.expressions.map((e) => src.slice(e.start, e.end));
        // inner expressions are copied verbatim; walk them first is unnecessary (rarely Arabic)
        ms.overwrite(n.start, n.end, `${T}(${JSON.stringify(core)}, [${exs.join(", ")}])`);
        used.add(T);
        return;
      }
    }

    const fnHere = inFn || FN.has(n.type);
    anc.push(n);
    for (const k in n) {
      if (k === "loc" || k === "start" || k === "end" || k === "leadingComments" || k === "trailingComments") continue;
      const v = n[k];
      if (Array.isArray(v)) v.forEach((c) => walk(c, anc, fnHere));
      else if (v && typeof v.type === "string") walk(v, anc, fnHere);
    }
    anc.pop();
  }

  function skipReason(n, parent, anc, inFn) {
    if (n.type === "TemplateLiteral" && parent?.type === "TaggedTemplateExpression") return "tagged";
    if (!inFn) return "module-level";
    if (!parent) return "no-parent";
    if (parent.type.startsWith("TS")) return "type";
    if (parent.type === "JSXAttribute") return "attr";
    if (parent.type === "ImportDeclaration" || parent.type.startsWith("Export")) return "import";
    if (parent.type === "ObjectProperty" && parent.key === n) return "obj-key";
    if (parent.type === "ObjectProperty" && DATA_KEYS.has(parent.key?.name ?? parent.key?.value)) return "data-key";
    if (parent.type === "BinaryExpression" && ["===", "!==", "==", "!="].includes(parent.operator)) return "compare";
    if (parent.type === "SwitchCase") return "case";
    if (parent.type === "MemberExpression" && parent.property === n) return "index";
    if (parent.type === "CallExpression" || parent.type === "OptionalCallExpression") {
      const c = parent.callee;
      const prop = c.property?.name;
      if (c.type === "Identifier" && (c.name === "t" || c.name === "tx" || c.name === "tr")) return "done";
      if (c.object?.name === "console") return "console";
      if (prop && SKIP_CALLEE_PROPS.has(prop)) return "lookup";
    }
    if (parent.type === "NewExpression" && parent.callee.name === "RegExp") return "regex";
    return null;
  }

  walk(ast.program, [], false);

  if (used.size && !dry) {
    const imports = ast.program.body.filter((s) => s.type === "ImportDeclaration");
    const names = [...used].map((u) => (u === "tr" ? "t as tr" : u === "trx" ? "tx as trx" : u)).join(", ");
    const line = `import { ${names} } from "@/i18n";\n`;
    if (imports.length) ms.appendLeft(imports[imports.length - 1].end, "\n" + line.trimEnd());
    else ms.prepend(line);
    fs.writeFileSync(file, ms.toString());
  }
  console.log(`${file}: ${fileKeys} strings${dry ? " (dry)" : ""}`);
}

if (!dry) fs.writeFileSync("scripts/i18n/keys.json", JSON.stringify(keys, null, 1));
fs.writeFileSync("scripts/i18n/leftovers.txt", leftovers.join("\n") + "\n");
console.log(`leftovers: ${leftovers.length} (scripts/i18n/leftovers.txt)`);
