export * from '../../../drizzle/schema';

// Legacy UI code references `shifts`; map it to the existing `golf_pools` table.
export { golfPools as shifts } from '../../../drizzle/schema';