import assert from 'node:assert/strict';
import {assertExplicitRequestSchema,validateDocument} from './validate-openapi-request-contracts.mjs';
const typed={type:'object',properties:{action:{type:'string',enum:['read']}}};
const document={openapi:'3.0.3',info:{title:'Fixture',version:'1'},components:{schemas:{Typed:typed,Generic:{type:'object',additionalProperties:true}},requestBodies:{Body:{content:{'application/json':{schema:typed}}}}},paths:{'/fixture':{post:{requestBody:{$ref:'#/components/requestBodies/Body'}}}}};
let cases=0;
for(const schema of [typed,{type:'object',maxProperties:0},{type:'object',additionalProperties:false},{$ref:'#/components/schemas/Typed'},{allOf:[{type:'object'},{properties:{action:{type:'string'}}}]},{anyOf:[typed,{type:'object',maxProperties:0}]},{type:'object',properties:{context:{}},anyOf:[{},typed]}, {allOf:[typed,{anyOf:[{},typed]}]}]){
  assert.doesNotThrow(()=>assertExplicitRequestSchema(schema,document));cases++;
}
for(const schema of [undefined,null,true,false,{}, {type:'object'}, {type:'object',additionalProperties:true}, {type:'object',properties:{},minProperties:1}, {type:'object',description:'Complete typed API',required:['undeclared']},{$ref:'#/components/schemas/Generic'},{$ref:'#/components/schemas/Missing'},{$ref:'https://example.invalid/schema'},{anyOf:[typed,{type:'object'}]},{oneOf:[typed,{}]},{allOf:[{type:'object'},{}]}, {type:'object',anyOf:[{properties:{field:{}}},{}]}, {$ref:'#/components/schemas/Generic',properties:{ignoredSibling:{type:'string'}}}, {type:'string',properties:{fake:{}}}]){
  assert.throws(()=>assertExplicitRequestSchema(schema,document));cases++;
}
const cyclic=structuredClone(document);cyclic.components.schemas.Cycle={allOf:[{$ref:'#/components/schemas/Cycle'}]};
assert.throws(()=>assertExplicitRequestSchema({$ref:'#/components/schemas/Cycle'},cyclic));cases++;
assert.deepEqual(validateDocument(document),{post_operations:1,errors:[]});cases++;
for(const bad of [{}, {content:{'application/json':{schema:{type:'object'}}}}, {content:{'application/json':{schema:typed},'application/problem+json':{schema:{}}}}]){
  const changed=structuredClone(document);changed.paths['/fixture'].post.requestBody=bad;assert.equal(validateDocument(changed).errors.length,1);cases++;
}
const added=structuredClone(document);added.paths['/new-anonymous-route']={post:{requestBody:{content:{'application/json':{schema:{type:'object',additionalProperties:true}}}}}};
assert(validateDocument(added).errors.some(e=>e.includes('/new-anonymous-route')));cases++;
const siblings=structuredClone(document);siblings.paths['/fixture'].post.requestBody={...siblings.paths['/fixture'].post.requestBody,description:'Ignored sibling'};
assert(validateDocument(siblings).errors.some(e=>e.includes('Reference Object siblings')));cases++;
console.log(JSON.stringify({passed:cases,failed:0,network_requests:0}));
