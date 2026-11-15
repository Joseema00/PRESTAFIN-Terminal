import type { jsPDF } from 'jspdf';
import type { ReportChartId } from '../src/lib/adviser';
export type ReportChart={id:ReportChartId;title:string;caption:string;unit:'EUR'|'%'|'Índice';kind:'bars'|'lines'|'diagram';labels:string[];series:{name:string;values:number[]}[];x?:number[]};
export type GraphicOp=
 |{kind:'text';x:number;y:number;text:string;size:number;color:string;anchor?:'start'|'middle'|'end';bold?:boolean}
 |{kind:'line';points:[number,number][];color:string;width:number;dash?:boolean}
 |{kind:'rect';x:number;y:number;width:number;height:number;fill:string};
const format=(n:number)=>Math.abs(n)>=1e15?n.toExponential(2):new Intl.NumberFormat('es-ES',{maximumFractionDigits:Math.abs(n)<10?2:1,notation:Math.abs(n)>=10000?'compact':'standard'}).format(n);
const shorten=(s:string,n=30)=>s.length>n?s.slice(0,n-1)+'…':s;
/** Shared vector scene: the preview and the PDF use identical plotted values. */
export function reportGraphic(chart:ReportChart,theme:'brand'|'mono'='brand'){
 const palette=theme==='mono'?['#263238','#606c72','#9aa5a9','#bfc9cd']:['#176c65','#cb9341','#5f789f','#b26e6b'];
 const ink='#234347',muted='#647578',ops:GraphicOp[]=[],height=chart.kind==='bars'?Math.max(260,chart.labels.length*35+55):chart.kind==='diagram'?290:330;
 const text=(x:number,y:number,s:string,size=12,color=ink,anchor:'start'|'middle'|'end'='start',bold=false)=>ops.push({kind:'text',x,y,text:s,size,color,anchor,bold});
 const line=(points:[number,number][],color=muted,width=1,dash=false)=>ops.push({kind:'line',points,color,width,dash});
 const rect=(x:number,y:number,width:number,h:number,fill:string)=>ops.push({kind:'rect',x,y,width,height:h,fill});
 if(!chart.labels.length||chart.series.some(s=>s.values.length!==chart.labels.length||s.values.some(v=>!Number.isFinite(v))))throw new Error('Datos del gráfico no válidos');
 rect(0,0,760,height,'#f8fbfa');
 if(chart.kind==='diagram'){
  const values=chart.series[0]!.values;
  const box=(x:number,y:number,label:string,value:number)=>{rect(x,y,208,64,'#e3eeeb');text(x+104,y+24,label,13,ink,'middle',true);text(x+104,y+47,format(value)+' EUR',16,ink,'middle');};
  for(let i=0;i<3;i++){box(12,14+i*88,chart.labels[i]!,values[i]!);line([[220,46+i*88],[256,46+i*88],[256,134],[280,134]],palette[0],2);}
  box(280,102,'Activos totales',values[0]!+values[1]!+values[2]!);
  line([[488,134],[514,134],[514,78],[540,78]],palette[1],2);line([[488,134],[514,134],[514,202],[540,202]],palette[0],2);
  box(540,46,'Deuda pendiente',values[3]!);box(540,170,'Patrimonio neto',values[4]!);
  text(384,190,'Patrimonio neto = activos − deuda',12,muted,'middle');
 }else if(chart.kind==='bars'){
  const values=chart.series[0]!.values,min=Math.min(0,...values),max=Math.max(0,...values),span=max-min||1,left=235,right=645;
  const px=(v:number)=>left+(v-min)/span*(right-left),zero=px(0);
  line([[zero,15],[zero,height-30]],'#a8bdb6');
  chart.labels.forEach((label,i)=>{const y=28+i*35,v=values[i]!;text(12,y+7,shorten(label),12);rect(Math.min(zero,px(v)),y-11,Math.max(.8,Math.abs(px(v)-zero)),23,v<0?palette[3]!:palette[i%3]!);text(748,y+7,format(v)+' '+chart.unit,12,ink,'end',true);});
  text(left,height-8,'Barras con origen en cero · '+chart.unit,11,muted);
 }else{
  const values=chart.series.flatMap(s=>s.values),lo=Math.min(0,...values),hi=Math.max(0,...values),pad=(hi-lo||1)*.07,min=lo<0?lo-pad:0,max=hi+pad;
  const left=78,right=729,top=20,bottom=244;
  const xs=chart.x??chart.labels.map((_,i)=>i),first=xs[0]!,last=xs.at(-1)!,px=(i:number)=>left+(xs[i]!-first)/(last-first||1)*(right-left),py=(v:number)=>bottom-(v-min)/(max-min)*(bottom-top);
  for(let i=0;i<=4;i++){const v=min+(max-min)*i/4,y=py(v);line([[left,y],[right,y]],'#dce5e1');text(left-10,y+4,format(v),11,muted,'end');}
  text(10,14,chart.unit,11,muted);
  [...new Set([0,Math.floor((chart.labels.length-1)/3),Math.floor((chart.labels.length-1)*2/3),chart.labels.length-1])].forEach(i=>text(px(i),266,chart.labels[i]!,11,muted,i===0?'start':i===chart.labels.length-1?'end':'middle'));
  chart.series.forEach((s,i)=>{
   line(s.values.map((v,j)=>[px(j),py(v)]),palette[i%4],2.5,theme==='mono'&&i%2===1);
   if(s.values.length===1)rect(px(0)-3,py(s.values[0]!)-3,6,6,palette[i%4]!);
   const x=20+(i%2)*370,y=291+Math.floor(i/2)*22;line([[x,y-4],[x+24,y-4]],palette[i%4],3,theme==='mono'&&i%2===1);text(x+32,y,shorten(s.name,40),12);
  });
 }
 return {width:760,height,ops};
}
export function drawReportGraphic(pdf:jsPDF,chart:ReportChart,x:number,y:number,width:number,theme:'brand'|'mono'){
 const scene=reportGraphic(chart,theme),scale=width/scene.width;
 for(const op of scene.ops){
  if(op.kind==='rect'){pdf.setFillColor(op.fill);pdf.rect(x+op.x*scale,y+op.y*scale,op.width*scale,op.height*scale,'F');}
  else if(op.kind==='text'){pdf.setTextColor(op.color);pdf.setFont('helvetica',op.bold?'bold':'normal');pdf.setFontSize(op.size*scale*2.83465);pdf.text(op.text.replaceAll('−','-').replaceAll('…','...'),x+op.x*scale,y+op.y*scale,{align:op.anchor==='middle'?'center':op.anchor==='end'?'right':'left'});}
  else {pdf.setDrawColor(op.color);pdf.setLineWidth(op.width*scale);pdf.setLineDashPattern(op.dash?[2,1]:[],0);for(let i=1;i<op.points.length;i++){const a=op.points[i-1]!,b=op.points[i]!;pdf.line(x+a[0]*scale,y+a[1]*scale,x+b[0]*scale,y+b[1]*scale);}pdf.setLineDashPattern([],0);}
 }
 return scene.height*scale;
}
