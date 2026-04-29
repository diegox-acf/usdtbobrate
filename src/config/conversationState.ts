export type ConversationState = 'IDLE' | 'AWAITING_TARGET_PRICE';

const states = new Map<number, ConversationState>();

export const getState = (chatId: number): ConversationState =>
  states.get(chatId) ?? 'IDLE';

export const setState = (chatId: number, state: ConversationState): void => {
  if (state === 'IDLE') {
    states.delete(chatId);
  } else {
    states.set(chatId, state);
  }
};
