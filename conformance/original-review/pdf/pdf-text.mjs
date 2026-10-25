// amos-pdf-text/1: deterministic text-layer extraction for exact passage review.
// The same original bytes and this version always produce the same text and offsets,
// so anyone holding the original PDF can re-run it and check a reviewed passage.
// It reads the existing text layer only: no OCR, no layout guessing beyond spacing.
// pdf-lib is loaded on first use, so modules that import this file start without it.
let PDFDocument,PDFName,PDFDict,PDFArray,PDFRef,PDFNumber,PDFString,PDFHexString,PDFRawStream,PDFStream,decodePDFRawStream,ParseSpeeds,StandardFont,FontNames,loading=null;
function loadPdfLib(){
  loading??=Promise.all([import('pdf-lib'),import('@pdf-lib/standard-fonts')]).then(([lib,fonts])=>{
    ({PDFDocument,PDFName,PDFDict,PDFArray,PDFRef,PDFNumber,PDFString,PDFHexString,PDFRawStream,PDFStream,decodePDFRawStream,ParseSpeeds}=lib);
    StandardFont=fonts.Font;FontNames=fonts.FontNames;
  });
  return loading;
}

export const PDF_TEXT_EXTRACTOR='amos-pdf-text/1';
export const PDF_TEXT_LIMITS=Object.freeze({max_bytes:1000000,max_pages:60,max_text_units:100000,max_inflated_bytes_per_stream:16777216,max_inflated_bytes_total:50331648,max_content_bytes:8388608,max_operations:2000000,max_form_depth:6,max_unmapped_ratio:0.02,min_glyphs:20});
const fail=(code,detail)=>{throw Object.assign(new Error(code),{code,status:422,pdf_text_error:true,...(detail?{detail}:{})});};
const ours=error=>error?.pdf_text_error===true;

// ---------------------------------------------------------------- encodings
const range=(from,to)=>Array.from({length:to-from+1},(_,i)=>from+i);
function asciiBase(){const t=new Array(256).fill(null);for(const c of range(0x20,0x7e))t[c]=String.fromCharCode(c);return t;}
const WIN_ANSI=(()=>{const t=asciiBase();const high={0x80:0x20ac,0x82:0x201a,0x83:0x192,0x84:0x201e,0x85:0x2026,0x86:0x2020,0x87:0x2021,0x88:0x2c6,0x89:0x2030,0x8a:0x160,0x8b:0x2039,0x8c:0x152,0x8e:0x17d,0x91:0x2018,0x92:0x2019,0x93:0x201c,0x94:0x201d,0x95:0x2022,0x96:0x2013,0x97:0x2014,0x98:0x2dc,0x99:0x2122,0x9a:0x161,0x9b:0x203a,0x9c:0x153,0x9e:0x17e,0x9f:0x178};
  for(const [c,u] of Object.entries(high))t[c]=String.fromCodePoint(u);for(const c of [0x7f,0x81,0x8d,0x8f,0x90,0x9d])t[c]='•';
  for(const c of range(0xa1,0xff))t[c]=String.fromCharCode(c);t[0xa0]=' ';t[0xad]='-';return t;})();
const MAC_ROMAN=(()=>{const t=asciiBase();const u=[0xc4,0xc5,0xc7,0xc9,0xd1,0xd6,0xdc,0xe1,0xe0,0xe2,0xe4,0xe3,0xe5,0xe7,0xe9,0xe8,0xea,0xeb,0xed,0xec,0xee,0xef,0xf1,0xf3,0xf2,0xf4,0xf6,0xf5,0xfa,0xf9,0xfb,0xfc,0x2020,0xb0,0xa2,0xa3,0xa7,0x2022,0xb6,0xdf,0xae,0xa9,0x2122,0xb4,0xa8,0x2260,0xc6,0xd8,0x221e,0xb1,0x2264,0x2265,0xa5,0xb5,0x2202,0x2211,0x220f,0x3c0,0x222b,0xaa,0xba,0x3a9,0xe6,0xf8,0xbf,0xa1,0xac,0x221a,0x192,0x2248,0x2206,0xab,0xbb,0x2026,0x20,0xc0,0xc3,0xd5,0x152,0x153,0x2013,0x2014,0x201c,0x201d,0x2018,0x2019,0xf7,0x25ca,0xff,0x178,0x2044,0xa4,0x2039,0x203a,0xfb01,0xfb02,0x2021,0xb7,0x201a,0x201e,0x2030,0xc2,0xca,0xc1,0xcb,0xc8,0xcd,0xce,0xcf,0xcc,0xd3,0xd4,null,0xd2,0xda,0xdb,0xd9,0x131,0x2c6,0x2dc,0xaf,0x2d8,0x2d9,0x2da,0xb8,0x2dd,0x2db,0x2c7];
  u.forEach((x,i)=>{t[0x80+i]=x===null?null:String.fromCodePoint(x);});return t;})();
