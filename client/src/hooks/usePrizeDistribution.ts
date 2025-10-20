import { useMemo } from "react";


export function usePrizeDistribution({ entryFee, totalPlayers, companyCommissionPercentage, firstPrize, perKillReward, matchType }) {
  // Helper to get number of kills
  const getNumKills = (players, matchType) => {
    switch ((matchType || '').toLowerCase()) {
      case 'solo': return Math.max(players - 1, 0);
      case 'duo': return Math.max(players - 2, 0);
      case 'squad': return Math.max(players - 4, 0);
      default: return Math.max(players - 1, 0);
    }
  };

  return useMemo(() => {
    const _entryFee = entryFee || 0;
    const _totalPlayers = totalPlayers || 0;
    const _commissionPercentage = companyCommissionPercentage || 0;
    const _firstPrize = firstPrize || 0;
    const _perKillReward = perKillReward || 0;
    const _matchType = matchType || 'Squad';

    const totalRevenue = _entryFee * _totalPlayers;
    const companyCommission = totalRevenue * (_commissionPercentage / 100);
    const prizePool = totalRevenue - companyCommission;
    const totalKills = getNumKills(_totalPlayers, _matchType);
    const totalKillReward = _perKillReward * totalKills;
    const totalPrizeDistribution = _firstPrize + totalKillReward;
    const isDistributionWithinBudget = totalPrizeDistribution <= prizePool + 0.01;

    return {
      prizePool,
      firstPrize: _firstPrize,
      perKillReward: _perKillReward,
      totalKills,
      totalKillReward,
      totalPrizeDistribution,
      isDistributionWithinBudget,
    };
  }, [entryFee, totalPlayers, companyCommissionPercentage, firstPrize, perKillReward, matchType]);
}
