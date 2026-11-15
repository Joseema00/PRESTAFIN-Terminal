import {buildClientPlan,type PlanningContext} from './client-plan';
import {validateInterviews,type Interview} from './risk-profile';
import {validatePortfolioProposal,type PortfolioProposal} from './portfolio-proposal';
import {validateProposalSettings,type ProposalSettings} from './investment-products';
import {INTERVIEW_PLAN_VERSION,generationMessage} from './interview-plan';
import type {AccountModel} from './account-models';

export type InterviewModelSource={kind:'interview';planVersion:number;interview:Interview;proposal:PortfolioProposal};

/** Validate saved evidence without rerunning the optimizer or obtaining fresh prices. */
export function validateModelSource(value:unknown):InterviewModelSource{
 const s=value as InterviewModelSource;
 if(!s||s.kind!=='interview'||![7,8,9,10].includes(s.planVersion))throw new Error('Origen del modelo no compatible');
 const interview=validateInterviews([s.interview])[0]!,proposal=validatePortfolioProposal(s.proposal);
 if(!proposal.client||proposal.interviewId!==interview.id||proposal.revision!==interview.revision||proposal.kind==='planning'||!proposal.positions.length)throw new Error('El modelo no coincide con su entrevista de origen');
 return {kind:'interview',planVersion:s.planVersion,interview,proposal};
}

export function createInterviewModel(interview:Interview,context:PlanningContext,name:string,settings?:ProposalSettings):AccountModel{
 if(!name.trim()||name.trim().length>120)throw new Error('Escribe un nombre de hasta 120 caracteres para el modelo');
 const snapshot=validateInterviews([{...structuredClone(interview),generated:undefined}])[0]!;
 const options=validateProposalSettings({variant:'base',excluded:[],fundAccessConfirmed:false,...settings,priority:'funds',fundAccessMode:'study',allowEtfFallback:false});
 const plan=buildClientPlan(snapshot.answers,options,context);
 if(!plan.canCreate)throw new Error(generationMessage(plan));
 if(!plan.proposal?.positions.length||plan.kind==='planning')throw new Error(plan.proposal?.conditions.at(-1)??'Revisa las condiciones de la entrevista antes de crear un modelo de fondos');
 const now=Date.now(),proposal={...plan.proposal,interviewId:snapshot.id,revision:snapshot.revision};
 return {id:'user-model-'+crypto.randomUUID(),name:name.trim(),description:plan.proposal.reasons.slice(0,2).join(' ').slice(0,2000),
  minYears:({short:0,medium:3,long:5,verylong:10} as Record<string,number>)[String(snapshot.answers.horizon)]??0,
  allocation:proposal.positions.map(p=>({assetId:p.assetId,pct:p.weight})),revision:1,createdAt:now,updatedAt:now,
  source:validateModelSource({kind:'interview',planVersion:INTERVIEW_PLAN_VERSION,interview:snapshot,proposal})};
}

/** Repeating a save reuses its snapshot; a changed interview or wealth creates another model. */
export function sameInterviewModel(a:AccountModel,b:AccountModel):boolean{
 if(!a.source||!b.source||a.name!==b.name)return false;
 const input=(s:InterviewModelSource)=>({planVersion:s.planVersion,id:s.interview.id,alias:s.interview.alias,revision:s.interview.revision,answers:s.interview.answers,client:s.proposal.client,settings:s.proposal.settings});
 return JSON.stringify(input(a.source))===JSON.stringify(input(b.source));
}
