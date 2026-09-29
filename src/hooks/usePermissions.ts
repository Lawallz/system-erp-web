import { useAuth } from './useAuth'
export const usePermissions = () => useAuth().can