const STANDARD=(()=>{const t=asciiBase();t[0x27]='’';t[0x60]='‘';const high={0xa1:0xa1,0xa2:0xa2,0xa3:0xa3,0xa4:0x2044,0xa5:0xa5,0xa6:0x192,0xa7:0xa7,0xa8:0xa4,0xa9:0x27,0xaa:0x201c,0xab:0xab,0xac:0x2039,0xad:0x203a,0xae:0xfb01,0xaf:0xfb02,0xb1:0x2013,0xb2:0x2020,0xb3:0x2021,0xb4:0xb7,0xb6:0xb6,0xb7:0x2022,0xb8:0x201a,0xb9:0x201e,0xba:0x201d,0xbb:0xbb,0xbc:0x2026,0xbd:0x2030,0xbf:0xbf,0xc1:0x60,0xc2:0xb4,0xc3:0x2c6,0xc4:0x2dc,0xc5:0xaf,0xc6:0x2d8,0xc7:0x2d9,0xc8:0xa8,0xca:0x2da,0xcb:0xb8,0xcd:0x2dd,0xce:0x2db,0xcf:0x2c7,0xd0:0x2014,0xe1:0xc6,0xe3:0xaa,0xe8:0x141,0xe9:0xd8,0xea:0x152,0xeb:0xba,0xf1:0xe6,0xf5:0x131,0xf8:0x142,0xf9:0xf8,0xfa:0x153,0xfb:0xdf};
  for(const [c,u] of Object.entries(high))t[c]=String.fromCodePoint(u);return t;})();
const BASE_ENCODINGS={WinAnsiEncoding:WIN_ANSI,MacRomanEncoding:MAC_ROMAN,StandardEncoding:STANDARD};

// Adobe Glyph List subset: every name used by the three base encodings plus common ligatures.
const GLYPHS=(()=>{const m=new Map();
  for(const c of range(0x41,0x5a)){m.set(String.fromCharCode(c),c);m.set(String.fromCharCode(c+32),c+32);}
  ['zero','one','two','three','four','five','six','seven','eight','nine'].forEach((n,i)=>m.set(n,0x30+i));
  const pairs='space 20 exclam 21 quotedbl 22 numbersign 23 dollar 24 percent 25 ampersand 26 quotesingle 27 parenleft 28 parenright 29 asterisk 2a plus 2b comma 2c hyphen 2d period 2e slash 2f colon 3a semicolon 3b less 3c equal 3d greater 3e question 3f at 40 bracketleft 5b backslash 5c bracketright 5d asciicircum 5e underscore 5f grave 60 braceleft 7b bar 7c braceright 7d asciitilde 7e '+
   'quoteright 2019 quoteleft 2018 Euro 20ac quotesinglbase 201a florin 192 quotedblbase 201e ellipsis 2026 dagger 2020 daggerdbl 2021 circumflex 2c6 perthousand 2030 Scaron 160 guilsinglleft 2039 OE 152 Zcaron 17d quotedblleft 201c quotedblright 201d bullet 2022 endash 2013 emdash 2014 tilde 2dc trademark 2122 scaron 161 guilsinglright 203a oe 153 zcaron 17e Ydieresis 178 '+
   'nbspace 20 nonbreakingspace 20 exclamdown a1 cent a2 sterling a3 currency a4 yen a5 brokenbar a6 section a7 dieresis a8 copyright a9 ordfeminine aa guillemotleft ab logicalnot ac sfthyphen 2d softhyphen 2d registered ae macron af overscore af degree b0 plusminus b1 twosuperior b2 threesuperior b3 acute b4 mu b5 mu1 b5 paragraph b6 periodcentered b7 middot b7 cedilla b8 onesuperior b9 ordmasculine ba guillemotright bb onequarter bc onehalf bd threequarters be questiondown bf '+
   'Agrave c0 Aacute c1 Acircumflex c2 Atilde c3 Adieresis c4 Aring c5 AE c6 Ccedilla c7 Egrave c8 Eacute c9 Ecircumflex ca Edieresis cb Igrave cc Iacute cd Icircumflex ce Idieresis cf Eth d0 Ntilde d1 Ograve d2 Oacute d3 Ocircumflex d4 Otilde d5 Odieresis d6 multiply d7 Oslash d8 Ugrave d9 Uacute da Ucircumflex db Udieresis dc Yacute dd Thorn de germandbls df '+
   'agrave e0 aacute e1 acircumflex e2 atilde e3 adieresis e4 aring e5 ae e6 ccedilla e7 egrave e8 eacute e9 ecircumflex ea edieresis eb igrave ec iacute ed icircumflex ee idieresis ef eth f0 ntilde f1 ograve f2 oacute f3 ocircumflex f4 otilde f5 odieresis f6 divide f7 oslash f8 ugrave f9 uacute fa ucircumflex fb udieresis fc yacute fd thorn fe ydieresis ff '+
   'fraction 2044 fi fb01 fl fb02 ff fb00 ffi fb03 ffl fb04 dotlessi 131 Lslash 141 lslash 142 breve 2d8 dotaccent 2d9 ring 2da hungarumlaut 2dd ogonek 2db caron 2c7 minus 2212 notequal 2260 infinity 221e lessequal 2264 greaterequal 2265 partialdiff 2202 summation 2211 product 220f pi 3c0 integral 222b Omega 3a9 radical 221a approxequal 2248 Delta 2206 lozenge 25ca '+
   'Abreve 102 abreve 103 Aogonek 104 aogonek 105 Cacute 106 cacute 107 Ccaron 10c ccaron 10d Dcaron 10e dcaron 10f Dcroat 110 dcroat 111 Eogonek 118 eogonek 119 Ecaron 11a ecaron 11b Gbreve 11e gbreve 11f Idotaccent 130 Lacute 139 lacute 13a Nacute 143 nacute 144 Ncaron 147 ncaron 148 Ohungarumlaut 150 ohungarumlaut 151 Racute 154 racute 155 Rcaron 158 rcaron 159 Sacute 15a sacute 15b Scedilla 15e scedilla 15f Tcaron 164 tcaron 165 Uring 16e uring 16f Uhungarumlaut 170 uhungarumlaut 171 Zacute 179 zacute 17a Zdotaccent 17b zdotaccent 17c '+
   'Amacron 100 amacron 101 Emacron 112 emacron 113 Imacron 12a imacron 12b Omacron 14c omacron 14d Umacron 16a umacron 16b Edotaccent 116 edotaccent 117 Iogonek 12e iogonek 12f Uogonek 172 uogonek 173 Gcommaaccent 122 gcommaaccent 123 Kcommaaccent 136 kcommaaccent 137 Lcommaaccent 13b lcommaaccent 13c Ncommaaccent 145 ncommaaccent 146 Rcommaaccent 156 rcommaaccent 157 Scommaaccent 218 scommaaccent 219 Tcommaaccent 21a tcommaaccent 21b '+
   'quotereversed 201b onedotenleader 2024 twodotenleader 2025 figuredash 2012 underscoredbl 2017 numero 2116 arrowleft 2190 arrowup 2191 arrowright 2192 arrowdown 2193 checkmark 2713 commaaccent f6c3 dotlessj 237 Schwa 18f schwa 259 Eng 14a eng 14b';
  const parts=pairs.split(/\s+/);for(let i=0;i<parts.length;i+=2)m.set(parts[i],parseInt(parts[i+1],16));return m;})();
