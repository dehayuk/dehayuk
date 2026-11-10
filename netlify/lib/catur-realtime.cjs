'use strict';
const {getStore}=require('@netlify/blobs');
const DB='https://dehayuk78-default-rtdb.asia-southeast1.firebasedatabase.app',API_KEY='AIzaSyCyount9nL0FC1ClSr1t0reg3gvOm5ARTE',NODE='caturPublik/v1';
let access=null;
async function fetchChecked(url,init={}){const r=await fetch(url,{...init,signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('Realtime '+r.status);return r;}
async function writer(){
 if(access&&access.until>Date.now()+60000)return access.token;
 // Private, encrypted-at-rest site storage. The store and key are fixed server
 // constants: neither can be supplied or read through the public chess API.
 const credentials=await getStore({name:'catur-runtime-credentials',consistency:'strong'}).get('firebase-writer-v1',{type:'json'});
 if(!credentials?.refresh||!credentials?.uid)throw Error('Private realtime writer is not configured');
 const refresh=credentials.refresh;
 const r=await fetchChecked('https://securetoken.googleapis.com/v1/token?key='+API_KEY,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',refresh_token:refresh})}),data=await r.json();
 if(data.user_id!==credentials.uid)throw Error('Realtime identity mismatch');access={token:data.id_token,until:Date.now()+Number(data.expires_in)*1000};return access.token;
}
async function publish(view){
 const token=await writer(),url=DB+'/'+NODE+'.json?auth='+encodeURIComponent(token),prior=await (await fetchChecked(url)).json();
 if(prior?.version>=view.version)return;
 const patch={};for(const [k,v]of Object.entries(view))if(JSON.stringify(v)!==JSON.stringify(prior?.[k]))patch[k]=v;
 const r=await fetch(url,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(patch),signal:AbortSignal.timeout(10000)});
 if(!r.ok){const current=await (await fetchChecked(url)).json();if(current?.version>=view.version)return;throw Error('Realtime publish '+r.status);}
}
module.exports={publish,streamUrl:DB+'/'+NODE+'.json'};
