export const PASSWORD_RULES =
  "At least 8 characters, including one uppercase letter, one number, and one special character.";
export function validPassword(password: string) {
  return (
    password.length >= 8 &&
    password.length <= 128 &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9\s]/.test(password)
  );
}
