(function(){
  "use strict";
  var root=document.documentElement;
  var installEvent=null;
  var dialog=document.getElementById("pwaInstall");
  var topButton=document.getElementById("pwaInstallTop");
  var primary=document.getElementById("pwaInstallNow");
  var offlineButton=document.getElementById("offInstall");
  var offlineBox=document.getElementById("offInstallBox");
  var help=document.getElementById("pwaHelp");
  var update=document.getElementById("pwaUpdate");
  var updateButton=document.getElementById("pwaUpdateNow");
  var refreshing=false;

  function standalone(){
    return matchMedia("(display-mode: standalone)").matches||window.navigator.standalone===true;
  }
  function toast(message){
    var el=document.getElementById("toast");
    if(!el)return;
    el.textContent=message;el.hidden=false;clearTimeout(toast.timer);
    toast.timer=setTimeout(function(){el.hidden=true;},3300);
  }
  function platformHelp(){
    var ios=/iphone|ipad|ipod/i.test(navigator.userAgent);
    if(help)help.innerHTML=ios
      ? "<b>Di iPhone:</b> buka lewat Safari, ketuk tombol Bagikan, lalu pilih <b>Tambahkan ke Layar Utama</b>."
      : "<b>Jika tombol instal belum muncul:</b> buka menu Chrome (⋮), lalu pilih <b>Instal aplikasi</b> atau <b>Tambahkan ke layar utama</b>.";
  }
  function sync(){
    var installed=standalone();
    root.classList.toggle("pwa-standalone",installed);
    if(topButton)topButton.hidden=installed;
    if(offlineBox)offlineBox.hidden=installed;
    if(installed&&dialog&&dialog.open)dialog.close();
  }
  function openHelp(){
    platformHelp();
    if(dialog&&typeof dialog.showModal==="function")dialog.showModal();
    else location.hash="offline";
  }
  function promptInstall(){
    if(standalone()){toast("Dehayuk sudah terpasang di perangkat ini.");return;}
    if(!installEvent){openHelp();return;}
    var event=installEvent;installEvent=null;
    event.prompt();
    event.userChoice.then(function(choice){
      if(choice.outcome==="accepted")toast("Dehayuk sedang dipasang.");
      else openHelp();
    }).catch(openHelp);
  }

  window.addEventListener("beforeinstallprompt",function(event){
    event.preventDefault();installEvent=event;
    if(topButton)topButton.hidden=false;
    if(offlineBox)offlineBox.hidden=false;
  });
  window.addEventListener("appinstalled",function(){
    installEvent=null;sync();toast("Dehayuk berhasil dipasang.");
  });
  matchMedia("(display-mode: standalone)").addEventListener?.("change",sync);
  topButton?.addEventListener("click",promptInstall);
  primary?.addEventListener("click",promptInstall);
  offlineButton?.addEventListener("click",promptInstall);
  document.querySelectorAll("[data-pwa-close]").forEach(function(button){button.addEventListener("click",function(){dialog?.close();});});
  dialog?.addEventListener("click",function(event){if(event.target===dialog)dialog.close();});
  sync();

  if("serviceWorker" in navigator&&/^https?:$/.test(location.protocol)){
    window.addEventListener("load",function(){
      navigator.serviceWorker.register("/sw.js",{scope:"/"}).then(function(registration){
        function offer(worker){
          if(!worker||!navigator.serviceWorker.controller)return;
          update.hidden=false;
          updateButton.onclick=function(){worker.postMessage({jenis:"aktifkan-pembaruan"});};
        }
        offer(registration.waiting);
        registration.addEventListener("updatefound",function(){
          var worker=registration.installing;
          worker?.addEventListener("statechange",function(){if(worker.state==="installed")offer(worker);});
        });
      }).catch(function(){});
    });
    navigator.serviceWorker.addEventListener("controllerchange",function(){
      if(refreshing)return;refreshing=true;location.reload();
    });
  }
})();
