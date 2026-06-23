const key = 'chitchat.profileId.v1';

export function getProfileId() {
  try {
    return localStorage.getItem(key)?.trim() ?? '';
  } catch {
    return '';
  }
}
