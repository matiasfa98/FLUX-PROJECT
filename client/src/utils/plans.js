// src/utils/plans.js
export const PLANS = {
  FREE: 'free',
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
};

export const PLAN_LIMITS = {
  [PLANS.FREE]: {
    name: 'Community Pilot',
    priceMonthly: 0,
    maxRoomMembers: 3,
    maxActiveRooms: 1,
    containerRamMb: 256,
    containerCpu: 0.5,
    containerTimeoutSec: 10,
    aiInferenceDailyLimit: 25,
    customDockerfiles: false,
    persistentDms: false,
    maxVideoMeshStreams: 4,
  },
  [PLANS.PRO]: {
    name: 'Pro Pilot',
    priceMonthly: 19,
    maxRoomMembers: 15,
    maxActiveRooms: 10,
    containerRamMb: 1024,
    containerCpu: 2.0,
    containerTimeoutSec: 60,
    aiInferenceDailyLimit: 1000,
    customDockerfiles: true,
    persistentDms: true,
    maxVideoMeshStreams: 15,
  },
  [PLANS.ENTERPRISE]: {
    name: 'Enterprise Cluster',
    priceMonthly: null, // Custom
    maxRoomMembers: 100,
    maxActiveRooms: Infinity,
    containerRamMb: 4096,
    containerCpu: 4.0,
    containerTimeoutSec: 300,
    aiInferenceDailyLimit: Infinity,
    customDockerfiles: true,
    persistentDms: true,
    maxVideoMeshStreams: 50,
  },
};