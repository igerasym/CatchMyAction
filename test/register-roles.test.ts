import { describe, expect, it } from "vitest";
import { passwordChecks, roleFromQuery, ROLE_OPTIONS } from "@/app/(app)/register/roles";
import { validatePassword } from "@/lib/validation";

describe("roleFromQuery", () => {
  it("preselects Photographer only for ?role=photographer", () => {
    expect(roleFromQuery("photographer")).toBe("PHOTOGRAPHER");
    expect(roleFromQuery(null)).toBe("USER");
    expect(roleFromQuery("PHOTOGRAPHER")).toBe("USER");
    expect(roleFromQuery("admin")).toBe("USER");
  });
});

describe("ROLE_OPTIONS", () => {
  it("submits exactly the roles the register API accepts", () => {
    expect(ROLE_OPTIONS.map((o) => o.value).sort()).toEqual(["PHOTOGRAPHER", "USER"]);
  });
});

describe("passwordChecks", () => {
  const samples = ["", "short1A", "alllowercase1", "ALLUPPER1", "NoNumbersHere", "Valid123", "aB3defgh", "Пароль1Aa"];

  it("is all-green exactly when the server-side validator accepts the password", () => {
    for (const pw of samples) {
      const allOk = passwordChecks(pw).every((c) => c.ok);
      expect(allOk, pw).toBe(validatePassword(pw) === null);
    }
  });

  it("ticks individual rules", () => {
    const byLabel = Object.fromEntries(passwordChecks("abcdefgh").map((c) => [c.label, c.ok]));
    expect(byLabel["8+ characters"]).toBe(true);
    expect(byLabel["Lowercase letter"]).toBe(true);
    expect(byLabel["Uppercase letter"]).toBe(false);
    expect(byLabel["A number"]).toBe(false);
  });
});
