/* Safwah DOCX generator (self-contained Office Open XML, ZIP stored entries).
 * Written for Safwah, no external library or endpoint required.
 */
(function(global){'use strict';
 const utf8=new TextEncoder();
 const xml=s=>String(s??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
 const crcTable=new Uint32Array(256).map((_,n)=>{let c=n;for(let i=0;i<8;i++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0});
 function crc32(a){let c=0xffffffff;for(const v of a)c=crcTable[(c^v)&255]^(c>>>8);return(c^0xffffffff)>>>0}
 const writeU16=(v,o,n)=>v.setUint16(o,n,true),writeU32=(v,o,n)=>v.setUint32(o,n,true);
 const join=buffers=>{const size=buffers.reduce((n,x)=>n+x.length,0),out=new Uint8Array(size);let at=0;for(const b of buffers){out.set(b,at);at+=b.length}return out};
 function zip(entries){const locals=[],directories=[];let off=0;for(const [name,content] of Object.entries(entries)){
  const nameBytes=utf8.encode(name),payload=utf8.encode(content),crc=crc32(payload);
  const local=new Uint8Array(30+nameBytes.length),lv=new DataView(local.buffer);writeU32(lv,0,0x04034b50);writeU16(lv,4,20);writeU16(lv,6,0x800);writeU16(lv,8,0);writeU32(lv,14,crc);writeU32(lv,18,payload.length);writeU32(lv,22,payload.length);writeU16(lv,26,nameBytes.length);local.set(nameBytes,30);
  const central=new Uint8Array(46+nameBytes.length),cv=new DataView(central.buffer);writeU32(cv,0,0x02014b50);writeU16(cv,4,20);writeU16(cv,6,20);writeU16(cv,8,0x800);writeU32(cv,16,crc);writeU32(cv,20,payload.length);writeU32(cv,24,payload.length);writeU16(cv,28,nameBytes.length);writeU32(cv,42,off);central.set(nameBytes,46);
  locals.push(local,payload);directories.push(central);off+=local.length+payload.length;
 }
 const directory=join(directories),end=new Uint8Array(22),ev=new DataView(end.buffer);writeU32(ev,0,0x06054b50);writeU16(ev,8,directories.length);writeU16(ev,10,directories.length);writeU32(ev,12,directory.length);writeU32(ev,16,off);
 return join([...locals,directory,end]);
 }
 function build(plainText,title='تقرير صفوة'){
  const lines=String(plainText??'').split(/\r?\n/).slice(0,4500);
  const para=(line,i)=>{const heading=i===0||i===1||/^(الأطراف|الحسابات|الملكية|القرارات|التنفيذ|التنبيهات)$/.test(line.trim());const align='<w:pPr><w:jc w:val="right"/><w:spacing w:after="150" w:line="330" w:lineRule="auto"/></w:pPr>';const text='<w:r><w:rPr><w:rtl/><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="24"/><w:szCs w:val="24"/>'+(heading?'<w:b/><w:color w:val="14364C"/>':'')+'</w:rPr><w:t xml:space="preserve">'+xml(line||' ')+'</w:t></w:r>';return '<w:p>'+align+text+'</w:p>'};
  const body=lines.map(para).join('');
  const doc='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+body+'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1000" w:right="1100" w:bottom="1000" w:left="1100" w:header="700" w:footer="700" w:gutter="0"/><w:bidi/></w:sectPr></w:body></w:document>';
  const props='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>'+xml(title)+'</dc:title><dc:creator>Safwah Investment</dc:creator></cp:coreProperties>';
  return zip({
    '[Content_Types].xml':'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>',
    '_rels/.rels':'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>',
    'docProps/core.xml':props,'word/document.xml':doc
  });
 }
 global.SafwahDocx={build};
})(typeof window!=='undefined'?window:globalThis);
