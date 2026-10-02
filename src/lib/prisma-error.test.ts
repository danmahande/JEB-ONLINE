import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isPrismaRecordNotFoundError,
  isPrismaUniqueConstraintError,
  prismaErrorCode,
} from "./prisma-error";

// R22 regression context (offense #42): routes used
// `error instanceof PrismaClientKnownRequestError`, which is false under the
// production bundle because the class resolves through more than one module
// instance. These tests pin the duck-typed contract: `code` decides, not the
// prototype chain. The live-bundle regression proof is the R22 auditor E2E
// (duplicate register -> 409, duplicate admin create -> 409).
describe("prisma error duck typing", () => {
  it("reads the code off plain error-shaped objects across prototypes", () => {
    assert.equal(prismaErrorCode({ code: "P2002" }), "P2002");
    assert.equal(prismaErrorCode({ code: "P2025" }), "P2025");
    assert.equal(prismaErrorCode({ code: 2002 }), null);
    assert.equal(prismaErrorCode({ code: null }), null);
    assert.equal(prismaErrorCode(new Error("no code")), null);
    assert.equal(prismaErrorCode(null), null);
    assert.equal(prismaErrorCode(undefined), null);
    assert.equal(prismaErrorCode("P2002"), null);
  });

  it("classifies unique-constraint and record-not-found errors", () => {
    assert.equal(isPrismaUniqueConstraintError({ code: "P2002" }), true);
    assert.equal(isPrismaUniqueConstraintError({ code: "P2025" }), false);
    assert.equal(isPrismaUniqueConstraintError(new Error("dup")), false);
    assert.equal(isPrismaRecordNotFoundError({ code: "P2025" }), true);
    assert.equal(isPrismaRecordNotFoundError({ code: "P2002" }), false);
    assert.equal(isPrismaRecordNotFoundError(null), false);
  });
});
