const REWARD_CODES = [
  'STAMP10', 'COOKIE30', 'SWEET15', 'LOVE20', 'FREE25',
  'TREAT12', 'BONUS18', 'VIP22', 'FUN8', 'JOY14',
];

const REWARD_MESSAGES = [
  "You're one smart cookie! Enjoy your discount.",
  "You came, you saw, you conquered. Claim your prize, champ!",
  "You're one sharp tack! Thanks for sticking with us—enjoy your treat.",
  "Precision pays off. You've successfully navigated your way to a free reward. Well played.",
  "You've officially figured out the secret to winning. Your reward is ready and waiting.",
  "You make this look easy. Your loyalty card is full and your reward is unlocked. Stay sharp.",
  "Sharp choice. Enjoy your well-earned treat.",
  "Stamps full. Logic wins. Enjoy!",
  "You've got the system down. Reward ready!",
  "Savvy shopper, sweet reward. It's yours!",
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateReward(): Promise<{ code: string; message: string }> {
  return Promise.resolve({
    code: randomItem(REWARD_CODES),
    message: randomItem(REWARD_MESSAGES),
  });
}