function glyphToUnicode(name){
  if(GLYPHS.has(name))return String.fromCodePoint(GLYPHS.get(name));
  const base=name.split('.')[0];if(base!==name&&GLYPHS.has(base))return String.fromCodePoint(GLYPHS.get(base));
  let m=/^uni((?:[0-9A-F]{4})+)$/.exec(base);if(m){let s='';for(let i=0;i<m[1].length;i+=4){const cp=parseInt(m[1].slice(i,i+4),16);if(cp>=0xd800&&cp<=0xdfff)return null;s+=String.fromCharCode(cp);}return s;}
  m=/^u([0-9A-F]{4,6})$/.exec(base);if(m){const cp=parseInt(m[1],16);return cp<=0x10ffff&&!(cp>=0xd800&&cp<=0xdfff)?String.fromCodePoint(cp):null;}
  if(base.includes('_')){const all=base.split('_').map(glyphToUnicode);return all.every(Boolean)?all.join(''):null;}
  return null;
}

// ---------------------------------------------------------------- object access
function resolve(ctx,v){let n=0;while(v instanceof PDFRef){if(++n>32)return undefined;v=ctx.lookup(v);}return v;}
function dictGet(ctx,dict,key){if(!(dict instanceof PDFDict))return undefined;return resolve(ctx,dict.get(PDFName.of(key)));}
function nameOf(v){return v instanceof PDFName?v.decodeText():null;}
function num(v,fallback=0){return v instanceof PDFNumber?v.asNumber():fallback;}
function streamDict(v){return v instanceof PDFStream?v.dict:v instanceof PDFDict?v:null;}

// Decodes a stream with a hard output limit. Unsupported filters fail closed.
function decodeStream(stream,budget){
  if(!(stream instanceof PDFStream))return new Uint8Array(0);
  if(stream instanceof PDFRawStream){
    const filters=stream.dict.get(PDFName.of('Filter'));
    if(filters!==undefined){
      const list=filters instanceof PDFArray?filters.asArray():[filters];
      for(const f of list){const n=nameOf(f);if(!['FlateDecode','Fl','ASCIIHexDecode','AHx','ASCII85Decode','A85','LZWDecode','LZW','RunLengthDecode','RL'].includes(n))fail('PDF_STREAM_FILTER_UNSUPPORTED',n);}
    }
    const decoded=decodePDFRawStream(stream),limit=Math.min(PDF_TEXT_LIMITS.max_inflated_bytes_per_stream,budget.content_left);
    const bytes=decoded.getBytes(limit+1);if(bytes.length>limit)fail('PDF_DECOMPRESSED_SIZE_LIMIT');
    budget.content_left-=bytes.length;return bytes;
  }
  const bytes=stream.getContents();if(bytes.length>budget.content_left)fail('PDF_DECOMPRESSED_SIZE_LIMIT');budget.content_left-=bytes.length;return bytes;
}

