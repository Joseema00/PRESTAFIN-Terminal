import { useContext } from 'react';
import { BillingContext } from './billing';
export function useAuth() {
  const context=useContext(BillingContext),user=context?.state?.user??null;
  return {session:null,user,loading:context?.loading??false,isAuthenticated:!!user};
}
