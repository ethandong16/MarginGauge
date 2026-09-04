import { describe, expect, it } from "vitest";

import { calculateOrder } from "./calculator";
import { CURRENT_RATE_CATALOG, resolveRule } from "./catalog";
import { DEFAULT_US_CONTEXT } from "./types";
import type { OrderCalculationInput, RateCatalogRelease } from "./types";

describe("rate catalog and provenance", () => {
  it("publishes the frozen release with an immutable-reference manifest", () => {
    expect(CURRENT_RATE_CATALOG.catalogReleaseId).toBe("etsy-us-2026-09-03.1");
    expect(CURRENT_RATE_CATALOG.calculationContractVersion).toBe("1.0.0");
    expect(CURRENT_RATE_CATALOG.status).toBe("Active");
    expect(Object.isFrozen(CURRENT_RATE_CATALOG)).toBe(true);
    expect(Object.isFrozen(CURRENT_RATE_CATALOG.rules)).toBe(true);
    expect(Object.isFrozen(CURRENT_RATE_CATALOG.rules[0]?.formula)).toBe(true);
    expect(CURRENT_RATE_CATALOG.ruleRevisionIds).toEqual(
      CURRENT_RATE_CATALOG.rules.map((rule) => rule.revisionId),
    );
    expect(new Set(CURRENT_RATE_CATALOG.ruleRevisionIds).size).toBe(
      CURRENT_RATE_CATALOG.ruleRevisionIds.length,
    );
  });

  it("keeps official effectivity, source update, verification, and activation separate", () => {
    const texas = CURRENT_RATE_CATALOG.rules.find(
      (rule) => rule.ruleFamilyId === "texas_seller_fee_tax",
    );
    expect(texas?.effectivity.status).toBe("PUBLISHED");
    expect(texas?.effectivity.startsAt).toContain("2025-10-01");
    const transaction = CURRENT_RATE_CATALOG.rules.find(
      (rule) => rule.ruleFamilyId === "transaction_fee",
    );
    expect(transaction?.effectivity.status).toBe("NOT_PUBLISHED");
    expect(transaction?.effectivity.startsAt).toBeNull();
    expect(transaction?.effectivity.sourceUpdatedAt).toBe("2026-02-13");
    expect(transaction?.effectivity.verifiedAt).not.toBe("");
    expect(transaction?.effectivity.catalogActivatedAt).not.toBe("");
  });

  it("preserves the two official Texas factors", () => {
    const texas = CURRENT_RATE_CATALOG.rules.find(
      (rule) => rule.ruleFamilyId === "texas_seller_fee_tax",
    );
    expect(texas?.formula).toEqual({
      type: "compound_percentage",
      base: "ROUNDED_TRANSACTION_FEE",
      factorsPpm: [800_000, 62_500],
    });
  });

  it("uses Etsy-funded coupon evidence only for the standard Share & Save credit", () => {
    const couponSourceId = "etsy-funded-coupons-help-2026-09-03";
    const couponSource = CURRENT_RATE_CATALOG.sources.find(
      (source) => source.sourceId === couponSourceId,
    );
    const standard = CURRENT_RATE_CATALOG.rules.find(
      (rule) => rule.ruleFamilyId === "share_save_4",
    );
    const intro = CURRENT_RATE_CATALOG.rules.find(
      (rule) => rule.ruleFamilyId === "share_save_intro_6_5",
    );
    expect(couponSource?.url).toContain("1500005142242-How-Etsy-Funded-Coupons-Work-For-Sellers");
    expect(standard?.sourceIds).toContain(couponSourceId);
    expect(intro?.sourceIds).not.toContain(couponSourceId);
    expect(intro?.sourceIds).toContain("etsy-share-save-help-2026-09-03");
  });

  it("links every rule to present official evidence", () => {
    const sourceIds = new Set(CURRENT_RATE_CATALOG.sources.map((source) => source.sourceId));
    for (const rule of CURRENT_RATE_CATALOG.rules) {
      expect(rule.sourceIds.length).toBeGreaterThan(0);
      for (const sourceId of rule.sourceIds) {
        expect(sourceIds.has(sourceId), `${rule.revisionId} -> ${sourceId}`).toBe(true);
      }
    }
    for (const source of CURRENT_RATE_CATALOG.sources) {
      expect(source.url.startsWith("https://")).toBe(true);
      expect(source.accessedAt).toContain("2026-09-03");
      expect(source.contentHash).toBeNull();
    }
  });

  it("fails closed when a rule is missing, duplicated, or its catalog is quarantined", () => {
    const duplicate = structuredClone(CURRENT_RATE_CATALOG) as RateCatalogRelease;
    const transaction = duplicate.rules.find((rule) => rule.ruleFamilyId === "transaction_fee");
    if (!transaction) {
      throw new Error("Fixture catalog is missing transaction rule.");
    }
    const duplicateRule = { ...transaction, revisionId: `${transaction.revisionId}-duplicate` };
    duplicate.rules.push(duplicateRule);
    duplicate.ruleRevisionIds.push(duplicateRule.revisionId);
    const conflict = resolveRule(duplicate, "transaction_fee", DEFAULT_US_CONTEXT);
    expect(conflict.ok).toBe(false);
    if (!conflict.ok) {
      expect(conflict.error.code).toBe("RATE_VERSION_UNAVAILABLE");
    }

    const missing = structuredClone(CURRENT_RATE_CATALOG) as RateCatalogRelease;
    missing.rules = missing.rules.filter((rule) => rule.ruleFamilyId !== "transaction_fee");
    const absent = resolveRule(missing, "transaction_fee", DEFAULT_US_CONTEXT);
    expect(absent.ok).toBe(false);

    const quarantined = structuredClone(CURRENT_RATE_CATALOG) as RateCatalogRelease;
    quarantined.status = "Quarantined";
    const unavailable = resolveRule(quarantined, "transaction_fee", DEFAULT_US_CONTEXT);
    expect(unavailable.ok).toBe(false);
  });

  it("uses inclusive starts and exclusive ends at the catalog verification instant", () => {
    const atStart = structuredClone(CURRENT_RATE_CATALOG) as RateCatalogRelease;
    const startRule = atStart.rules.find((rule) => rule.ruleFamilyId === "transaction_fee");
    if (!startRule) throw new Error("Fixture catalog is missing transaction rule.");
    startRule.effectivity = {
      ...startRule.effectivity,
      status: "PUBLISHED",
      startsAt: atStart.catalogVerifiedAt,
      endsAt: null,
    };
    expect(resolveRule(atStart, "transaction_fee", DEFAULT_US_CONTEXT).ok).toBe(true);

    const atEnd = structuredClone(atStart) as RateCatalogRelease;
    const endRule = atEnd.rules.find((rule) => rule.ruleFamilyId === "transaction_fee");
    if (!endRule) throw new Error("Fixture catalog is missing transaction rule.");
    endRule.effectivity.endsAt = atEnd.catalogVerifiedAt;
    endRule.effectivity.startsAt = "2026-09-02T00:00:00+08:00";
    expect(resolveRule(atEnd, "transaction_fee", DEFAULT_US_CONTEXT).ok).toBe(false);

    const futureStart = structuredClone(atStart) as RateCatalogRelease;
    const futureRule = futureStart.rules.find((rule) => rule.ruleFamilyId === "transaction_fee");
    if (!futureRule) throw new Error("Fixture catalog is missing transaction rule.");
    futureRule.effectivity.startsAt = "2026-09-03T00:00:01+08:00";
    expect(resolveRule(futureStart, "transaction_fee", DEFAULT_US_CONTEXT).ok).toBe(false);
  });

  it("fails closed for future observations, source conflicts, and missing evidence", () => {
    const futureObservation = structuredClone(CURRENT_RATE_CATALOG) as RateCatalogRelease;
    const observedRule = futureObservation.rules.find(
      (rule) => rule.ruleFamilyId === "transaction_fee",
    );
    if (!observedRule) throw new Error("Fixture catalog is missing transaction rule.");
    observedRule.effectivity.observedValidAt = "2026-09-04T00:00:00+08:00";
    expect(resolveRule(futureObservation, "transaction_fee", DEFAULT_US_CONTEXT).ok).toBe(false);

    const conflicted = structuredClone(CURRENT_RATE_CATALOG) as RateCatalogRelease;
    const feePolicy = conflicted.sources.find(
      (source) => source.sourceId === "etsy-fees-policy-2026-02-13",
    );
    if (!feePolicy) throw new Error("Fixture catalog is missing fee policy evidence.");
    feePolicy.verification = "CONFLICT";
    expect(resolveRule(conflicted, "transaction_fee", DEFAULT_US_CONTEXT).ok).toBe(false);

    const missingEvidence = structuredClone(CURRENT_RATE_CATALOG) as RateCatalogRelease;
    missingEvidence.sources = missingEvidence.sources.filter(
      (source) => source.sourceId !== "etsy-fees-policy-2026-02-13",
    );
    expect(resolveRule(missingEvidence, "transaction_fee", DEFAULT_US_CONTEXT).ok).toBe(false);
  });

  it("matches Texas applicability without leaking the rule to other states or currencies", () => {
    const texas = resolveRule(
      CURRENT_RATE_CATALOG,
      "texas_seller_fee_tax",
      { ...DEFAULT_US_CONTEXT, sellerState: "TX" },
    );
    const otherState = resolveRule(
      CURRENT_RATE_CATALOG,
      "texas_seller_fee_tax",
      DEFAULT_US_CONTEXT,
    );
    const currencyMismatch = resolveRule(
      CURRENT_RATE_CATALOG,
      "transaction_fee",
      { ...DEFAULT_US_CONTEXT, listingCurrency: "EUR" },
    );
    expect(texas.ok).toBe(true);
    expect(otherState.ok).toBe(false);
    expect(currencyMismatch.ok).toBe(false);
  });

  it("propagates catalog conflicts through the calculator", () => {
    const catalog = structuredClone(CURRENT_RATE_CATALOG) as RateCatalogRelease;
    catalog.rules = catalog.rules.filter((rule) => rule.ruleFamilyId !== "payment_processing_fee");
    const input: OrderCalculationInput = {
      context: { ...DEFAULT_US_CONTEXT },
      listings: [{ unitListPriceCents: 2_000, quantity: 1, unitCogsCents: 500 }],
      discount: { kind: "none" },
      salesTaxCents: 0,
      attribution: "none",
    };
    const result = calculateOrder(input, { catalog });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("RATE_VERSION_UNAVAILABLE");
    }
  });
});