// Every Flate stream except images is inflated once, counting bytes, before parsing.
// This bounds the parser's own object-stream decoding against decompression bombs.
async function checkInflationBounds(bytes){
  const latin=new TextDecoder('latin1').decode(bytes);let total=0,at=0;
  for(;;){
    const s=latin.indexOf('stream',at);if(s<0)break;at=s+6;
    if(latin.startsWith('endstream',s-3))continue;
    let begin=s+6;if(latin[begin]==='\r')begin++;if(latin[begin]!=='\n'&&latin[s+6]!=='\r')continue;if(latin[begin]==='\n')begin++;
    const objStart=latin.lastIndexOf(' obj',s),header=latin.slice(Math.max(objStart,s-4096,0),s);
    if(!/\/(FlateDecode|Fl)\b/.test(header)||/\/Subtype\s*\/Image\b/.test(header))continue;
    const end=latin.indexOf('endstream',begin);if(end<0)break;at=end+9;
    let produced=0;
    try{
      const reader=new Blob([bytes.subarray(begin,end)]).stream().pipeThrough(new DecompressionStream('deflate')).getReader();
      for(;;){const {done,value}=await reader.read();if(done)break;produced+=value.length;total+=value.length;
        if(produced>PDF_TEXT_LIMITS.max_inflated_bytes_per_stream||total>PDF_TEXT_LIMITS.max_inflated_bytes_total){await reader.cancel().catch(()=>{});fail('PDF_DECOMPRESSED_SIZE_LIMIT');}}
    }catch(error){if(ours(error))throw error;}
  }
}

// ---------------------------------------------------------------- content lexer
const WS=new Set([0,9,10,12,13,32]),DELIM=new Set([0x28,0x29,0x3c,0x3e,0x5b,0x5d,0x7b,0x7d,0x2f,0x25]);
function* lex(data,budget){
  let i=0;const n=data.length;
  const readString=()=>{let depth=1,out=[];i++;while(i<n&&depth>0){let c=data[i++];if(c===0x5c){const e=data[i++];if(e===0x6e)out.push(10);else if(e===0x72)out.push(13);else if(e===0x74)out.push(9);else if(e===0x62)out.push(8);else if(e===0x66)out.push(12);else if(e===0x0d){if(data[i]===0x0a)i++;}else if(e===0x0a){}else if(e>=0x30&&e<=0x37){let v=e-0x30;for(let k=0;k<2&&data[i]>=0x30&&data[i]<=0x37;k++)v=v*8+data[i++]-0x30;out.push(v&255);}else if(e!==undefined)out.push(e);continue;}if(c===0x28)depth++;else if(c===0x29){depth--;if(depth===0)break;}out.push(c);}return Uint8Array.from(out);};
  const readHex=()=>{i++;let hex='';while(i<n&&data[i]!==0x3e){const c=data[i++];if(!WS.has(c))hex+=String.fromCharCode(c);}i++;if(hex.length%2)hex+='0';const out=new Uint8Array(hex.length/2);for(let k=0;k<out.length;k++){const v=parseInt(hex.substr(k*2,2),16);out[k]=Number.isNaN(v)?0:v;}return out;};
  while(i<n){
    const c=data[i];
    if(WS.has(c)){i++;continue;}
    if(c===0x25){while(i<n&&data[i]!==10&&data[i]!==13)i++;continue;}
    if(--budget.operations_left<0)fail('PDF_CONTENT_COMPLEXITY_LIMIT');
    if(c===0x28){yield {t:'str',v:readString()};continue;}
    if(c===0x3c){if(data[i+1]===0x3c){i+=2;yield {t:'dict_open'};continue;}yield {t:'str',v:readHex()};continue;}
    if(c===0x3e){if(data[i+1]===0x3e){i+=2;yield {t:'dict_close'};continue;}i++;continue;}
    if(c===0x5b){i++;yield {t:'arr_open'};continue;}
    if(c===0x5d){i++;yield {t:'arr_close'};continue;}
    if(c===0x7b||c===0x7d){i++;continue;}
    if(c===0x2f){i++;let s='';while(i<n&&!WS.has(data[i])&&!DELIM.has(data[i])){if(data[i]===0x23&&i+2<n){s+=String.fromCharCode(parseInt(String.fromCharCode(data[i+1],data[i+2]),16)||0);i+=3;}else s+=String.fromCharCode(data[i++]);}yield {t:'name',v:s};continue;}
    let s='';while(i<n&&!WS.has(data[i])&&!DELIM.has(data[i]))s+=String.fromCharCode(data[i++]);
    if(/^[+-]?(\d+\.?\d*|\.\d+)$/.test(s)){yield {t:'num',v:Number(s)};continue;}
    if(s==='BI'){ // inline image: skip parameters and binary data through EI
      while(i<n){if(data[i]===0x49&&data[i+1]===0x44&&(WS.has(data[i+2])||i+2>=n)&&(i===0||WS.has(data[i-1]))){i+=3;break;}i++;}
      while(i<n){if(WS.has(data[i])&&data[i+1]===0x45&&data[i+2]===0x49&&(i+3>=n||WS.has(data[i+3])||DELIM.has(data[i+3]))){i+=3;break;}i++;}
      continue;
    }
    if(s==='')i++;else yield {t:'op',v:s};
  }
}

