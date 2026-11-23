// Pripravi samostojne dokumente HTML iz Markdowna za branje in tisk.
import { join } from "node:path";

const base = import.meta.dir;
const docs = [
  ["Testni-plan-HelpDesk", "Testni plan – HelpDesk 1.1"],
  ["Utemeljitev-postavk", "Utemeljitev postavk testnega plana"],
  ["Povzetek-sprememb-osnutka", "Povzetek sprememb osnutka"],
  ["agent_threads", "Pogovori z agentom"],
];

for (const [name, title] of docs) {
  const md = await Bun.file(join(base, `${name}.md`)).text();
  const body = Bun.markdown.html(md, { tables: true });
  const html = `<!doctype html>
<html lang="sl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
body{font:14px/1.5 system-ui,Segoe UI,sans-serif;max-width:1100px;margin:24px auto;padding:0 16px;color:#1d1d1f;background:#fff}
h1{font-size:24px}h2{font-size:19px;margin-top:32px;border-bottom:1px solid #ddd;padding-bottom:4px}h3{font-size:15px;margin-top:20px}
table{border-collapse:collapse;width:100%;margin:8px 0 16px;font-size:12.5px}
th,td{border:1px solid #ccc;padding:4px 6px;vertical-align:top;text-align:left}th{background:#f2f2f4}
code{font-family:Consolas,monospace;background:#f4f4f6;padding:0 3px}
pre{background:#f7f7f9;border:1px solid #e2e2e6;padding:10px;overflow-x:auto}pre code{background:none}
blockquote{border-left:3px solid #999;margin:8px 0;padding:2px 12px;color:#444}
@media print{body{margin:0;max-width:none}tr,pre{break-inside:avoid}}
</style></head><body>
${body}
</body></html>
`;
  await Bun.write(join(base, `${name}.html`), html);
  console.log("OK", name, html.length);
}
