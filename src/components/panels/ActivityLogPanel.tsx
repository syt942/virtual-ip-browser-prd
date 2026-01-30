/**
 * Activity Log Panel - Enhanced Activity Log Display
 */

import { ActivityLog } from '@components/dashboard/ActivityLog';

export function ActivityLogPanel() {
  return <ActivityLog enableRealTime={true} />;
}
