import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeRegistrationEmail,
  validateRegistration,
} from "./registration-validation.mjs";

test("registration rejects a password shorter than eight characters", () => {
  assert.equal(
    validateRegistration("ana@example.com", "short", "short"),
    "Use pelo menos 8 caracteres na senha.",
  );
});

test("registration rejects passwords that do not match", () => {
  assert.equal(
    validateRegistration("ana@example.com", "long-password", "other-password"),
    "As senhas não coincidem.",
  );
});

test("registration accepts matching passwords and normalizes the email", () => {
  assert.equal(
    validateRegistration(" ANA@EXAMPLE.COM ", "long-password", "long-password"),
    null,
  );
  assert.equal(normalizeRegistrationEmail(" ANA@EXAMPLE.COM "), "ana@example.com");
});