// ---------------------------------------------------------------- fonts
const STANDARD_ALIASES={Arial:'Helvetica','Arial,Bold':'Helvetica-Bold','Arial,Italic':'Helvetica-Oblique','Arial,BoldItalic':'Helvetica-BoldOblique',TimesNewRoman:'Times-Roman','TimesNewRoman,Bold':'Times-Bold','TimesNewRoman,Italic':'Times-Italic','TimesNewRoman,BoldItalic':'Times-BoldItalic',CourierNew:'Courier','CourierNew,Bold':'Courier-Bold'};
const standardMetrics=new Map();
function standardFont(base){const name=STANDARD_ALIASES[base]||base;if(!Object.values(FontNames).includes(name))return null;if(!standardMetrics.has(name))standardMetrics.set(name,StandardFont.load(name));return standardMetrics.get(name);}
function parseCMap(bytes){
  const text=new TextDecoder('latin1').decode(bytes),ranges=[],map=new Map();
  const hex=s=>s.replace(/[<>\s]/g,'');const utf16=h=>{let out='';for(let i=0;i+3<h.length;i+=4)out+=String.fromCharCode(parseInt(h.slice(i,i+4),16));if(h.length===2)out=String.fromCharCode(parseInt(h,16));return out;};
  for(const block of text.matchAll(/begincodespacerange([\s\S]*?)endcodespacerange/g))for(const m of block[1].matchAll(/<([0-9A-Fa-f\s]+)>\s*<([0-9A-Fa-f\s]+)>/g)){const lo=hex(m[1]),hi=hex(m[2]);ranges.push({bytes:lo.length/2,lo:parseInt(lo,16),hi:parseInt(hi,16)});}
  for(const block of text.matchAll(/beginbfchar([\s\S]*?)endbfchar/g))for(const m of block[1].matchAll(/<([0-9A-Fa-f\s]+)>\s*<([0-9A-Fa-f\s]*)>/g))map.set(parseInt(hex(m[1]),16),utf16(hex(m[2])));
  for(const block of text.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)){
    for(const m of block[1].matchAll(/<([0-9A-Fa-f\s]+)>\s*<([0-9A-Fa-f\s]+)>\s*(<[0-9A-Fa-f\s]*>|\[[^\]]*\])/g)){
      const lo=parseInt(hex(m[1]),16),hi=parseInt(hex(m[2]),16);if(hi<lo||hi-lo>65535)continue;
      if(m[3].startsWith('[')){const items=[...m[3].matchAll(/<([0-9A-Fa-f\s]*)>/g)].map(x=>utf16(hex(x[1])));items.forEach((s,k)=>{if(lo+k<=hi)map.set(lo+k,s);});}
      else{const base=hex(m[3]);for(let c=lo;c<=hi;c++){const last=parseInt(base.slice(-4)||'0',16)+(c-lo);map.set(c,utf16(base.slice(0,-4)+last.toString(16).padStart(4,'0').slice(-4)));}}
    }
  }
  return {ranges,map};
}
function loadFont(ctx,dict,budget,cache){
  if(cache.has(dict))return cache.get(dict);
  const subtype=nameOf(dictGet(ctx,dict,'Subtype')),base=nameOf(dictGet(ctx,dict,'BaseFont'))||'',font={composite:subtype==='Type0',widthScale:0.001,map:null,codeBytes:[1],byteTable:null,widths:new Map(),defaultWidth:0,standard:null,encodingNames:new Array(256).fill(null)};
  const toUnicode=dictGet(ctx,dict,'ToUnicode');
  if(toUnicode instanceof PDFStream){const cmap=parseCMap(decodeStream(toUnicode,budget));font.map=cmap.map;const lens=[...new Set(cmap.ranges.map(r=>r.bytes))].filter(n=>n>=1&&n<=4).sort();if(lens.length)font.codeBytes=lens;font.ranges=cmap.ranges;}
  if(font.composite){
    const enc=nameOf(dictGet(ctx,dict,'Encoding'));if(!font.map||enc==='Identity-H'||enc==='Identity-V')font.codeBytes=[2];
    const descendants=dictGet(ctx,dict,'DescendantFonts'),cid=descendants instanceof PDFArray?resolve(ctx,descendants.get(0)):null;
    font.defaultWidth=num(dictGet(ctx,cid,'DW'),1000);const w=dictGet(ctx,cid,'W');
    if(w instanceof PDFArray){const a=w.asArray().map(x=>resolve(ctx,x));for(let i=0;i<a.length;){const first=num(a[i]);if(a[i+1] instanceof PDFArray){a[i+1].asArray().forEach((x,k)=>font.widths.set(first+k,num(resolve(ctx,x))));i+=2;}else{const last=num(a[i+1]),width=num(a[i+2]);if(last-first<=65535)for(let c=first;c<=last;c++)font.widths.set(c,width);i+=3;}}}
  }else{
    if(subtype==='Type3'){const fm=dictGet(ctx,dict,'FontMatrix');if(fm instanceof PDFArray)font.widthScale=num(resolve(ctx,fm.get(0)),0.001);}
    const first=num(dictGet(ctx,dict,'FirstChar'),0),widths=dictGet(ctx,dict,'Widths');
    if(widths instanceof PDFArray)widths.asArray().forEach((x,k)=>font.widths.set(first+k,num(resolve(ctx,x))));
    else font.standard=standardFont(base.replace(/^[A-Z]{6}\+/,''));
    const desc=dictGet(ctx,dict,'FontDescriptor');font.defaultWidth=num(dictGet(ctx,desc,'MissingWidth'),font.standard?0:500);
    const enc=dictGet(ctx,dict,'Encoding');const flags=num(dictGet(ctx,desc,'Flags'),0),symbolic=(flags&4)!==0;
    const baseName=enc instanceof PDFName?nameOf(enc):enc instanceof PDFDict?nameOf(dictGet(ctx,enc,'BaseEncoding')):null;
    const table=[...(BASE_ENCODINGS[baseName]||(['Symbol','ZapfDingbats'].includes(base)?new Array(256).fill(null):symbolic&&subtype==='TrueType'?asciiBase():subtype==='Type1'&&!baseName?STANDARD:WIN_ANSI))];
    if(enc instanceof PDFDict){const diffs=dictGet(ctx,enc,'Differences');if(diffs instanceof PDFArray){let code=0;for(const raw of diffs.asArray()){const x=resolve(ctx,raw);if(x instanceof PDFNumber)code=x.asNumber();else if(x instanceof PDFName){if(code>=0&&code<256){font.encodingNames[code]=nameOf(x);table[code]=glyphToUnicode(nameOf(x));}code++;}}}}
    font.byteTable=table;
  }
  cache.set(dict,font);return font;
}
function decodeCodes(font,bytes){
  const out=[];
  for(let i=0;i<bytes.length;){
    let len=font.codeBytes[0];
    if(font.codeBytes.length>1&&font.ranges){len=font.codeBytes.at(-1);for(const n of font.codeBytes){if(i+n>bytes.length)continue;let v=0;for(let k=0;k<n;k++)v=v*256+bytes[i+k];if(font.ranges.some(r=>r.bytes===n&&v>=r.lo&&v<=r.hi)){len=n;break;}}}
    let code=0;for(let k=0;k<len&&i+k<bytes.length;k++)code=code*256+bytes[i+k];i+=len;
    let text=font.map?.get(code);
    if(text===undefined&&!font.composite&&font.byteTable)text=font.byteTable[code]??undefined;
    let width=font.widths.get(code);
    if(width===undefined&&font.standard){const name=font.encodingNames[code]||standardGlyphName(font.byteTable?.[code]);try{width=name?font.standard.getWidthOfGlyph(name):undefined;}catch{width=undefined;}}
    out.push({code,text:text===undefined?null:text,width:(width??font.defaultWidth)*font.widthScale,single:len===1});
  }
  return out;
}
const REVERSE_GLYPHS=new Map([...GLYPHS].map(([name,cp])=>[cp,name]).reverse());
function standardGlyphName(ch){return ch?REVERSE_GLYPHS.get(ch.codePointAt(0))||null:null;}

