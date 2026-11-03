(function(){
var NAV=[["처음이라면",[["guide/start","처음 사용자 가이드"]]],
["기능 가이드",[["guide/memory","장기 기억"],["guide/story","이야기 도우미"],["guide/cocoa","코코아 · 스킬"],["guide/image-tags","이미지 태그"],["guide/look","화면 · 꾸미기"],["guide/manage","모듈 · 봇 관리"],["guide/cellar","Dusk Cellar (선택 서버)"]]],
["도움말",[["guide/switches","기능 스위치 한눈에"],["guide/faq","자주 묻는 질문"]]],
["개발자",[["dev/","개발자 가이드"],["dev/host","호스트 호환 규칙"],["dev/workflow","작업 흐름과 파일 찾기"]]]];
var de=document.documentElement;try{var sv=localStorage.getItem("da-theme");if(sv=="light"||sv=="dark")de.setAttribute("data-theme",sv)}catch(e){}
var b=document.body,root=b.getAttribute("data-root")||"",cur=b.getAttribute("data-page")||"";
var top=document.createElement("header");top.className="top";
top.innerHTML='<button class="btn menu" aria-label="메뉴">☰</button><a class="brand" href="'+root+'index.html"><img src="'+root+'assets/img/icon.webp" alt=""><span>Dusk Atelier 안내서</span></a><span class="sp"></span><button class="srch" aria-label="검색">🔍 <span>검색</span><kbd>Ctrl K</kbd></button><a class="lnk gh" href="https://github.com/Pyser08/Dusk-Atelier">GitHub</a><button class="btn thm" aria-label="다크/라이트 바꾸기"></button>';
b.insertBefore(top,b.firstChild);
var side=document.querySelector(".side");
if(side){var h="";NAV.forEach(function(g){h+="<h4>"+g[0]+"</h4>";g[1].forEach(function(p){var href=root+p[0]+(p[0].slice(-1)=="/"?"index.html":".html");h+=p[2]?"":'<a href="'+href+'"'+(p[0]==cur?' class="on"':"")+">"+p[1]+"</a>"})});side.innerHTML=h;
side.addEventListener("click",function(e){if(e.target.tagName=="A")b.classList.remove("open")})}
var thm=top.querySelector(".thm");function themeNow(){return de.getAttribute("data-theme")||(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark")}function ic(){thm.textContent=themeNow()=="dark"?"🌙":"☀️";thm.title=themeNow()=="dark"?"라이트로 바꾸기":"다크로 바꾸기"}ic();
thm.onclick=function(){var n=themeNow()=="dark"?"light":"dark";de.setAttribute("data-theme",n);try{localStorage.setItem("da-theme",n)}catch(e){}ic();window.dispatchEvent(new Event("da-theme"))};
var IMG={"guide/start":"guide","guide/memory":"spot-memory","guide/story":"spot-story","guide/cocoa":"spot-cache","guide/image-tags":"more","guide/look":"spot-screen","guide/manage":"install","guide/switches":"spot-cache","guide/faq":"warn","dev/":"install","dev/host":"guide","dev/workflow":"more"};
var mh=document.querySelector("main"),h1=mh&&mh.querySelector("h1");if(h1&&!mh.querySelector(".phero")){var ph=document.createElement("div");ph.className="phero";var ey=h1.previousElementSibling,ld=h1.nextElementSibling;mh.insertBefore(ph,ey&&ey.classList.contains("eyebrow")?ey:h1);if(ey&&ey.classList.contains("eyebrow"))ph.appendChild(ey);ph.appendChild(h1);if(ld&&ld.classList.contains("lead"))ph.appendChild(ld);if(IMG[cur2()]){var im=document.createElement("img");im.src=root+"assets/img/"+IMG[cur2()]+".webp";im.alt="";ph.appendChild(im)}}
function cur2(){return document.body.getAttribute("data-page")||""}
if(!document.querySelector(".side"))top.querySelector(".menu").style.display="none";
top.querySelector(".menu").onclick=function(){b.classList.toggle("open")};
var toc=document.querySelector(".toc"),hs=document.querySelectorAll("main h2[id]");
if(toc&&hs.length){var s="<b>이 페이지</b>";hs.forEach(function(x){s+='<a href="#'+x.id+'">'+x.textContent+"</a>"});toc.innerHTML=s;
var links=toc.querySelectorAll("a");if("IntersectionObserver" in window){var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){links.forEach(function(l){l.classList.toggle("on",l.getAttribute("href")=="#"+e.target.id)})}})},{rootMargin:"-80px 0px -70% 0px"});hs.forEach(function(x){io.observe(x)})}}
var w=document.createElement("script");w.src=root+"assets/widgets.js";document.body.appendChild(w);
})();
