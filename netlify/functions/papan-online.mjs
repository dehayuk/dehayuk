import {getStore} from '@netlify/blobs';
import globalGame from '../lib/papan-global.cjs';
import realtime from '../lib/papan-realtime.cjs';
export default async function(request){
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'},reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(request.method!=='POST')return reply({error:'Gunakan POST.'},405);if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'Asal permintaan tidak diizinkan.'},403);if(!request.headers.get('content-type')?.startsWith('application/json'))return reply({error:'Gunakan JSON.'},415);if(Number(request.headers.get('content-length')||0)>4096)return reply({error:'Permintaan terlalu besar.'},413);
 try{const text=await request.text();if(text.length>4096)return reply({error:'Permintaan terlalu besar.'},413);const body=JSON.parse(text);if(!body||Array.isArray(body)||typeof body!=='object')return reply({error:'Permintaan tidak valid.'},400);const api=globalGame.createService({store:getStore({name:'papan-online-v1',consistency:'strong'}),publish:realtime.publish});return reply({...await api.request(body.action,body),streamUrl:realtime.streamUrl(body.gameId)});}catch(error){if(error instanceof SyntaxError)return reply({error:'JSON tidak valid.'},400);if(!error.status)console.error('Papan online:',error.message);return reply({error:error.status?error.message:'Sambungan meja terganggu. Coba lagi sebentar.'},error.status||503);}
}
export const config={rateLimit:{windowLimit:120,windowSize:60,aggregateBy:['ip']}};
