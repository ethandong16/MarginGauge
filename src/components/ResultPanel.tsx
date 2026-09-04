import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  RefreshCw,
} from "lucide-react";
import type { CalculatorMode, ResultViewModel } from "./calculator-types";

interface ResultPanelProps {
  mode: CalculatorMode;
  result: ResultViewModel | null;
  dirty: boolean;
  calculating: boolean;
}

export function ResultPanel({ mode, result, dirty, calculating }: ResultPanelProps) {
  if (!result) {
    return (
      <aside className="result-panel is-empty" aria-live="polite" aria-busy={calculating}>
        <div className="empty-result-mark" aria-hidden="true">
          {mode === "order" ? <ArrowUpRight size={24} /> : <ArrowRight size={24} />}
        </div>
        <p className="result-eyebrow">Ready to calculate</p>
        <h2>{mode === "order" ? "See this order’s contribution" : "Find a minimum viable price"}</h2>
        <p>Complete the required fields and calculate to see a fee-by-fee estimate.</p>
      </aside>
    );
  }

  return (
    <aside
      className={`result-panel ${result.isLoss ? "is-loss" : ""}`}
      aria-live="polite"
      aria-busy={calculating}
    >
      <div className="result-status-row">
        <span className={`result-status ${dirty ? "is-stale" : "is-current"}`}>
          {dirty ? <RefreshCw size={14} aria-hidden="true" /> : <CheckCircle2 size={14} aria-hidden="true" />}
          {dirty ? "Inputs changed · Recalculate" : "Current estimate"}
        </span>
        <span className="estimate-label">Estimate</span>
      </div>

      <p className="result-eyebrow">{result.eyebrow}</p>
      <h2 id="calculator-result-heading" tabIndex={-1}>
        {result.headline}
      </h2>
      <p className="headline-label">{result.headlineLabel}</p>
      <p className="result-description">{result.description}</p>

      <div className="result-metrics" aria-label="Key result metrics">
        {result.metrics.map((metric) => (
          <div className="result-metric" key={metric.label} title={metric.hint}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </div>
        ))}
      </div>

      <details className="result-breakdown">
        <summary>
          <span>Full breakdown</span>
          <span>USD</span>
        </summary>
        <div className="breakdown-body">
          {result.sections.map((section) => (
            <section className="breakdown-section" key={section.title}>
              <h3>{section.title}</h3>
              <dl>
                {section.lines.map((line) => (
                  <div className={`breakdown-line is-${line.kind ?? "default"}`} key={`${section.title}-${line.label}`}>
                    <dt title={line.hint}>
                      <span>{line.label}</span>
                      {line.meta && <small>{line.meta}</small>}
                      {line.sources && line.sources.length > 0 && (
                        <span className="line-sources">
                          {line.sources.map((source) => (
                            <a href={source.url} target="_blank" rel="noreferrer" key={source.url}>
                              {source.label}
                              <ExternalLink size={11} aria-hidden="true" />
                            </a>
                          ))}
                        </span>
                      )}
                    </dt>
                    <dd>{line.amount}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </details>

      {result.notices.length > 0 && (
        <div className="result-notices">
          <AlertTriangle size={17} aria-hidden="true" />
          <div>
            {result.notices.map((notice) => (
              <p key={notice}>{notice}</p>
            ))}
          </div>
        </div>
      )}

      <div className="result-provenance">
        <FileCheck2 size={17} aria-hidden="true" />
        <div>
          <strong>Rates verified Sep 3, 2026</strong>
          <span>
            Catalog {result.catalogId} · Contract {result.contractVersion}
          </span>
        </div>
      </div>

      <a className="result-method-link" href="#methodology">
        Review methods and assumptions
        {result.isLoss ? <ArrowDownRight size={16} aria-hidden="true" /> : <ArrowRight size={16} aria-hidden="true" />}
      </a>
    </aside>
  );
}
