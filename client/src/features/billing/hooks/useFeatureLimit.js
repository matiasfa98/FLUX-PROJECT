// src/features/billing/hooks/useFeatureLimit.js
import { useSelector } from 'react-redux';
import { PLANS, PLAN_LIMITS } from '../../../utils/plans';

export const useFeatureLimit = () => {
  // Read plan from user slice or auth context
  const currentPlan = useSelector((state) => state.billing?.plan || state.auth?.user?.plan || PLANS.FREE);
  const limits = PLAN_LIMITS[currentPlan] || PLAN_LIMITS[PLANS.FREE];

  const canAddMember = (currentMemberCount) => {
    return currentMemberCount < limits.maxRoomMembers;
  };

  const canCreateRoom = (currentActiveRoomCount) => {
    return currentActiveRoomCount < limits.maxActiveRooms;
  };

  const canUseCustomDocker = () => {
    return limits.customDockerfiles;
  };

  const checkAiUsageAllowed = (currentDailyUsage) => {
    return currentDailyUsage < limits.aiInferenceDailyLimit;
  };

  return {
    currentPlan,
    limits,
    isPro: currentPlan === PLANS.PRO || currentPlan === PLANS.ENTERPRISE,
    isEnterprise: currentPlan === PLANS.ENTERPRISE,
    canAddMember,
    canCreateRoom,
    canUseCustomDocker,
    checkAiUsageAllowed,
  };
};

export default useFeatureLimit;