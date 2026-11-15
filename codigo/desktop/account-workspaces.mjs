import path from 'node:path';
import { WorkspaceStore } from './workspace.mjs';

export class AccountWorkspaces {
  constructor(folder,{enabled,userId}){this.folder=folder;this.enabled=enabled;this.userId=userId;this.stores=new Map();this.legacy=new WorkspaceStore(folder);}
  get(owner){
    if(!this.enabled())return this.legacy;
    const active=this.userId();
    if(!active||owner!==active||typeof owner!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(owner))throw new Error('La cuenta ha cambiado. Vuelve a abrir sus datos antes de guardar.');
    if(!this.stores.has(owner))this.stores.set(owner,new WorkspaceStore(path.join(this.folder,'accounts',owner)));
    return this.stores.get(owner);
  }
  async flush(){await Promise.all([this.legacy,...this.stores.values()].map(store=>store.flush()));}
}
