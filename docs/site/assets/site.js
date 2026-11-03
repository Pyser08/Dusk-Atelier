(function(){
var NAV=[["처음이라면",[["guide/start","처음 사용자 가이드"]]],
["기능 가이드",[["guide/memory","장기 기억",1],["guide/story","이야기 도우미",1],["guide/cocoa","코코아 · 스킬",1],["guide/image-tags","이미지 태그",1],["guide/look","화면 · 꾸미기",1],["guide/manage","모듈 · 봇 관리",1]]],
["개발자",[["dev/","개발자 가이드"]]]];
var b=document.body,root=b.getAttribute("data-root")||"",cur=b.getAttribute("data-page")||"";
var t=localStorage.getItem("da-theme");if(t)document.documentElement.setAttribute("data-theme",t);
var top=document.createElement("header");top.className="top";
top.innerHTML='<button class="btn menu" aria-label="메뉴">☰</button><a class="brand" href="'+root+'index.html"><img src="'+root+'assets/img/icon.webp" alt=""><span>Dusk Atelier 안내서</span></a><span class="sp"></span><a class="lnk gh" href="https://github.com/Pyser08/Dusk-Atelier">GitHub</a><button class="btn th" aria-label="밝기 바꾸기">🌓</button>';
b.insertBefore(top,b.firstChild);
var side=document.querySelector(".side");
if(side){var h="";NAV.forEach(function(g){h+="<h4>"+g[0]+"</h4>";g[1].forEach(function(p){var href=root+p[0]+(p[0].slice(-1)=="/"?"index.html":".html");h+=p[2]?"":'<a href="'+href+'"'+(p[0]==cur?' class="on"':"")+">"+p[1]+"</a>"})});side.innerHTML=h;
side.addEventListener("click",function(e){if(e.target.tagName=="A")b.classList.remove("open")})}
top.querySelector(".menu").onclick=function(){b.classList.toggle("open")};
top.querySelector(".th").onclick=function(){var d=document.documentElement,c=d.getAttribute("data-theme")||(matchMedia("(prefers-color-scheme:light)").matches?"light":"dark"),n=c=="dark"?"light":"dark";d.setAttribute("data-theme",n);localStorage.setItem("da-theme",n)};
var toc=document.querySelector(".toc"),hs=document.querySelectorAll("main h2[id]");
if(toc&&hs.length){var s="<b>이 페이지</b>";hs.forEach(function(x){s+='<a href="#'+x.id+'">'+x.textContent+"</a>"});toc.innerHTML=s;
var links=toc.querySelectorAll("a");if("IntersectionObserver" in window){var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){links.forEach(function(l){l.classList.toggle("on",l.getAttribute("href")=="#"+e.target.id)})}})},{rootMargin:"-80px 0px -70% 0px"});hs.forEach(function(x){io.observe(x)})}}
})();
