import { Round, RoundStatus } from '../types/auction.types';

export class RoundManager {
  generateRounds(data: {
    totalGifts: number;
    roundDurations: number[];
    giftsPerRound: number[];
    antiSnipingSeconds: number;
  }): Round[] {
    const rounds: Round[] = [];
    let giftsDistributed = 0;

    for (let i = 0; i < data.giftsPerRound.length; i++) {
      const giftsInRound = data.giftsPerRound[i];
      const duration = data.roundDurations[i];

      rounds.push({
        roundNumber: i + 1,
        giftsToDistribute: giftsInRound,
        startTime: new Date(),
        endTime: new Date(),
        duration: duration,
        status: RoundStatus.PENDING,
        winnerIds: [],
      });

      giftsDistributed += giftsInRound;
    }

    if (giftsDistributed !== data.totalGifts) {
      throw new Error(`Gifts per round (${giftsDistributed}) don't match total gifts (${data.totalGifts})`);
    }

    return rounds;
  }
}
