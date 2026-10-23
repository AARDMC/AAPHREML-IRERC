const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const allowedPublicFunctions = (name) => name === "doGet" || /^api[A-Z0-9]/.test(name);

function listFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(fullPath) : [fullPath];
  });
}

let appsScriptCount = 0;
let inlineScriptCount = 0;
const publicFunctionViolations = [];

for (const filePath of [path.join(root, "Code.gs"), ...listFiles(path.join(root, "server"))]) {
  if (!filePath.endsWith(".gs")) continue;

  const source = fs.readFileSync(filePath, "utf8");
  new vm.Script(source, { filename: path.relative(root, filePath) });
  appsScriptCount++;

  for (const [, name] of source.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)) {
    const isEntrypoint = path.basename(filePath) === "Code.gs" && allowedPublicFunctions(name);
    if (!isEntrypoint && !name.endsWith("_")) {
      publicFunctionViolations.push(`${path.relative(root, filePath)}: ${name}`);
    }
  }
}

if (publicFunctionViolations.length) {
  throw new Error(`Unexpected public Apps Script functions:\n${publicFunctionViolations.join("\n")}`);
}

for (const filePath of [path.join(root, "Index.html"), ...listFiles(path.join(root, "client")), path.join(root, "preview.html")]) {
  if (!filePath.endsWith(".html")) continue;

  const html = fs.readFileSync(filePath, "utf8");
  for (const [, attributes, script] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    const type = (attributes.match(/\btype\s*=\s*["']([^"']+)["']/i) || [])[1] || "";
    if ((type && !/(javascript|ecmascript|module)/i.test(type)) || !script.trim()) continue;
    new vm.Script(script, { filename: `${path.relative(root, filePath)}#inline-${inlineScriptCount + 1}` });
    inlineScriptCount++;
  }
}

const previewPath = path.join(root, "preview.html");
const preview = fs.readFileSync(previewPath, "utf8");
if (fs.existsSync(path.join(root, "Signature.png"))) {
  throw new Error("Signature.png must not be present in the repository.");
}
if (/SIGNATURE_FILE_ID|Official Chairperson Signature|\bSystem Live\b/i.test(preview)) {
  throw new Error("The preview contains a signature reference or an unverified live claim.");
}
if (/\b(?:password|passwd)\s*[:=]\s*["'][^"'\r\n]{4,}["']/i.test(preview)) {
  throw new Error("A fixed password literal was found in the preview.");
}

const logoPath = path.join(root, "Logo File.png");
const publicLogo = `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`;
const embeddedImages = [...preview.matchAll(/data:image\/(?:png|jpeg|jpg|gif|webp);base64,[A-Za-z0-9+/=]+/g)]
  .map(([image]) => image);
if (embeddedImages.length !== 1 || embeddedImages[0] !== publicLogo) {
  throw new Error("The preview must embed only the public logo.");
}

console.log(
  `Validated ${appsScriptCount} Apps Script files, ${inlineScriptCount} inline scripts, public GAS exports, and preview assets.`
);
