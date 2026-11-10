import {getStore} from '@netlify/blobs';
export default async function(){const store=getStore({name:'catur-online-v1',consistency:'strong'});let count=0;for await(const page of store.list({paginate:true}))for(const blob of page.blobs){const m=await store.getMetadata(blob.key);if(Number(m?.metadata?.expiresAt)<Date.now()-3600000){await store.delete(blob.key);count++;}}console.log('Expired chess rooms removed:',count);}
export const config={schedule:'37 3 * * *'};
