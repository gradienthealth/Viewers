"use strict";(globalThis.webpackChunk=globalThis.webpackChunk||[]).push([[295],{56295:(e,l,t)=>{t.r(l),t.d(l,{default:()=>i});var a=t(32735),s=t(60216),n=t.n(s);function r(e){let{displaySets:l}=e;const[t,s]=(0,a.useState)(null);if(l&&l.length>1)throw new Error("OHIFCornerstonePdfViewport: only one display set is supported for dicom pdf right now");const{pdfUrl:n}=l[0];return(0,a.useEffect)((()=>{(async()=>{await n,s(n)})()}),[n]),a.createElement("div",{className:"bg-primary-black w-full h-full"},a.createElement("object",{data:t,type:"application/pdf",className:"w-full h-full"},a.createElement("div",null,"No online PDF viewer installed")))}r.propTypes={displaySets:n().arrayOf(n().object).isRequired};const i=r}}]);
//# sourceMappingURL=295.bundle.24eb9eb5fd5425a36fa4.js.map