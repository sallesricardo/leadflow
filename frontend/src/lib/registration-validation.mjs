/** @param {string} email @param {string} password @param {string} confirmation */
export function validateRegistration(email, password, confirmation) {
  if (!email.trim()) return "Informe um e-mail válido.";
  if (password.length < 8) return "Use pelo menos 8 caracteres na senha.";
  if (password !== confirmation) return "As senhas não coincidem.";
  return null;
}

/** @param {string} email */
export function normalizeRegistrationEmail(email) {
  return email.trim().toLowerCase();
}
