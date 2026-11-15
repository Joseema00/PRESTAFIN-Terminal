import { reportGraphic,type ReportChart } from './report-graphics';
export function ReportFigure({chart,theme}:{chart:ReportChart;theme:'brand'|'mono'}){
 const scene=reportGraphic(chart,theme);
 return <figure className="report-figure"><h4>{chart.title}</h4><svg viewBox={`0 0 ${scene.width} ${scene.height}`} role="img" aria-label={chart.title+'; '+chart.caption}>
  <title>{chart.title}</title><desc>{chart.caption}</desc>
  {scene.ops.map((op,i)=>op.kind==='rect'?<rect key={i} x={op.x} y={op.y} width={op.width} height={op.height} fill={op.fill}/>:op.kind==='text'?<text key={i} x={op.x} y={op.y} fill={op.color} fontSize={op.size} textAnchor={op.anchor??'start'} fontWeight={op.bold?700:400}>{op.text}</text>:<polyline key={i} points={op.points.map(p=>p.join(',')).join(' ')} fill="none" stroke={op.color} strokeWidth={op.width} strokeDasharray={op.dash?'8 4':undefined}/>)}
 </svg><figcaption>{chart.caption}</figcaption></figure>;
}
