import {getStore} from '@netlify/blobs';
import globalGame from '../lib/catur-global.cjs';
import realtime from '../lib/catur-realtime.cjs';
export default async function(request,context){
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'},reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(request.method!=='POST')return reply({error:'Gunakan POST.'},405);
 if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'Asal permintaan tidak diizinkan.'},403);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return reply({error:'Gunakan JSON.'},415);
 if(Number(request.headers.get('content-length')||0)>4096)return reply({error:'Permintaan terlalu besar.'},413);
 try{
  const text=await request.text();if(text.length>4096)return reply({error:'Permintaan terlalu besar.'},413);const b=JSON.parse(text);if(!b||Array.isArray(b)||typeof b!=='object')return reply({error:'Permintaan tidak valid.'},400);
  const api=globalGame.createService({store:getStore({name:'catur-global-v2',consistency:'strong'}),publish:realtime.publish});return reply({...await api.request(b.action,b),streamUrl:realtime.streamUrl});
 }catch(e){if(e instanceof SyntaxError)return reply({error:'JSON tidak valid.'},400);if(!e.status)console.error('Catur global:',e.message);return reply({error:e.status?e.message:'Sambungan meja terganggu. Coba lagi sebentar.'},e.status||503);}
}
export const config={rateLimit:{windowLimit:120,windowSize:60,aggregateBy:['ip']}};
