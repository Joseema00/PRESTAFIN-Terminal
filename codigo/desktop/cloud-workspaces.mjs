import {validateWorkspace} from './workspace.mjs';
import {randomUUID} from 'node:crypto';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export class CloudWorkspaces{
  constructor({billing,local}){this.billing=billing;this.local=local;this.stores=new Map();}
  get(owner){
    if(typeof owner!=='string'||!uuid.test(owner)||this.billing.session?.user?.id!==owner)throw new Error('La cuenta ha cambiado. Vuelve a abrir sus datos antes de guardar.');
    if(!this.stores.has(owner))this.stores.set(owner,new CloudWorkspace({owner,billing:this.billing,migrate:()=>this.local.get(owner).load()}));
    return this.stores.get(owner);
  }
  async flush(){await Promise.all([...this.stores.values()].map(s=>s.flush()));}
}
export class CloudWorkspace{
  constructor({owner,billing,migrate=async()=>null}){this.owner=owner;this.billing=billing;this.migrate=migrate;this.revision=null;this.current=null;this.draft=null;this.queue=Promise.resolve();}
  run(fn,{before,localRead=false}={}){const op=this.queue.then(()=>this.billing.run(async()=>{if(this.billing.session?.user?.id!==this.owner)throw new Error('La cuenta ha cambiado. Vuelve a abrir sus datos antes de guardar.');before?.();const session=localRead&&(this.draft||this.current)?this.billing.session:await this.billing.auth();if(session?.user?.id!==this.owner)throw new Error('La cuenta ha cambiado. Vuelve a abrir sus datos antes de guardar.');return fn(session);}));this.queue=op.catch(()=>{});return op;}
  async read(session){
    const rows=await this.billing.request(this.billing.config.supabaseUrl,'/rest/v1/terminal_workspaces?'+new URLSearchParams({user_id:'eq.'+this.owner,select:'data,revision,updated_at',limit:'1'}),{token:session.access_token});
    if(!Array.isArray(rows)||rows.length>1)throw new Error('Respuesta de guardado en cuenta no válida.');
    if(!rows.length){this.revision=0;this.current=null;return null;}
    const row=rows[0];if(!Number.isSafeInteger(row.revision)||row.revision<1)throw new Error('Versión de datos en cuenta no válida.');
    const value=validateWorkspace(row.data);this.revision=row.revision;this.current=value;return structuredClone(value);
  }
  load(){return this.run(async session=>{
    // Network errors never fall back to a local copy or an empty replacement.
    let value=await this.read(session);
    if(!value){
      const previous=await this.migrate();
      if(previous){
        const valid=validateWorkspace(previous);
        const result=await this.commit(session,valid,0);
        if(result.conflict)value=await this.read(session);else value=valid;
      }
    }
    this.draft=null;this.operation=null;return value;
  });}
  async commit(session,value,expected,operationId=randomUUID()){
    const result=await this.billing.request(this.billing.config.supabaseUrl,'/rest/v1/rpc/terminal_save_workspace',{body:{p_data:value,p_expected_revision:expected,p_operation_id:operationId},token:session.access_token});
    if(result.conflict)return result;
    if(!Number.isSafeInteger(result.revision)||result.revision!==expected+1||!Number.isFinite(Date.parse(result.updated_at)))throw new Error('No se pudo confirmar el guardado en tu cuenta.');
    this.revision=result.revision;this.current=structuredClone(value);return result;
  }
  save(value){
    const safe=validateWorkspace(structuredClone(value));
    return this.run(async session=>{
      const serialized=JSON.stringify(safe);
      if(this.operation?.serialized!==serialized)this.operation={id:randomUUID(),serialized,expected:this.revision};
      const result=await this.commit(session,safe,this.operation.expected,this.operation.id);
      if(result.conflict)throw new Error('Hay cambios guardados desde otro dispositivo. Exporta tus cambios pendientes y vuelve a cargar tu cuenta antes de continuar.');
      this.draft=null;this.operation=null;return {savedAt:Date.parse(result.updated_at),storage:'cloud'};
    },{before:()=>{if(this.revision===null)throw new Error('Abre los datos de tu cuenta antes de guardar.');this.draft=safe;}});
  }
  exportValue(){return this.run(async session=>structuredClone(this.draft??this.current??await this.read(session)),{localRead:true});}
  flush(){return this.queue;}
}
