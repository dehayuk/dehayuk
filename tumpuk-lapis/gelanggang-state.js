/* Pure Lapis UI state: no network writes, physics, or outcome decisions. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.LapisArenaState=api;})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 function derive(o){const f=o.tree&&o.tree.f,S=o.settings||{};const role=!f?'penonton':f.a&&f.a.u===o.uid?'a':f.b&&f.b.u===o.uid&&!f.rek?'b':'penonton';let screen='pesanMuat';
 if(f){if(f.st==='main')screen=o.now<o.startAt?'D1':role!=='penonton'?(o.hasMain?'C':'D2'):'B';else if(f.st==='siap')screen='D1';else if(f.st==='usai')screen='D2';else if(o.recent&&f.st==='rebut'&&f.w===o.recent.f.w+1&&o.now<o.drawEnd+S.lantikMs)screen='D2';else screen='F';}
 return{screen,role,connection:['offline','putus','penuh','ditolak'].includes(o.connection)?o.connection:'ok',replay:!!(f&&f.rek),registered:!!(f&&o.tree.m&&o.tree.m[o.uid]&&o.tree.m[o.uid].w===f.w)};}
 return{derive};});
