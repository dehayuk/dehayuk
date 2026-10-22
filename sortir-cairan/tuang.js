(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.SortirCairanTuang=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  // Inner glass outline in the same 100 x 220 coordinates as bottleSVG.
  // Liquid bands are cut along WORLD gravity, then clipped by the curved SVG glass.
  const VESSEL=[[37,12],[37,38],[33,48],[20,56],[16,64],[16,183],[18,192],[28,200],[72,200],[82,192],[84,183],[84,64],[80,56],[67,48],[63,38],[63,12]];
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function area(poly){let sum=0;for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];sum+=a[0]*b[1]-b[0]*a[1];}return Math.abs(sum)/2;}
  function clip(poly,s,c,height,below){
    const out=[];if(!poly.length)return out;
    for(let i=0;i<poly.length;i++){
      const a=poly[i],b=poly[(i+1)%poly.length],da=a[0]*s+a[1]*c-height,db=b[0]*s+b[1]*c-height,insideA=below?da>=-1e-8:da<=1e-8,insideB=below?db>=-1e-8:db<=1e-8;
      if(insideA)out.push(a);
      if(insideA!==insideB){const t=da/(da-db);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}
    }
    return out;
  }
  const UNIT=area(clip(VESSEL,0,1,56,true))/4;
  function levelFor(units,s,c){
    const projected=VESSEL.map(p=>p[0]*s+p[1]*c);let low=Math.min(...projected)-.01,high=Math.max(...projected)+.01;
    const target=clamp(units,0,4)*UNIT;
    for(let i=0;i<25;i++){const mid=(low+high)/2;if(area(clip(VESSEL,s,c,mid,true))>target)low=mid;else high=mid;}
    return (low+high)/2;
  }
  function surfaceAt(s,c,height){
    const hit=[];
    for(let i=0;i<VESSEL.length;i++){
      const a=VESSEL[i],b=VESSEL[(i+1)%VESSEL.length],da=a[0]*s+a[1]*c-height,db=b[0]*s+b[1]*c-height;
      if(Math.abs(da)<1e-7)hit.push(a);
      if(da*db<0){const t=da/(da-db);hit.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}
    }
    if(hit.length<2)return null;
    hit.sort((a,b)=>(a[0]*c-a[1]*s)-(b[0]*c-b[1]*s));return [hit[0],hit[hit.length-1]];
  }
  function layers(colors,units,angle){
    units=clamp(units==null?colors.length:units,0,colors.length);
    const rad=(angle||0)*Math.PI/180,s=Math.sin(rad),c=Math.cos(rad),result=[];let previous=levelFor(0,s,c);
    for(let i=0;i<colors.length;i++){
      const n=clamp(units-i,0,1);if(!n)break;
      const top=levelFor(Math.min(units,i+1),s,c),poly=clip(clip(VESSEL,s,c,top,true),s,c,previous,false);
      result.push({color:colors[i],points:poly,units:n,surface:surfaceAt(s,c,top)});previous=top;
    }
    return result;
  }
  function footprint(width,height,angle){
    const s=Math.sin(angle*Math.PI/180),c=Math.cos(angle*Math.PI/180);
    const points=[[12,6],[88,6],[88,205],[12,205]].map(p=>{const x=(p[0]-50)*width/100,y=(p[1]-10)*height/220;return [x*c-y*s,x*s+y*c];});
    return {left:Math.min(...points.map(p=>p[0])),right:Math.max(...points.map(p=>p[0])),top:Math.min(...points.map(p=>p[1])),bottom:Math.max(...points.map(p=>p[1]))};
  }
  function plan(source,target,viewport){
    const from={x:source.x+source.width/2,y:source.y+source.height*10/220},to={x:target.x+target.width/2,y:target.y+target.height*10/220-16},preferred=from.x<=to.x?1:-1;
    let best=null;
    for(const direction of [preferred,-preferred]){
      for(let degrees=112;degrees>=84;degrees-=2){
        const angle=degrees*direction,b=footprint(source.width,source.height,angle),overflow=Math.max(0,8-to.x-b.left)+Math.max(0,to.x+b.right-viewport.width+8)+Math.max(0,8-to.y-b.top)+Math.max(0,to.y+b.bottom-viewport.height+8),cost=overflow*100+(112-degrees)+(direction===preferred?0:2);
        if(!best||cost<best.cost)best={angle,cost,bounds:b};
      }
    }
    return {from,to,angle:best.angle,width:source.width,height:source.height};
  }
  return {layers,plan,area,UNIT,VESSEL};
});
