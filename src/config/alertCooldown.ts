let lastAlertAt = 0;

export const isOnCooldown = (cooldownMs: number): boolean =>
  cooldownMs > 0 && Date.now() - lastAlertAt < cooldownMs;

export const markAlertSent = (): void => {
  lastAlertAt = Date.now();
};

export const getLastAlertAt = (): number => lastAlertAt;
