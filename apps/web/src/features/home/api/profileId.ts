const key = 'chitchat.profileId.v1';

export function getProfileId() {
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;

    const next = crypto.randomUUID();
    localStorage.setItem(key, next);
    return next;
  } catch {
    return 'anonymous-profile';
  }
}
