// Syntax-only validation, NOT a substitute for npm run typecheck / native builds.
const fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript');}catch{console.error('Install dependencies first to run this syntax check.');process.exit(1);}
let count=0,errors=0;
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(['node_modules','research','preview'].includes(e.name))continue;const file=path.join(dir,e.name);if(e.isDirectory())walk(file);else if(/\.(tsx?|jsx)$/.test(e.name)&&!e.name.endsWith('.d.ts')){count++;const r=ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}});for(const d of r.diagnostics||[]){if(d.category===ts.DiagnosticCategory.Error){errors++;console.error(file+': '+ts.flattenDiagnosticMessageText(d.messageText,'\n'));}}}}}
walk(path.join(__dirname,'..'));console.log(`${count} TypeScript/TSX files checked for syntax; ${errors} syntax errors.`);process.exitCode=errors?1:0;
