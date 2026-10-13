declare module 'pizzip' {
 type OutputType='blob'|'uint8array'|'arraybuffer'|'base64'|'binarystring'|'nodebuffer'
 interface ZipFile { asText():string }
 export default class PizZip {
  constructor(data?:ArrayBuffer|Uint8Array|string)
  file(path:string):ZipFile|null
  file(path:string,data:string|ArrayBuffer|Uint8Array):this
  remove(path:string):this
  generate(options:{type:'uint8array';compression?:'STORE'|'DEFLATE'}):Uint8Array
  generate(options:{type:OutputType;mimeType?:string;compression?:'STORE'|'DEFLATE'}):Blob
 }
}
