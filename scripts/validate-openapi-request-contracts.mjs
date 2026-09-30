import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const PUBLIC_SPECS=['openapi.json','openapi.yaml','openapi.agent.json','openapi.agent.sandbox.json','api/openapi.json','api/openapi.yaml','api/openapi.agent.json','api/openapi.agent.sandbox.json'];

function referenced(value,document,seen=new Set()){
  if(!value?.$ref)return value;
  const ref=value.$ref;
  if(typeof ref!=='string'||!ref.startsWith('#/'))throw Error('Only local references are allowed');
  if(seen.has(ref))throw Error('Cyclic top-level reference: '+ref);
  const target=ref.slice(2).split('/').map(k=>decodeURIComponent(k).replace(/~1/g,'/').replace(/~0/g,'~')).reduce((v,k)=>v?.[k],document);
  if(target===undefined)throw Error('Unresolved reference: '+ref);
  const {$ref,...siblings}=value;
  const resolved=referenced(target,document,new Set([...seen,ref]));
  // OpenAPI 3.0 Reference Object siblings are ignored by consumers.
  return String(document.openapi).startsWith('3.0')||!Object.keys(siblings).length?resolved:{allOf:[resolved,siblings]};
}

// Inspect every alternative, so a typed branch cannot hide an anonymous escape branch.
function alternatives(schema,document,seen=new Set()){
  if(schema===false)return [];
  if(schema===true)return [[]];
  if(!schema||typeof schema!=='object'||Array.isArray(schema))throw Error('Missing or invalid schema');
  if(seen.has(schema))throw Error('Cyclic top-level schema composition');
  const next=new Set([...seen,schema]);
  if(schema.$ref)return alternatives(referenced(schema,document),document,next);
  let result=[[schema]];
  const combine=choices=>{
    if(result.length*choices.length>4096)throw Error('Top-level schema alternatives exceed audit bound');
    result=result.flatMap(left=>choices.map(right=>[...left,...right]));
  };
  if(schema.allOf){
    if(!Array.isArray(schema.allOf)||!schema.allOf.length)throw Error('Invalid allOf');
    for(const child of schema.allOf)combine(alternatives(child,document,next));
  }
  for(const keyword of ['anyOf','oneOf'])if(schema[keyword]){
    if(!Array.isArray(schema[keyword])||!schema[keyword].length)throw Error('Invalid '+keyword);
    combine(schema[keyword].flatMap(child=>alternatives(child,document,next)));
  }
  return result;
}

export function assertExplicitRequestSchema(schema,document){
  const branches=alternatives(schema,document);
  if(!branches.length)throw Error('Request schema accepts no body');
  for(const atoms of branches){
    const objectTyped=atoms.some(s=>s.type==='object');
    const fields=atoms.some(s=>s.properties&&typeof s.properties==='object'&&!Array.isArray(s.properties)&&Object.keys(s.properties).length>0);
    const empty=atoms.some(s=>s.maxProperties===0||s.additionalProperties===false);
    if(!objectTyped||(!fields&&!empty))throw Error('Missing explicit object fields or an intentional empty-object contract');
  }
}

export function validateDocument(document){
  const errors=[];let posts=0;
  if(!String(document.openapi||'').startsWith('3.'))errors.push('Missing OpenAPI 3.x version');
  if(!document.info?.title||!document.info?.version)errors.push('Missing info.title or info.version');
  if(!document.paths||!Object.keys(document.paths).length)errors.push('No paths');
  for(const [route,item]of Object.entries(document.paths||{})){
    try{
      const operation=referenced(item,document)?.post;if(!operation)continue;posts++;
      const body=referenced(operation.requestBody,document);
      const media=Object.entries(body?.content||{}).filter(([type])=>type==='application/json'||type.endsWith('+json'));
      if(!media.length)throw Error('POST is missing a JSON request contract');
      for(const [type,content]of media){
        try{assertExplicitRequestSchema(content.schema,document);}catch(error){throw Error(type+': '+error.message);}
      }
    }catch(error){errors.push(route+': '+error.message);}
  }
  if(!posts)errors.push('No POST operations inspected');
  return{post_operations:posts,errors};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const root=path.resolve(process.argv[2]||'.');let failed=false;
  for(const name of PUBLIC_SPECS){
    try{
      const result=validateDocument(JSON.parse(fs.readFileSync(path.join(root,name),'utf8')));
      console.log(JSON.stringify({file:name,...result}));failed||=result.errors.length>0;
    }catch(error){console.error(name+': '+error.message);failed=true;}
  }
  if(failed)process.exitCode=1;
}
