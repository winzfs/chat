const signupKey = 'chitchat.signup.v1';

export function hasCompletedSignup() {
  try {
    return localStorage.getItem(signupKey) === 'yes';
  } catch {
    return false;
  }
}

export function completeSignup() {
  localStorage.setItem(signupKey, 'yes');
}

export function clearSignup() {
  localStorage.removeItem(signupKey);
}
