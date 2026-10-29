// This edition is the owner's local workspace, not a simulated cloud session.
export function useAuth() {
  return {session:null,user:null as {email?:string;user_metadata?:Record<string,unknown>}|null,loading:false,isAuthenticated:false};
}
