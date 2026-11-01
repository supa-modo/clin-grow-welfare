import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import { memberDistributionApi } from '@/services/memberDistribution';

export function useMemberDistribution() {
  const userId = useAuthStore(state => state.user?.id);
  return useQuery({ queryKey: ['member-distribution', userId], queryFn: memberDistributionApi.view,
    enabled: Boolean(userId), staleTime: 0, gcTime: 0, refetchOnWindowFocus: 'always', refetchInterval: 60000, retry: 1 });
}