// ---------------------------------------------------------------- interpreter
const mul=(m,n)=>[m[0]*n[0]+m[1]*n[2],m[0]*n[1]+m[1]*n[3],m[2]*n[0]+m[3]*n[2],m[2]*n[1]+m[3]*n[3],m[4]*n[0]+m[5]*n[2]+n[4],m[4]*n[1]+m[5]*n[3]+n[5]];
const I=[1,0,0,1,0,0];
function makeSink(){
  let text='',last=null,glyphs=0,unmapped=0;
  return {
    glyph(ch,pos,dir,size,endPos){
      glyphs++;let s=ch;if(s===null){unmapped++;s='�';}
      s=s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').replace(/[\r\n\t]/g,' ');
      if(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(s)){unmapped++;s='�';}
      if(!s.length)return;
      const along=pos[0]*dir[0]+pos[1]*dir[1],across=-pos[0]*dir[1]+pos[1]*dir[0];
      if(last){
        const sameDir=Math.abs(dir[0]-last.dir[0])<0.01&&Math.abs(dir[1]-last.dir[1])<0.01,ref=Math.max(size,last.size,0.0001);
        if(!sameDir||Math.abs(across-last.across)>0.5*ref){if(!text.endsWith('\n'))text=text.replace(/ +$/,'')+'\n';}
        else{const gap=along-last.end;if((gap>0.15*ref||gap< -2*ref)&&!/\s$/.test(text)&&!/^\s/.test(s))text+=' ';}
      }
      text+=s;const end=endPos[0]*dir[0]+endPos[1]*dir[1];last={across,end,size,dir};
    },
    result(){return {text:text.replace(/[ \n]+$/,'').replace(/ +\n/g,'\n'),glyphs,unmapped};}
  };
}
function runContent(ctx,data,resources,ctm0,sink,budget,depth,fontCache){
  if(depth>PDF_TEXT_LIMITS.max_form_depth)fail('PDF_FORM_DEPTH_LIMIT');
  const stack=[];let gs={ctm:ctm0,font:null,size:0,tc:0,tw:0,th:1,tl:0,rise:0};
  let tm=I,tlm=I,ops=[];const arrays=[];let dictDepth=0;
  const fonts=dictGet(ctx,resources,'Font'),xobjects=dictGet(ctx,resources,'XObject');
  const show=bytes=>{
    if(!gs.font)return;
    for(const g of decodeCodes(gs.font,bytes)){
      const trm=mul(tm,gs.ctm),pos=[trm[5]*0+trm[4]+gs.rise*trm[2],trm[5]+gs.rise*trm[3]],len=Math.sqrt(trm[0]*trm[0]+trm[1]*trm[1])||1,dir=[trm[0]/len,trm[1]/len],size=gs.size*Math.sqrt(trm[2]*trm[2]+trm[3]*trm[3]);
      const tx=(g.width*gs.size+gs.tc+(g.single&&g.code===32?gs.tw:0))*gs.th;
      tm=mul([1,0,0,1,tx,0],tm);const after=mul(tm,gs.ctm);
      sink.glyph(g.text,pos,dir,size,[after[4]+gs.rise*after[2],after[5]+gs.rise*after[3]]);
    }
  };
  for(const tok of lex(data,budget)){
    if(tok.t==='dict_open'){dictDepth++;continue;}if(tok.t==='dict_close'){dictDepth=Math.max(0,dictDepth-1);continue;}
    if(dictDepth>0)continue;
    if(tok.t==='arr_open'){arrays.push([]);continue;}
    if(tok.t==='arr_close'){const a=arrays.pop();if(a){if(arrays.length)arrays.at(-1).push(a);else ops.push({t:'arr',v:a});}continue;}
    if(tok.t!=='op'){if(arrays.length)arrays.at(-1).push(tok);else ops.push(tok);if(ops.length>64)ops.shift();continue;}
    const a=ops,n=k=>a.length>=k&&a[a.length-k].t==='num'?a[a.length-k].v:0;ops=[];
    switch(tok.v){
      case 'q':stack.push({...gs});if(stack.length>256)fail('PDF_CONTENT_COMPLEXITY_LIMIT');break;
      case 'Q':if(stack.length)gs=stack.pop();break;
      case 'cm':gs={...gs,ctm:mul([n(6),n(5),n(4),n(3),n(2),n(1)],gs.ctm)};break;
      case 'BT':tm=I;tlm=I;break;
      case 'ET':break;
      case 'Tf':{const name=a.length>=2&&a[a.length-2].t==='name'?a[a.length-2].v:null,dict=name?dictGet(ctx,fonts,name):null;gs={...gs,font:dict instanceof PDFDict?loadFont(ctx,dict,budget,fontCache):null,size:n(1)};break;}
      case 'Tc':gs={...gs,tc:n(1)};break;case 'Tw':gs={...gs,tw:n(1)};break;case 'Tz':gs={...gs,th:n(1)/100};break;case 'TL':gs={...gs,tl:n(1)};break;case 'Ts':gs={...gs,rise:n(1)};break;
      case 'Td':tlm=mul([1,0,0,1,n(2),n(1)],tlm);tm=tlm;break;
      case 'TD':gs={...gs,tl:-n(1)};tlm=mul([1,0,0,1,n(2),n(1)],tlm);tm=tlm;break;
      case 'Tm':tlm=[n(6),n(5),n(4),n(3),n(2),n(1)];tm=tlm;break;
      case 'T*':tlm=mul([1,0,0,1,0,-gs.tl],tlm);tm=tlm;break;
      case 'Tj':{const s=a.at(-1);if(s?.t==='str')show(s.v);break;}
      case "'":{tlm=mul([1,0,0,1,0,-gs.tl],tlm);tm=tlm;const s=a.at(-1);if(s?.t==='str')show(s.v);break;}
      case '"':{gs={...gs,tw:n(3),tc:n(2)};tlm=mul([1,0,0,1,0,-gs.tl],tlm);tm=tlm;const s=a.at(-1);if(s?.t==='str')show(s.v);break;}
      case 'TJ':{const arr=a.at(-1);if(arr?.t==='arr')for(const item of arr.v){if(item.t==='str')show(item.v);else if(item.t==='num')tm=mul([1,0,0,1,-item.v/1000*gs.size*gs.th,0],tm);}break;}
      case 'Do':{
        const name=a.at(-1)?.t==='name'?a.at(-1).v:null,x=name?dictGet(ctx,xobjects,name):null;
        if(x instanceof PDFStream&&nameOf(dictGet(ctx,x.dict,'Subtype'))==='Form'){
          const m=dictGet(ctx,x.dict,'Matrix'),matrix=m instanceof PDFArray&&m.size()===6?m.asArray().map(v=>num(resolve(ctx,v))):I;
          const res=dictGet(ctx,x.dict,'Resources');
          runContent(ctx,decodeStream(x,budget),res instanceof PDFDict?res:resources,mul(matrix,gs.ctm),sink,budget,depth+1,fontCache);
        }
        break;
      }
      default:break;
    }
  }
}
function inherited(ctx,page,key){let node=page,n=0;while(node instanceof PDFDict&&n++<64){const v=dictGet(ctx,node,key);if(v!==undefined)return v;node=dictGet(ctx,node,'Parent');}return undefined;}
function signatures(ctx,catalog,length){
  const out=[],acro=dictGet(ctx,catalog,'AcroForm'),fields=dictGet(ctx,acro,'Fields'),seen=new Set();
  const visit=(f,depth)=>{f=resolve(ctx,f);if(!(f instanceof PDFDict)||seen.has(f)||depth>8||out.length>=8)return;seen.add(f);
    const kids=dictGet(ctx,f,'Kids');if(kids instanceof PDFArray)kids.asArray().forEach(k=>visit(k,depth+1));
    if(nameOf(dictGet(ctx,f,'FT'))!=='Sig')return;const v=dictGet(ctx,f,'V');if(!(v instanceof PDFDict))return;
    const br=dictGet(ctx,v,'ByteRange'),range=br instanceof PDFArray?br.asArray().map(x=>num(resolve(ctx,x))):[];
    out.push({sub_filter:nameOf(dictGet(ctx,v,'SubFilter')),byte_range:range.length===4?range:null,covers_entire_file:range.length===4&&range[0]===0&&range[2]+range[3]===length,signing_time_declared:(()=>{const m=dictGet(ctx,v,'M');return m instanceof PDFString||m instanceof PDFHexString?m.decodeText().slice(0,40):null;})(),cryptographic_verification:'not_performed'});};
  if(fields instanceof PDFArray)fields.asArray().forEach(f=>visit(f,0));
  return out;
}

