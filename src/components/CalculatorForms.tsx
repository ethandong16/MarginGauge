import {
  AlertCircle,
  Calculator,
  Plus,
  ReceiptText,
  RotateCcw,
  Target,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import type {
  Attribution,
  BillingChannel,
  ErrorMap,
  ListingDraft,
  OrderDraft,
  SharedDraft,
  TargetDraft,
} from "./calculator-types";
import {
  CheckboxField,
  MoneyField,
  NumberField,
  PercentField,
  SegmentedControl,
  SelectField,
} from "./FormControls";

const ATTRIBUTION_OPTIONS: { value: Attribution; label: string }[] = [
  { value: "none", label: "No attributed program" },
  { value: "offsite-15", label: "Offsite Ads — 15%" },
  { value: "offsite-12", label: "Offsite Ads — 12%" },
  { value: "share-4", label: "Share & Save — 4% credit" },
  { value: "share-intro", label: "Share & Save intro — 6.5% credit" },
];

interface ErrorSummaryProps {
  errors: ErrorMap;
}

export function ErrorSummary({ errors }: ErrorSummaryProps) {
  const messages = [...new Set(Object.values(errors))];
  if (!messages.length) return null;
  const hasOnlyFormError = Object.keys(errors).every((key) => key === "_form");

  return (
    <div className="error-summary" role="alert" tabIndex={-1} id="calculator-errors">
      <AlertCircle size={20} aria-hidden="true" />
      <div>
        <h3>{hasOnlyFormError ? "Review this calculation" : "Check the highlighted fields"}</h3>
        <ul>
          {messages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

interface AttributionFieldsProps {
  draft: SharedDraft;
  errors: ErrorMap;
  update: <K extends keyof SharedDraft>(key: K, value: SharedDraft[K]) => void;
}

function AttributionFields({ draft, errors, update }: AttributionFieldsProps) {
  return (
    <>
      <SelectField
        id="attribution"
        label="Order attribution"
        value={draft.attribution}
        options={ATTRIBUTION_OPTIONS}
        onChange={(value) => update("attribution", value)}
        hint="Choose one source for this order. Etsy Ads spend is entered separately."
        error={errors.attribution}
      />
      {draft.attribution === "offsite-12" && (
        <CheckboxField
          id="confirm-offsite-12"
          label="I confirm this shop qualifies for the 12% Offsite Ads rate"
        checked={draft.confirmsOffsite12}
        onChange={(value) => update("confirmsOffsite12", value)}
        error={errors.confirmsOffsite12}
        required
        />
      )}
      {draft.attribution === "share-intro" && (
        <div className="conditional-fields">
          <CheckboxField
            id="confirm-share-intro"
            label="I confirm this shop was invited and this order falls within its 14-day window"
            checked={draft.confirmsShareIntro}
            onChange={(value) => update("confirmsShareIntro", value)}
            error={errors.confirmsShareIntro}
            required
          />
          <div className="field">
            <label htmlFor="share-intro-ends">Promotion ends</label>
            <div className={`input-shell ${errors.shareIntroEnds ? "is-invalid" : ""}`}>
              <input
                id="share-intro-ends"
                type="date"
                value={draft.shareIntroEnds}
                onChange={(event) => update("shareIntroEnds", event.target.value)}
                aria-invalid={Boolean(errors.shareIntroEnds)}
                aria-describedby={errors.shareIntroEnds ? "share-intro-ends-error" : "share-intro-ends-hint"}
                required
              />
            </div>
            {errors.shareIntroEnds && (
              <span className="field-error" id="share-intro-ends-error">
                {errors.shareIntroEnds}
              </span>
            )}
            {!errors.shareIntroEnds && (
              <span className="field-hint" id="share-intro-ends-hint">
                Enter the deadline shown in Etsy. MarginGauge relies on your eligibility confirmation.
              </span>
            )}
          </div>
        </div>
      )}
    </>
  );
}

interface CostFieldsProps {
  draft: SharedDraft;
  errors: ErrorMap;
  isStatement?: boolean;
  update: <K extends keyof SharedDraft>(key: K, value: SharedDraft[K]) => void;
}

function BillingSelect({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: BillingChannel;
  onChange: (value: BillingChannel) => void;
}) {
  return (
    <SelectField
      id={id}
      label={label}
      value={value}
      options={[
        { value: "external", label: "Outside Etsy" },
        { value: "etsy", label: "Etsy Payment Account" },
      ]}
      onChange={onChange}
    />
  );
}

function CostFields({ draft, errors, isStatement, update }: CostFieldsProps) {
  return (
    <fieldset className="form-section">
      <legend>Costs</legend>
      <div className="section-intro">
        <span>Order-level variable costs</span>
        <span className="section-kicker">USD</span>
      </div>
      <div className="field-grid two-columns">
        <MoneyField
          id="fulfillment-shipping"
          label="Shipping label"
          value={draft.fulfillmentShipping}
          onChange={(value) => update("fulfillmentShipping", value)}
          error={errors.fulfillmentShipping}
        />
        {isStatement && (
          <BillingSelect
            id="shipping-billing"
            label="Shipping label paid through"
            value={draft.shippingBilling}
            onChange={(value) => update("shippingBilling", value)}
          />
        )}
        <MoneyField
          id="insurance"
          label="Shipping insurance"
          value={draft.insurance}
          onChange={(value) => update("insurance", value)}
          error={errors.insurance}
        />
        {isStatement && (
          <BillingSelect
            id="insurance-billing"
            label="Shipping insurance paid through"
            value={draft.insuranceBilling}
            onChange={(value) => update("insuranceBilling", value)}
          />
        )}
        <MoneyField
          id="packaging"
          label="Packaging"
          value={draft.packaging}
          onChange={(value) => update("packaging", value)}
          error={errors.packaging}
        />
        <MoneyField
          id="labor"
          label="Variable labor"
          value={draft.labor}
          onChange={(value) => update("labor", value)}
          error={errors.labor}
        />
        <MoneyField
          id="other-costs"
          label="Other variable costs"
          value={draft.otherCosts}
          onChange={(value) => update("otherCosts", value)}
          error={errors.otherCosts}
        />
        <MoneyField
          id="etsy-ads"
          label="Allocated Etsy Ads spend"
          value={draft.etsyAds}
          onChange={(value) => update("etsyAds", value)}
          hint="Enter the spend you chose to allocate to this order."
          error={errors.etsyAds}
        />
      </div>
      {isStatement && Number(draft.etsyAds || 0) > 0 && (
        <CheckboxField
          id="ads-in-statement"
          label="Include this Etsy Ads charge in the Payment Account estimate"
          checked={draft.etsyAdsInStatement}
          onChange={(value) => update("etsyAdsInStatement", value)}
        />
      )}
    </fieldset>
  );
}

interface ManualFeeFieldsProps {
  draft: SharedDraft;
  errors: ErrorMap;
  update: <K extends keyof SharedDraft>(key: K, value: SharedDraft[K]) => void;
}

function ManualFeeFields({ draft, errors, update }: ManualFeeFieldsProps) {
  return (
    <details className="form-disclosure">
      <summary>
        <span>Manual Etsy adjustments</span>
        <span>Optional</span>
      </summary>
      <div className="disclosure-body field-grid two-columns">
        <MoneyField
          id="manual-fee-debit"
          label="Additional Etsy fee debit"
          value={draft.manualFeeDebit}
          onChange={(value) => update("manualFeeDebit", value)}
          error={errors.manualFeeDebit}
        />
        <MoneyField
          id="manual-fee-credit"
          label="Additional Etsy fee credit"
          value={draft.manualFeeCredit}
          onChange={(value) => update("manualFeeCredit", value)}
          error={errors.manualFeeCredit}
        />
      </div>
    </details>
  );
}

interface OrderFormProps {
  draft: OrderDraft;
  errors: ErrorMap;
  dirty: boolean;
  calculating: boolean;
  onDraftChange: (draft: OrderDraft) => void;
  onSubmit: () => void;
  onReset: () => void;
}

export function OrderForm({
  draft,
  errors,
  dirty,
  calculating,
  onDraftChange,
  onSubmit,
  onReset,
}: OrderFormProps) {
  const [listingAnnouncement, setListingAnnouncement] = useState("");
  const update = <K extends keyof OrderDraft>(key: K, value: OrderDraft[K]) =>
    onDraftChange({ ...draft, [key]: value });

  const updateShared = <K extends keyof SharedDraft>(key: K, value: SharedDraft[K]) =>
    onDraftChange({ ...draft, [key]: value });

  const updateListing = <K extends keyof ListingDraft>(
    index: number,
    key: K,
    value: ListingDraft[K],
  ) => {
    const listings = draft.listings.map((listing, listingIndex) =>
      listingIndex === index ? { ...listing, [key]: value } : listing,
    );
    update("listings", listings);
  };

  const addListing = () => {
    const id = `listing-${Date.now()}`;
    update("listings", [
      ...draft.listings,
      {
        id,
        unitPrice: "",
        quantity: "1",
        unitCogs: "",
        listingType: "standard",
        inventoryOutcome: "sold-out",
        statementDebitOverride: "",
      },
    ]);
    setListingAnnouncement(`Listing ${draft.listings.length + 1} added.`);
    window.requestAnimationFrame(() => document.getElementById(`${id}-price`)?.focus());
  };

  const removeListing = (index: number) => {
    if (draft.listings.length === 1) return;
    const focusListing = draft.listings[index - 1] ?? draft.listings[index + 1];
    const remainingCount = draft.listings.length - 1;
    update(
      "listings",
      draft.listings.filter((_, listingIndex) => listingIndex !== index),
    );
    setListingAnnouncement(
      `Listing ${index + 1} removed. ${remainingCount} ${remainingCount === 1 ? "listing remains" : "listings remain"}.`,
    );
    window.requestAnimationFrame(() => document.getElementById(`${focusListing.id}-price`)?.focus());
  };

  return (
    <form
      className="calculator-form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <ErrorSummary errors={errors} />
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {listingAnnouncement}
      </p>

      <fieldset className="form-section listing-section">
        <legend>Order</legend>
        <div className="section-intro">
          <span>Items sold in this order</span>
          <span className="section-kicker">USD</span>
        </div>
        <div className="listing-list">
          {draft.listings.map((listing, index) => (
            <div className="listing-row" key={listing.id}>
              <div className="listing-row-heading">
                <strong>Listing {index + 1}</strong>
                {draft.listings.length > 1 && (
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => removeListing(index)}
                    aria-label={`Remove listing ${index + 1}`}
                    title={`Remove listing ${index + 1}`}
                  >
                    <Trash2 size={17} aria-hidden="true" />
                  </button>
                )}
              </div>
              <div className="listing-fields">
                <MoneyField
                  id={`${listing.id}-price`}
                  label="Unit list price"
                  value={listing.unitPrice}
                  onChange={(value) => updateListing(index, "unitPrice", value)}
                  error={errors[`listings.${index}.unitPrice`]}
                  required
                />
                <NumberField
                  id={`${listing.id}-quantity`}
                  label="Quantity"
                  value={listing.quantity}
                  onChange={(value) => updateListing(index, "quantity", value)}
                  error={errors[`listings.${index}.quantity`]}
                  required
                />
                <MoneyField
                  id={`${listing.id}-cogs`}
                  label="Unit COGS"
                  value={listing.unitCogs}
                  onChange={(value) => updateListing(index, "unitCogs", value)}
                  error={errors[`listings.${index}.unitCogs`]}
                  required
                />
              </div>
              {draft.basis === "statement" && (
                <div className="statement-listing-fields">
                  <SelectField
                    id={`${listing.id}-type`}
                    label="Listing type"
                    value={listing.listingType}
                    options={[
                      { value: "standard", label: "Standard" },
                      { value: "private", label: "Private" },
                    ]}
                    onChange={(value) => updateListing(index, "listingType", value)}
                  />
                  {listing.listingType === "standard" && (
                    <SelectField
                      id={`${listing.id}-inventory`}
                      label="Inventory after sale"
                      value={listing.inventoryOutcome}
                      options={[
                        { value: "sold-out", label: "Sold out" },
                        { value: "remains", label: "Inventory remains" },
                      ]}
                      onChange={(value) => updateListing(index, "inventoryOutcome", value)}
                    />
                  )}
                  <NumberField
                    id={`${listing.id}-debit-override`}
                    label="Actual listing fee debits"
                    value={listing.statementDebitOverride}
                    onChange={(value) => updateListing(index, "statementDebitOverride", value)}
                    hint={
                      listing.listingType === "private" && Number(listing.quantity) > 1
                        ? "Required for a private listing with quantity above one."
                        : "Leave blank to use the standard estimate."
                    }
                    error={errors[`listings.${index}.statementDebitOverride`]}
                    required={listing.listingType === "private" && Number(listing.quantity) > 1}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
        <button type="button" className="text-button add-button" onClick={addListing}>
          <Plus size={17} aria-hidden="true" />
          Add listing
        </button>
      </fieldset>

      <fieldset className="form-section">
        <legend>Discounts &amp; charges</legend>
        <div className="field-grid two-columns">
          <SelectField
            id="discount-type"
            label="Seller-funded item discount"
            value={draft.discountType}
            options={[
              { value: "none", label: "No discount" },
              { value: "fixed", label: "Fixed amount" },
              { value: "percent", label: "Percentage" },
            ]}
            onChange={(value) => update("discountType", value)}
          />
          {draft.discountType === "fixed" && (
            <MoneyField
              id="discount-value"
              label="Discount amount"
              value={draft.discountValue}
              onChange={(value) => update("discountValue", value)}
              hint="Use the seller-funded amount on the receipt; v1 allows up to merchandise plus personalization."
              error={errors.discountValue}
            />
          )}
          {draft.discountType === "percent" && (
            <PercentField
              id="discount-value"
              label="Discount rate"
              value={draft.discountValue}
              onChange={(value) => update("discountValue", value)}
              hint="Applied once to the merchandise subtotal."
              error={errors.discountValue}
            />
          )}
          <MoneyField
            id="personalization"
            label="Personalization charged"
            value={draft.personalization}
            onChange={(value) => update("personalization", value)}
            error={errors.personalization}
          />
          <MoneyField
            id="shipping-charged"
            label="Shipping charged"
            value={draft.shippingCharged}
            onChange={(value) => update("shippingCharged", value)}
            hint="What the buyer paid, not your label cost."
            error={errors.shippingCharged}
          />
          <MoneyField
            id="gift-wrap"
            label="Gift wrap charged"
            value={draft.giftWrap}
            onChange={(value) => update("giftWrap", value)}
            error={errors.giftWrap}
          />
          <MoneyField
            id="etsy-coupon"
            label="Etsy-funded coupon"
            value={draft.etsyCoupon}
            onChange={(value) => update("etsyCoupon", value)}
            hint="Use the Etsy-funded amount shown on the receipt."
            error={errors.etsyCoupon}
          />
        </div>
      </fieldset>

      <fieldset className="form-section">
        <legend>Etsy fee scenario</legend>
        <div className="field-grid two-columns">
          <div className="field-stack">
            <AttributionFields draft={draft} errors={errors} update={updateShared} />
          </div>
          <SelectField
            id="shop-state"
            label="Shop state"
            value={draft.shopState}
            options={[
              { value: "other", label: "Other US state" },
              { value: "texas", label: "Texas" },
            ]}
            onChange={(value) => update("shopState", value)}
            hint="Texas seller-fee tax is distinct from buyer sales tax."
          />
          <MoneyField
            id="sales-tax"
            label="Sales tax collected by Etsy"
            value={draft.salesTax}
            onChange={(value) => update("salesTax", value)}
            hint="Enter the receipt amount, or 0 if Etsy collected no sales tax. It is not seller revenue."
            error={errors.salesTax}
            required
          />
        </div>
      </fieldset>

      <CostFields
        draft={draft}
        errors={errors}
        isStatement={draft.basis === "statement"}
        update={updateShared}
      />

      {draft.basis === "statement" && (
        <fieldset className="form-section statement-section">
          <legend>Payment Account details</legend>
          <div className="callout compact-callout">
            <ReceiptText size={19} aria-hidden="true" />
            <p>This estimates order-linked account activity, not your payout or available balance.</p>
          </div>
          <div className="field-grid two-columns">
            <CheckboxField
              id="colorado-order"
              label="Physical order shipped to Colorado"
              checked={draft.coloradoPhysicalOrder}
              onChange={(value) => update("coloradoPhysicalOrder", value)}
            />
            {draft.coloradoPhysicalOrder && (
              <MoneyField
                id="colorado-fee"
                label="Colorado retail delivery fee"
                value={draft.coloradoFee}
                onChange={(value) => update("coloradoFee", value)}
                hint="Buyer-paid pass-through; current standard amount is $0.31."
                error={errors.coloradoFee}
              />
            )}
            <MoneyField
              id="processing-gross"
              label="Actual processing gross"
              value={draft.processingGrossOverride}
              onChange={(value) => update("processingGrossOverride", value)}
              hint="Optional except for a physical Colorado order."
              error={errors.processingGrossOverride}
            />
            <MoneyField
              id="carrier-adjustment"
              label="Carrier adjustment debit"
              value={draft.carrierAdjustment}
              onChange={(value) => update("carrierAdjustment", value)}
              error={errors.carrierAdjustment}
            />
          </div>
        </fieldset>
      )}

      <ManualFeeFields draft={draft} errors={errors} update={updateShared} />

      <details
        className="form-disclosure scope-disclosure"
        open={Boolean(errors.orderStatus || errors.channel) || undefined}
      >
        <summary>
          <span>Scope checks</span>
          <span>US · Etsy.com · USD</span>
        </summary>
        <div className="disclosure-body field-grid two-columns">
          <SelectField
            id="order-status"
            label="Order status"
            value={draft.orderStatus}
            options={[
              { value: "completed", label: "Completed sale" },
              { value: "refunded", label: "Refunded" },
              { value: "canceled", label: "Canceled" },
              { value: "chargeback", label: "Chargeback" },
              { value: "protection", label: "Purchase Protection case" },
            ]}
            onChange={(value) => update("orderStatus", value)}
            error={errors.orderStatus}
          />
          <SelectField
            id="sales-channel"
            label="Sales channel"
            value={draft.channel}
            options={[
              { value: "etsy", label: "Etsy.com marketplace" },
              { value: "pattern", label: "Pattern" },
              { value: "square", label: "Square / in-person" },
            ]}
            onChange={(value) => update("channel", value)}
            error={errors.channel}
          />
        </div>
      </details>

      <div className="form-actions">
        <button type="submit" className="primary-button" disabled={calculating}>
          <Calculator size={18} aria-hidden="true" />
          {calculating ? "Calculating…" : dirty ? "Recalculate profit" : "Calculate profit"}
        </button>
        <button type="button" className="icon-button reset-button" onClick={onReset} title="Reset calculator">
          <RotateCcw size={18} aria-hidden="true" />
          <span className="sr-only">Reset calculator</span>
        </button>
      </div>
    </form>
  );
}

interface TargetFormProps {
  draft: TargetDraft;
  errors: ErrorMap;
  dirty: boolean;
  calculating: boolean;
  onDraftChange: (draft: TargetDraft) => void;
  onSubmit: () => void;
  onReset: () => void;
}

export function TargetForm({
  draft,
  errors,
  dirty,
  calculating,
  onDraftChange,
  onSubmit,
  onReset,
}: TargetFormProps) {
  const update = <K extends keyof TargetDraft>(key: K, value: TargetDraft[K]) =>
    onDraftChange({ ...draft, [key]: value });
  const updateShared = <K extends keyof SharedDraft>(key: K, value: SharedDraft[K]) =>
    onDraftChange({ ...draft, [key]: value });

  return (
    <form
      className="calculator-form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <ErrorSummary errors={errors} />

      <fieldset className="form-section">
        <legend>Product &amp; target</legend>
        <div className="section-intro">
          <span>One listing, one order scenario</span>
          <span className="section-kicker">USD</span>
        </div>
        <div className="field-grid two-columns">
          <NumberField
            id="target-quantity"
            label="Quantity"
            value={draft.quantity}
            onChange={(value) => update("quantity", value)}
            error={errors.quantity}
            required
          />
          <MoneyField
            id="target-unit-cogs"
            label="Unit COGS"
            value={draft.unitCogs}
            onChange={(value) => update("unitCogs", value)}
            error={errors.unitCogs}
            required
          />
        </div>
        <div className="target-selector">
          <SegmentedControl
            label="Target type"
            value={draft.targetType}
            compact
            options={[
              { value: "profit", label: "Profit target" },
              { value: "margin", label: "Margin target" },
            ]}
            onChange={(value) => update("targetType", value)}
          />
          {draft.targetType === "profit" ? (
            <MoneyField
              id="target-value"
              label="Order contribution profit"
              value={draft.targetValue}
              onChange={(value) => update("targetValue", value)}
              error={errors.targetValue}
              required
            />
          ) : (
            <PercentField
              id="target-value"
              label="Contribution margin"
              value={draft.targetValue}
              onChange={(value) => update("targetValue", value)}
              error={errors.targetValue}
              required
            />
          )}
        </div>
      </fieldset>

      <fieldset className="form-section">
        <legend>Discounts &amp; charges</legend>
        <div className="field-grid two-columns">
          <SelectField
            id="target-discount-type"
            label="Seller-funded item discount"
            value={draft.discountType}
            options={[
              { value: "none", label: "No discount" },
              { value: "fixed", label: "Fixed amount" },
              { value: "percent", label: "Percentage" },
            ]}
            onChange={(value) => update("discountType", value)}
          />
          {draft.discountType === "fixed" ? (
            <MoneyField
              id="target-discount-value"
              label="Discount amount"
              value={draft.discountValue}
              onChange={(value) => update("discountValue", value)}
              hint="Fixed scenario amount; v1 allows up to merchandise plus personalization."
              error={errors.discountValue}
            />
          ) : draft.discountType === "percent" ? (
            <PercentField
              id="target-discount-value"
              label="Discount rate"
              value={draft.discountValue}
              onChange={(value) => update("discountValue", value)}
              hint="Applied to the merchandise subtotal."
              error={errors.discountValue}
            />
          ) : null}
          <MoneyField
            id="target-personalization"
            label="Personalization charged"
            value={draft.personalization}
            onChange={(value) => update("personalization", value)}
            error={errors.personalization}
          />
          <MoneyField
            id="target-shipping-charged"
            label="Shipping charged"
            value={draft.shippingCharged}
            onChange={(value) => update("shippingCharged", value)}
            error={errors.shippingCharged}
          />
          <MoneyField
            id="target-gift-wrap"
            label="Gift wrap charged"
            value={draft.giftWrap}
            onChange={(value) => update("giftWrap", value)}
            error={errors.giftWrap}
          />
        </div>
      </fieldset>

      <fieldset className="form-section">
        <legend>Tax &amp; Etsy fees</legend>
        <div className="field-grid two-columns">
          <SelectField
            id="tax-scenario"
            label="Sales tax scenario"
            value={draft.taxScenario}
            options={[
              { value: "", label: "Choose a scenario" },
              { value: "none", label: "No sales tax" },
              { value: "custom", label: "Custom effective rate" },
            ]}
            onChange={(value) => update("taxScenario", value)}
            hint="A scenario for fee estimation, not tax advice."
            error={errors.taxScenario}
            required
          />
          {draft.taxScenario === "custom" && (
            <PercentField
              id="effective-tax-rate"
              label="Effective order tax rate"
              value={draft.effectiveTaxRate}
              onChange={(value) => update("effectiveTaxRate", value)}
              error={errors.effectiveTaxRate}
              required
            />
          )}
          <div className="field-stack">
            <AttributionFields draft={draft} errors={errors} update={updateShared} />
          </div>
          <SelectField
            id="target-shop-state"
            label="Shop state"
            value={draft.shopState}
            options={[
              { value: "other", label: "Other US state" },
              { value: "texas", label: "Texas" },
            ]}
            onChange={(value) => update("shopState", value)}
          />
        </div>
      </fieldset>

      <CostFields draft={draft} errors={errors} update={updateShared} />
      <ManualFeeFields draft={draft} errors={errors} update={updateShared} />

      <div className="form-actions">
        <button type="submit" className="primary-button" disabled={calculating}>
          <Target size={18} aria-hidden="true" />
          {calculating ? "Finding price…" : dirty ? "Recalculate price" : "Find minimum price"}
        </button>
        <button type="button" className="icon-button reset-button" onClick={onReset} title="Reset calculator">
          <RotateCcw size={18} aria-hidden="true" />
          <span className="sr-only">Reset calculator</span>
        </button>
      </div>
    </form>
  );
}
