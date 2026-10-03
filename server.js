const http=require('http'),fs=require('fs'),net=require('net'),cp=require('child_process'),WebSocket=require('ws'),path=require('path');

const PORT=8080,ADB_PORT=27183,VER='4.1',JAR='./scrcpy-server-v4.1';
let proc,clients=new Set();

function sh(c,a){return cp.spawn(c,a,{stdio:'ignore'});}
function start(){
  try{cp.execFileSync('adb',['forward','--remove','tcp:'+ADB_PORT]);}catch{}
  cp.execFileSync('adb',['push',JAR,'/data/local/tmp/scrcpy-server.jar'],{stdio:'inherit'});
  try{cp.execFileSync('adb',['forward','tcp:'+ADB_PORT,'localabstract:scrcpy'],{stdio:'ignore'});}catch(e){console.error(e);process.exit(1)}
  proc=sh('adb',['shell','CLASSPATH=/data/local/tmp/scrcpy-server.jar','app_process','/','com.genymobile.scrcpy.Server',VER,'tunnel_forward=true','audio=false','control=false','cleanup=false','raw_stream=true','max_size=1920','video_bit_rate=8M','max_fps=60']);
  setTimeout(pipe,500);
}
function pipe(){
  const s=net.connect(ADB_PORT,'127.0.0.1');
  s.on('data',b=>{for(const w of clients)if(w.readyState===1)w.send(b);});
  s.on('close',()=>setTimeout(pipe,500));
  s.on('error',()=>{});
}
const app=http.createServer((q,r)=>{
  let f=q.url==='/'?'/index.html':q.url;
  try{let d=fs.readFileSync(path.join(__dirname,f));r.writeHead(200,{'Content-Type':f.endsWith('.js')?'text/javascript':'text/html','Cache-Control':'no-store'});r.end(d)}
  catch(e){r.writeHead(404);r.end('404')}
});
const w=new WebSocket.Server({server:app});
w.on('connection',x=>{clients.add(x);x.on('close',()=>clients.delete(x));});
app.listen(PORT,'0.0.0.0',()=>{console.log('http://0.0.0.0:'+PORT);start()});
