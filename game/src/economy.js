// Economy — match money. Buy flow is the integrator's: arsenal.buy()
// never touches money; the economy spends it first.
import { ECONOMY } from './config.js';

export function createEconomy() {
  let money = ECONOMY.start;
  return {
    get money() { return money; },
    get killReward() { return ECONOMY.kill; },
    get roundWin() { return ECONOMY.win; },
    get roundLoss() { return ECONOMY.loss; },
    add(n) { money += n; return money; },
    spend(n) {
      if (money < n) return false;
      money -= n;
      return true;
    },
    reset() { money = ECONOMY.start; },
  };
}
