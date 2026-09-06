(function(host){
'use strict';
function statusId(input){let u;try{u=new URL(input.trim());}catch{throw new Error('请粘贴完整的 X 帖子链接。');}if(!['x.com','www.x.com','twitter.com','www.twitter.com','mobile.twitter.com'].includes(u.hostname)||u.protocol!=='https:')throw new Error('仅支持 https://x.com 或 twitter.com 的帖子链接。');const m=u.pathname.match(/^\/(?:[A-Za-z0-9_]+\/status|i\/web\/status)\/(\d+)\/?$/);if(!m)throw new Error('请使用文章所在帖子的分享链接，格式为 x.com/用户名/status/数字。');return m[1];}
function parseTweet(payload){
 if(payload.code!==200||!payload.tweet)throw new Error('未读取到帖子。可能已删除、需要登录，或读取服务暂不可用。');
 const t=payload.tweet,a=t.article,out=[],warnings=[];
 const title=a?.title||(t.author?.name||'X')+' 的帖子';out.push({type:'title',text:title},{type:'source',text:'来源：'+t.url});
 const image=url=>{if(!url)throw new Error('文章中的图片地址缺失，已停止导出。');out.push({type:'image',src:url});};
 if(a){
  if(!Array.isArray(a.content?.blocks)||!a.content.blocks.some(b=>b.text?.trim()))throw new Error('只取得文章摘要，未取得全文。已停止导出，请稍后重试。');
  if(a.cover_media)image(a.cover_media.media_info?.original_img_url);
  const entries=a.content.entityMap||{};const map=new Map(Array.isArray(entries)?entries.map(e=>[String(e.key),e.value]):Object.entries(entries));const media=new Map((a.media_entities||[]).map(e=>[String(e.media_id),e]));let num=0;
  for(const b of a.content.blocks){
   if(b.type==='atomic'){
    if(!b.entityRanges?.length)throw new Error('有内容块缺少数据，已停止导出。');
    for(const ref of b.entityRanges){const e=map.get(String(ref.key));if(!e)throw new Error('有内容块读取不完整。');
     if(e.type==='MARKDOWN'){const m=String(e.data.markdown||'').match(/^```[^\n]*\n([\s\S]*?)\n?```\s*$/);if(!m)throw new Error('遇到尚未支持的 Markdown 内容，已停止导出。');out.push({type:'code',text:m[1]});}
     else if(e.type==='MEDIA'){for(const item of e.data.mediaItems||[]){const m=media.get(String(item.mediaId));const info=m?.media_info;if(info?.__typename==='ApiImage')image(info.original_img_url);else if(info?.__typename==='ApiVideo'){if(info.preview_image?.original_img_url)image(info.preview_image.original_img_url);out.push({type:'link',text:'视频'+(info.duration_millis?'（'+Math.round(info.duration_millis/1000)+' 秒）':'')+'：点击打开原文观看',href:t.url});warnings.push('视频以封面和可点击的原文链接保留，PDF 内不播放视频。');}else throw new Error('媒体数据读取不完整，请稍后重试。');}}
     else if(e.type!=='DIVIDER')throw new Error('遇到尚未支持的内容块：'+e.type+'，已停止导出。');
    }continue;
   }
   if(!b.text?.trim())continue;
   if(b.type==='ordered-list-item'){num++;out.push({type:'list',text:num+'. '+b.text});continue;}num=0;
   if(b.type.startsWith('header-'))out.push({type:'heading',level:b.type==='header-one'?1:2,text:b.text});
   else out.push({type:b.type==='unordered-list-item'?'list':'paragraph',text:(b.type==='unordered-list-item'?'• ':'')+b.text});
  }
 }else{
  if(/https?:\/\/(?:www\.)?x.com\/i\/article\//.test(t.text||''))throw new Error('检测到长文章，但全文没有返回，已停止导出。');
  if(!t.text&&!t.media?.photos?.length)throw new Error('帖子内容为空。');
  out.push({type:'paragraph',text:t.text||''});for(const p of t.media?.photos||[])image(p.url);
  if(t.media?.videos?.length)warnings.push('视频无法保存在 PDF 中，请通过来源链接观看。');if(t.quote)warnings.push('引用帖未展开，请通过来源链接查看。');warnings.push('仅导出此条帖子，不包含评论和连续帖。');
 }
 return {title,blocks:out,warnings};
}
module.exports={statusId,parseTweet};
})(globalThis);
