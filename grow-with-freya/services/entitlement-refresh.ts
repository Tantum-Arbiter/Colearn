import { ApiClient } from './api-client';
import { Logger } from '@/utils/logger';

const log = Logger.create('EntitlementRefresh');

export interface ServerEntitlement {
  tier: 'free' | 'basic' | 'premium';
  source: string;
}

export async function refreshServerEntitlement(): Promise<ServerEntitlement | null> {
  try {
    if (!(await ApiClient.isAuthenticated())) return null;
    return await ApiClient.request<ServerEntitlement>('/api/entitlements/refresh', { method: 'POST' });
  } catch (error) {
    log.warn('The gateway could not refresh the subscription; it will check again at the next download', error);
    return null;
  }
}
