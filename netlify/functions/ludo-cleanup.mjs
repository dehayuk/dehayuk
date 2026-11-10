import {getStore} from '@netlify/blobs';
export default async function(){
 const store=getStore({name:'ludo-online-v1',consistency:'strong'});let removed=0;
 for await(const page of store.list({paginate:true}))for(const blob of page.blobs){
  const meta=await store.getMetadata(blob.key);
  if(Number(meta?.metadata?.expiresAt)<Date.now()-3600000){await store.delete(blob.key);removed++;}
 }
 console.log('Expired Ludo records removed:',removed);
}
export const config={schedule:'17 3 * * *'};
