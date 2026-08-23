import {readFileSync} from 'node:fs'; import {strict as assert} from 'node:assert'
const service=readFileSync('src/iaf01/service.ts','utf8'); const packageJson=readFileSync('package.json','utf8')
const cases=[
 ['no provider sdk',!/(google-cloud|aws-sdk|oci-sdk|azure\/identity)/i.test(packageJson)],
 ['no production authorization',!/production authorization|production ready|deploy/i.test(service)],
 ['no real-data marker',!/real data|customer data|client data/i.test(service)],
 ['no external ai activation',!/openai|anthropic|gemini|invokeLLM|embedding/i.test(service)],
 ['no direct API database import',!/postgres-adapter/.test(service)],
 ['server-derived principal only',!/body\.principal|body\.context|body\.permissions|body\.roles/.test(service)],
 ['default-deny unrecognized principal',/\!\(p in contexts\)/.test(service)],
]
for(const [name,passed] of cases) assert.equal(passed,true,name)
console.log(`IAF01_NEGATIVE=${cases.length}/${cases.length}`)
