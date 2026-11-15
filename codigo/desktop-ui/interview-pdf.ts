import { jsPDF } from 'jspdf';
import { QUESTIONS, questionTitle, type Interview } from '../src/lib/risk-profile';
import isotipo from '../src/assets/isotipo.png';

export function interviewPDF(interview:Interview,personName:string,logo?:string){
 const pdf=new jsPDF({unit:'mm',format:'a4',compress:true});
 pdf.setProperties({title:'Respuestas del cuestionario - '+personName,author:'Prestafin Terminal'});
 let y=25;
 const header=()=>{if(logo)pdf.addImage(logo,'PNG',18,5,15,15,'prestafin-isotipo');pdf.setFont('helvetica','bold');pdf.setFontSize(11);pdf.setTextColor(25,80,68);pdf.text('PRESTAFIN-TERMINAL',logo?37:18,12);pdf.setFontSize(8);pdf.text('RESPUESTAS DEL CUESTIONARIO',logo?37:18,17);pdf.setTextColor(30,30,30);};
 header();
 const text=(value:string,bold=false)=>{
  pdf.setFont('helvetica',bold?'bold':'normal');pdf.setFontSize(10);
  const clean=value.replace(/[\u2010-\u2015\u2212]/g,'-').replace(/\t/g,' ').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'');
  for(const line of pdf.splitTextToSize(clean,174) as string[]){if(y>275){pdf.addPage();header();y=25;pdf.setFont('helvetica',bold?'bold':'normal');pdf.setFontSize(10);}pdf.text(line,18,y);y+=5;}
  y+=3;
 };
 text(personName,true);text(interview.alias);
 text('Revisión '+interview.revision+' | Respuestas actualizadas: '+new Date(interview.updatedAt).toLocaleString('es-ES'));
 text('Respuestas declaradas. Los campos pendientes se indican expresamente. Este documento no es una recomendación de inversión ni certifica idoneidad.');
 for(const [index,q] of QUESTIONS.entries()){
  const value=interview.answers[q.id];
  const answer=value===undefined?'Sin responder':value==='unknown'?'No lo sé todavía':q.kind==='money'?Number(value).toLocaleString('es-ES',{style:'currency',currency:'EUR'}):q.options?.find(o=>o.value===value)?.label??String(value);
  if(y>250){pdf.addPage();header();y=25;}
  text(`${index+1}. ${questionTitle(q,interview.answers)}`,true);text(answer);
 }
 const total=pdf.getNumberOfPages();
 for(let page=1;page<=total;page++){pdf.setPage(page);pdf.setFont('helvetica','normal');pdf.setFontSize(8);pdf.setTextColor(100);pdf.text(`Prestafin | Documento personal | ${page} / ${total}`,18,288);}
 return pdf;
}
export async function saveInterviewPDF(interview:Interview,personName:string){
 const blob=await (await fetch(isotipo)).blob();
 const logo=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('No se pudo cargar el isotipo de Prestafin.'));reader.readAsDataURL(blob);});
 await interviewPDF(interview,personName,logo).save('Prestafin-respuestas-'+interview.id.replace(/[^a-z0-9_-]/gi,'').slice(0,40)+'.pdf',{returnPromise:true});
}
