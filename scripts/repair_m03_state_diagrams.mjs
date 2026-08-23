import fs from 'node:fs';
const file = 'docs/architecture/state-machines.md';
let text = fs.readFileSync(file, 'utf8');
text = text.replace(/```mermaid-RES-[^\n]+: stateDiagram-v2\n([\s\S]*?)(?=\n## |$)/g, (_match, body) => `\`\`\`mermaid\nstateDiagram-v2\n${body.trim()}\n\`\`\`\n`);
fs.writeFileSync(file, text);
console.log('M03_STATE_DIAGRAMS_REPAIRED');
