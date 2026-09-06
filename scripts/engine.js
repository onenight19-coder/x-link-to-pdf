(function(host){
'use strict';
async function makeArticlePDF(blocks,options){
 const {PDFDocument,rgb,PDFName,PDFString}=options.pdfLib||host.PDFLib;
 const kit=options.fontkit||host.fontkit;
 const doc=await PDFDocument.create();doc.registerFontkit(kit);
 const font=await doc.embedFont(options.fontBytes,{subset:false});
 doc.setTitle(options.title||'文章存档');doc.setAuthor(options.author||'');doc.setCreator('文章存档');doc.setLanguage('zh-CN');
 const warnings=[];let page,y,pages=0;const margin=44, bottom=42, pw=595.28, ph=841.89, width=pw-margin*2,bodySize=options.size||11;
 const ink=rgb(.08,.12,.20),grey=rgb(.37,.42,.50),blue=rgb(.08,.23,.75);
 const charSet=new Set(font.getCharacterSet());const missing=new Set();
 const emoji=options.emojiBytes?await doc.embedFont(options.emojiBytes,{subset:true}):null;const emojiSet=new Set(emoji?emoji.getCharacterSet():[]);
 function chosen(c){return !charSet.has(c.codePointAt(0))&&emojiSet.has(c.codePointAt(0))?emoji:font;}
 function measure(t,size){return Array.from(t).reduce((w,c)=>w+chosen(c).widthOfTextAtSize(c,size),0);}
 function clean(s){return String(s).replace(/\r\n?/g,'\n').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'').replace(/\t/g,'    ');}
 function valid(s){for(const c of s)if(!/\s/.test(c)&&!charSet.has(c.codePointAt(0))&&!emojiSet.has(c.codePointAt(0)))missing.add(c);return s;}
 function newPage(landscape=false){page=doc.addPage(landscape?[ph,pw]:[pw,ph]);y=page.getHeight()-margin;pages++;}
 function need(h){if(!page||y-h<bottom)newPage();}
 function lines(text,size,w){const out=[];for(const line of clean(text).split('\n')){let row='';for(const c of line){if(row && measure(row+c,size)>w){out.push(row);row=c;}else row+=c;}out.push(row);}return out;}
 function draw(text,x,baseline,size,color=ink){valid(text);let run='',active=font;function flush(){if(run){page.drawText(run,{x,y:baseline,size,font:active,color});x+=active.widthOfTextAtSize(run,size);run='';}}for(const c of text){const next=chosen(c);if(next!==active){flush();active=next;}run+=c;}flush();}
 function para(text,size,color=ink,indent=0,gap=8,heading=false){const rows=lines(text,size,width-indent);if(heading)need(Math.min(rows.length,3)*size*1.65+bodySize*2);for(const line of rows){need(size*1.75);draw(line,margin+indent,y-size,size,color);y-=size*1.75;}y-=gap;}
 newPage();
 let n=0;
 for(const b of blocks){
  if(options.onProgress)options.onProgress(++n,blocks.length);
  if(b.type==='title'){para(b.text,21,ink,0,20,true);continue;}
  if(b.type==='link'){const rows=lines(b.text,10,width);for(const line of rows){need(20);draw(line,margin,y-10,10,blue);if(/^https:\/\//.test(b.href||'')){const annotation=doc.context.obj({Type:'Annot',Subtype:'Link',Rect:[margin,y-14,margin+measure(line,10),y+2],Border:[0,0,0],A:{Type:'Action',S:'URI',URI:PDFString.of(b.href)}});page.node.addAnnot(doc.context.register(annotation));}y-=20;}y-=8;continue;}
  if(b.type==='source'){para(b.text,8,grey,0,12);continue;}
  if(b.type==='heading'){y-=10;para(b.text,b.level<=1?16:13,blue,0,8,true);continue;}
  if(b.type==='image'){
   try{const data=b.data||b.src;if(!/^data:image\/(png|jpeg);base64,/i.test(data))throw new Error('不是嵌入的 PNG/JPEG 图片');const img=/^data:image\/png/i.test(data)?await doc.embedPng(data):await doc.embedJpg(data);const scale=Math.min(width/img.width,560/img.height,1.2);const w=img.width*scale,h=img.height*scale;need(h+24);page.drawImage(img,{x:margin+(width-w)/2,y:y-h,width:w,height:h});y-=h+20;}catch(e){warnings.push('有一张图片无法嵌入 PDF。');para('[图片未导出，请核对原文件]',10,grey);}
   continue;
  }
  if(b.type==='code'){
   const rows=clean(b.text).split('\n');let size=9;let maxW=Math.max(1,...rows.map(t=>measure(t,size)));let avail=width-24;
   // Wide blocks use a landscape page instead of clipping or changing source line breaks.
   let wide=maxW>avail*1.32;
   if(wide){newPage(true);avail=ph-2*margin-24;}
   size=Math.min(9,9*avail/maxW);
   if(size<6){warnings.push('有一个超宽代码块缩小到 '+size.toFixed(1)+' pt，请放大阅读。');}
   const lineH=size*1.55;let index=0;
   while(index<rows.length){let room=Math.floor((y-bottom-24)/lineH);if(room<2){newPage(wide);room=Math.floor((y-bottom-24)/lineH);}const count=Math.min(room,rows.length-index),height=count*lineH+24;
    page.drawRectangle({x:margin,y:y-height,width:page.getWidth()-2*margin,height,color:rgb(.94,.96,.98)});
    rows.slice(index,index+count).forEach((line,i)=>draw(line,margin+12,y-12-size-i*lineH,size));
    y-=height+14;index+=count;if(index<rows.length)newPage(wide);
   }
   if(wide)newPage();continue;
  }
  para(b.text,bodySize,ink,b.type==='list'?12:0,7);
 }
 if(missing.size)warnings.push('字体未覆盖以下字符：'+Array.from(missing).join('')+'。这些字符可能显示为方框。');
 const all=doc.getPages();for(let i=0;i<all.length;i++){const p=all[i];p.drawText(String(i+1)+' / '+all.length,{x:p.getWidth()-margin-45,y:22,size:8,font,color:grey});}
 return {bytes:await doc.save(),pages:all.length,warnings};
}
host.ArticlePDF={makeArticlePDF};
if(typeof module!=='undefined'&&module.exports)module.exports={makeArticlePDF};
})(typeof window!=='undefined'?window:globalThis);
