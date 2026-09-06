#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {statusId,parseTweet}=require('./x-link.js');
const {makeArticlePDF}=require('./engine.js');
const root=path.resolve(__dirname,'..');
function download(url,maxBytes){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'xpdf-'));const file=path.join(dir,'download');
 try{execFileSync('curl',['--fail','--silent','--show-error','--proto','=https','--max-time','60','--max-filesize',String(maxBytes),'--output',file,url],{stdio:['ignore','ignore','pipe'],timeout:65000});const b=fs.readFileSync(file);if(b.length>maxBytes)throw Error('Download exceeds size limit');return b;}finally{fs.rmSync(dir,{recursive:true,force:true});}
}
async function main(){
 const [url,output,...extra]=process.argv.slice(2);
 if(!url||!output||extra.length){console.error('Usage: node scripts/export.cjs "https://x.com/user/status/123" output.pdf');process.exitCode=2;return;}
 const id=statusId(url);if(path.extname(output).toLowerCase()!=='.pdf')throw Error('Output must end with .pdf');if(fs.existsSync(output))throw Error('Output already exists; choose another filename');
 console.error('Reading public post through FxTwitter…');
 const data=parseTweet(JSON.parse(download('https://api.fxtwitter.com/status/'+id,12*1024*1024)));
 for(const b of data.blocks.filter(b=>b.type==='image')){
  const u=new URL(b.src);if(u.protocol!=='https:'||u.hostname!=='pbs.twimg.com'||u.username||u.password)throw Error('Unsupported media origin');
  const bytes=download(u.href,15*1024*1024);const type=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'png':bytes[0]===255&&bytes[1]===216?'jpeg':null;
  if(!type)throw Error('Unsupported image format');b.src='data:image/'+type+';base64,'+bytes.toString('base64');
 }
 const spec=require('./font.json');const cache=path.join(root,'.cache');fs.mkdirSync(cache,{recursive:true});const fontPath=path.join(cache,'font.otf');
 let font=fs.existsSync(fontPath)?fs.readFileSync(fontPath):download(spec.url,25*1024*1024);
 if(crypto.createHash('sha256').update(font).digest('hex')!==spec.sha256)throw Error('Font checksum mismatch; upstream font may have changed. Do not disable this check.');
 if(!fs.existsSync(fontPath))fs.writeFileSync(fontPath,font);
 const result=await makeArticlePDF(data.blocks,{pdfLib:require('pdf-lib'),fontkit:require('@pdf-lib/fontkit'),fontBytes:font,title:data.title});
 if(result.warnings.some(w=>w.includes('图片无法')))throw Error('Image embedding failed; PDF was not saved');
 fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});fs.writeFileSync(output,result.bytes,{flag:'wx'});
 console.log(JSON.stringify({file:path.resolve(output),title:data.title,pages:result.pages,images:data.blocks.filter(b=>b.type==='image').length,codeBlocks:data.blocks.filter(b=>b.type==='code').length,warnings:[...new Set([...data.warnings,...result.warnings])]},null,2));
}
main().catch(e=>{console.error('Export failed: '+e.message);process.exitCode=1;});