// Extracts the text layer. Throws coded errors; never returns partial text.
export async function extractPdfText(input){
  const bytes=input instanceof Uint8Array?input:new Uint8Array(input);
  if(bytes.length>PDF_TEXT_LIMITS.max_bytes)fail('PDF_SIZE_LIMIT');
  const head=new TextDecoder('latin1').decode(bytes.subarray(0,1024));const version=/%PDF-(\d\.\d)/.exec(head);
  if(!version)fail('PDF_HEADER_REQUIRED');
  await loadPdfLib();
  await checkInflationBounds(bytes);
  let doc;
  try{doc=await PDFDocument.load(bytes,{ignoreEncryption:false,updateMetadata:false,throwOnInvalidObject:false,parseSpeed:ParseSpeeds.Fastest,capNumbers:true});}
  catch(error){if(ours(error))throw error;if(/encrypt/i.test(error?.name+' '+error?.message))fail('PDF_ENCRYPTED');fail('PDF_PARSE_FAILED');}
  if(doc.isEncrypted)fail('PDF_ENCRYPTED');
  try{return extractLoaded(doc,bytes,version[1]);}catch(error){if(ours(error))throw error;fail('PDF_CONTENT_INVALID');}
}
function extractLoaded(doc,bytes,pdfVersion){
  const ctx=doc.context,pages=doc.getPages();
  if(!pages.length)fail('PDF_NO_PAGES');if(pages.length>PDF_TEXT_LIMITS.max_pages)fail('PDF_PAGE_LIMIT');
  const budget={content_left:PDF_TEXT_LIMITS.max_content_bytes,operations_left:PDF_TEXT_LIMITS.max_operations},fontCache=new Map(),out=[];let glyphs=0,unmapped=0,text='';
  for(const [index,page] of pages.entries()){
    const node=page.node,resources=inherited(ctx,node,'Resources'),contents=dictGet(ctx,node,'Contents'),sink=makeSink();
    const parts=contents instanceof PDFArray?contents.asArray().map(x=>resolve(ctx,x)):[contents];
    const chunks=parts.filter(x=>x instanceof PDFStream).map(x=>decodeStream(x,budget));
    const data=new Uint8Array(chunks.reduce((s,c)=>s+c.length+1,0));let off=0;for(const c of chunks){data.set(c,off);off+=c.length;data[off++]=10;}
    try{runContent(ctx,data,resources instanceof PDFDict?resources:null,I,sink,budget,0,fontCache);}catch(error){if(ours(error))throw error;fail('PDF_CONTENT_INVALID');}
    const r=sink.result();glyphs+=r.glyphs;unmapped+=r.unmapped;
    if(index>0)text+='\n\n';const start=text.length;text+=r.text;out.push({page:index+1,start,end:text.length});
    if(text.length>PDF_TEXT_LIMITS.max_text_units)fail('PDF_TEXT_LIMIT');
  }
  if(glyphs<PDF_TEXT_LIMITS.min_glyphs||!text.trim())fail('PDF_TEXT_LAYER_MISSING');
  if(unmapped/glyphs>PDF_TEXT_LIMITS.max_unmapped_ratio)fail('PDF_TEXT_UNRELIABLE',{glyphs,unmapped});
  return {extractor:PDF_TEXT_EXTRACTOR,pdf_version:pdfVersion,page_count:pages.length,pages:out,text,glyph_count:glyphs,unmapped_glyph_count:unmapped,signatures:signatures(ctx,doc.catalog,bytes.length),
    limits:{...PDF_TEXT_LIMITS},scope:'Page content text layer only. No OCR, annotation or form-field text. Offsets are UTF-16 code units in this text.'};
}
// Locates the pages a UTF-16 range falls on.
export function pdfPagesForRange(pages,start,end){return pages.filter(p=>p.end>start&&p.start<end||p.start===start&&p.end===start).map(p=>p.page);}
