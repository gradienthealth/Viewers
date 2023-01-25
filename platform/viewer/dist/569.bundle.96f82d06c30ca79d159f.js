"use strict";(globalThis.webpackChunk=globalThis.webpackChunk||[]).push([[569],{33569:(e,t,n)=>{n.r(t),n.d(t,{default:()=>E});var i=n(32735),s=n(60216),o=n.n(s),a=n(72928),r=n(84334),l=n(43194),c=n(38942);const u=function(e,t,n){const i=n.getModuleEntry("@ohif/extension-cornerstone.utilityModule.tools"),{toolNames:s,Enums:o}=i.exports,a={active:[{toolName:s.WindowLevel,bindings:[{mouseButton:o.MouseBindings.Primary}]},{toolName:s.Pan,bindings:[{mouseButton:o.MouseBindings.Auxiliary}]},{toolName:s.Zoom,bindings:[{mouseButton:o.MouseBindings.Secondary}]},{toolName:s.StackScrollMouseWheel,bindings:[]}],enabled:[{toolName:s.SegmentationDisplay}]};return e.createToolGroupAndAddTools(t,a,{})};const p=async function(e){let{segDisplaySet:t,viewportIndex:n,toolGroupId:i,servicesManager:s}=e;const{SegmentationService:o,HangingProtocolService:a,ViewportGridService:r}=s.services,l=t.referencedDisplaySetInstanceUID;let c=null;c=await o.createSegmentationForSEGDisplaySet(t,c,!1),o.hydrateSegmentation(t.displaySetInstanceUID);const{viewports:u}=r.getState(),p=a.getViewportsRequireUpdate(n,l);return r.setDisplaySetsForViewports(p),u.forEach(((e,s)=>{if(s===n)return;o.shouldRenderSegmentation(e.displaySetInstanceUIDs,t.displaySetInstanceUID)&&r.setDisplaySetsForViewport({viewportIndex:s,displaySetInstanceUIDs:e.displaySetInstanceUIDs,viewportOptions:{viewportType:"volume",toolGroupId:i,initialImageOptions:{preset:"middle"}}})})),!0},d=0,m=5;const S=function(e){let{servicesManager:t,segDisplaySet:n,viewportIndex:i,toolGroupId:s="default"}=e;const{UIViewportDialogService:o}=t.services;return new Promise((async function(e,a){const r=await function(e,t){return new Promise((function(n,i){const s="Do you want to open this Segmentation?",o=[{type:"secondary",text:"No",value:d},{type:"primary",text:"Yes",value:m}],a=t=>{e.hide(),n(t)};e.show({viewportIndex:t,type:"info",message:s,actions:o,onSubmit:a,onOutsideClick:()=>{e.hide(),n(d)}})}))}(o,i);if(r===m){e(await p({segDisplaySet:n,viewportIndex:i,toolGroupId:s,servicesManager:t}))}}))};var g=n(40841),y=n.n(g);function f(){return f=Object.assign?Object.assign.bind():function(e){for(var t=1;t<arguments.length;t++){var n=arguments[t];for(var i in n)Object.prototype.hasOwnProperty.call(n,i)&&(e[i]=n[i])}return e},f.apply(this,arguments)}const{formatDate:v}=a.ZP;function w(e){const{children:t,displaySets:n,viewportOptions:s,viewportIndex:o,viewportLabel:a,servicesManager:p,extensionManager:d}=e,{t:m}=(0,c.$G)("SEGViewport"),{DisplaySetService:g,ToolGroupService:w,SegmentationService:E}=p.services,I=`SEGToolGroup-${o}`;if(n.length>1)throw new Error("SEG viewport should only have a single display set");const b=n[0],[h,x]=(0,l.useViewportGrid)(),[D,N]=(0,l.useViewportDialog)(),[P,T]=(0,i.useState)(!1),[k,M]=(0,i.useState)(1),[G,A]=(0,i.useState)(b.isHydrated),[C,U]=(0,i.useState)(!b.isLoaded),[V,O]=(0,i.useState)(null),[j,B]=(0,i.useState)({segmentIndex:1,totalSegments:null}),R=(0,i.useRef)(null),{viewports:F,activeViewportIndex:L}=h,_=b.getReferenceDisplaySet(),$=function(e){const t=e.images[0],n={PatientID:t.PatientID,PatientName:t.PatientName,PatientSex:t.PatientSex,PatientAge:t.PatientAge,SliceThickness:t.SliceThickness,StudyDate:t.StudyDate,SeriesDescription:t.SeriesDescription,SeriesInstanceUID:t.SeriesInstanceUID,SeriesNumber:t.SeriesNumber,ManufacturerModelName:t.ManufacturerModelName,SpacingBetweenSlices:t.SpacingBetweenSlices};return n}(_);R.current={displaySet:_,metadata:$};const H=e=>{O(e.detail.element)},Z=()=>{O(null)},q=(0,i.useCallback)((()=>{const{component:t}=d.getModuleEntry("@ohif/extension-cornerstone.viewportModule.cornerstone"),{displaySet:n}=R.current;return i.createElement(t,f({},e,{displaySets:[n,b],viewportOptions:{viewportType:"volume",toolGroupId:I,orientation:s.orientation},onElementEnabled:H,onElementDisabled:Z}))}),[o,b,I]),W=(0,i.useCallback)((e=>{e="left"===e?-1:1;const t=b.displaySetInstanceUID,n=E.getSegmentation(t),{segments:i}=n,s=Object.keys(i).length;let o=k+e;o>s-1?o=1:0===o&&(o=s-1),E.jumpToSegmentCenter(t,o,I),M(o)}),[k]);(0,i.useEffect)((()=>{C||S({servicesManager:p,viewportIndex:o,segDisplaySet:b}).then((e=>{e&&A(!0)}))}),[p,o,b,C]),(0,i.useEffect)((()=>{const{unsubscribe:e}=E.subscribe(E.EVENTS.SEGMENTATION_PIXEL_DATA_CREATED,(e=>{e.segDisplaySet.displaySetInstanceUID===b.displaySetInstanceUID&&U(!1)}));return()=>{e()}}),[b]),(0,i.useEffect)((()=>{const{unsubscribe:e}=E.subscribe(E.EVENTS.SEGMENT_PIXEL_DATA_CREATED,(e=>{let{segmentIndex:t,numSegments:n}=e;B({segmentIndex:t,totalSegments:n})}));return()=>{e()}}),[b]),(0,i.useEffect)((()=>{const e=g.subscribe(g.EVENTS.DISPLAY_SETS_REMOVED,(e=>{let{displaySetInstanceUIDs:t}=e;const n=F[L];t.includes(n.displaySetInstanceUID)&&x.setDisplaySetsForViewport({viewportIndex:L,displaySetInstanceUIDs:[]})}));return()=>{e.unsubscribe()}}),[]),(0,i.useEffect)((()=>{let e=w.getToolGroup(I);if(!e)return e=u(w,I,d),T(!0),()=>{E.removeSegmentationRepresentationFromToolGroup(I),w.destroyToolGroup(I)}}),[]),(0,i.useEffect)((()=>(A(b.isHydrated),()=>{E.removeSegmentationRepresentationFromToolGroup(I),R.current=null})),[b]);let X=null;if(!R.current||_.displaySetInstanceUID!==R.current.displaySet.displaySetInstanceUID)return null;t&&t.length&&(X=t.map(((e,t)=>e&&i.cloneElement(e,{viewportIndex:o,key:t}))));const{PatientID:Y,PatientName:z,PatientSex:J,PatientAge:K,SliceThickness:Q,ManufacturerModelName:ee,StudyDate:te,SeriesDescription:ne,SpacingBetweenSlices:ie,SeriesNumber:se}=R.current.metadata,oe=()=>{S({servicesManager:p,viewportIndex:o,segDisplaySet:b}).then((e=>{e&&A(!0)}))};return i.createElement(i.Fragment,null,i.createElement(l.ViewportActionBar,{onDoubleClick:e=>{e.stopPropagation(),e.preventDefault()},onArrowsClick:W,getStatusComponent:()=>function(e){let{isHydrated:t,onPillClick:n}=e,s=null,o=null;switch(t){case!0:o=()=>i.createElement("div",{className:"flex items-center justify-center -mr-1 rounded-full",style:{width:"18px",height:"18px",backgroundColor:"#98e5c1",border:"solid 1.5px #000000"}},i.createElement(l.Icon,{name:"exclamation",style:{color:"#000",width:"12px",height:"12px"}})),s=()=>i.createElement("div",null,"This Segmentation is loaded in the segmentation panel");break;case!1:o=()=>i.createElement("div",{className:"flex items-center justify-center -mr-1 bg-white rounded-full group-hover:bg-customblue-200",style:{width:"18px",height:"18px",border:"solid 1.5px #000000"}},i.createElement(l.Icon,{name:"arrow-left",style:{color:"#000",width:"14px",height:"14px"}})),s=()=>i.createElement("div",null,"Click to load segmentation.")}const a=()=>i.createElement("div",{className:y()("group relative flex items-center justify-center px-8 rounded-full cursor-default bg-customgreen-100",{"hover:bg-customblue-100":!t,"cursor-pointer":!t}),style:{height:"24px",width:"55px"},onClick:()=>{t||n&&n()}},i.createElement("div",{className:"pr-1 text-base font-medium leading-none text-black"},"SEG"),i.createElement(o,null));return i.createElement(i.Fragment,null,s&&i.createElement(l.Tooltip,{content:i.createElement(s,null),position:"bottom-left"},i.createElement(a,null)),!s&&i.createElement(a,null))}({isHydrated:G,onPillClick:oe}),studyData:{label:a,useAltStyling:!0,studyDate:v(te),currentSeries:se,seriesDescription:`SEG Viewport ${ne}`,patientInformation:{patientName:z?r.ZP.utils.formatPN(z.Alphabetic):"",patientSex:J||"",patientAge:K||"",MRN:Y||"",thickness:Q?`${Q.toFixed(2)}mm`:"",spacing:void 0!==ie?`${ie.toFixed(2)}mm`:"",scanner:ee||""}}}),i.createElement("div",{className:"relative flex flex-row w-full h-full overflow-hidden"},C&&i.createElement(l.LoadingIndicatorProgress,{className:"w-full h-full",progress:null!==j.totalSegments?(j.segmentIndex+1)/j.totalSegments*100:null,textBlock:j.totalSegments?i.createElement("span",{className:"text-white text-sm flex items-baseline space-x-2"},i.createElement("div",null,"Loading Segment"),i.createElement("div",{className:"w-3"},`${j.segmentIndex}`),i.createElement("div",null,"/"),i.createElement("div",null,`${j.totalSegments}`)):i.createElement("span",{className:"text-white text-sm"},"Loading SEG ...")}),q(),i.createElement("div",{className:"absolute w-full"},D.viewportIndex===o&&i.createElement(l.Notification,{id:"viewport-notification",message:D.message,type:D.type,actions:D.actions,onSubmit:D.onSubmit,onOutsideClick:D.onOutsideClick})),X))}w.propTypes={displaySets:o().arrayOf(o().object),viewportIndex:o().number.isRequired,dataSource:o().object,children:o().node,customProps:o().object},w.defaultProps={customProps:{}};const E=w}}]);
//# sourceMappingURL=569.bundle.96f82d06c30ca79d159f.js.map