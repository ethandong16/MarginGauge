import { ArrowUpRight, BookOpen, ExternalLink, FileClock, LockKeyhole } from "lucide-react";
import {
  CHANGELOG_ENTRIES,
  FAQ_ITEMS,
  FEE_GUIDE_ITEMS,
  METHODOLOGY_FORMULAS,
  METHODOLOGY_INTRO,
  METHODOLOGY_SECTIONS,
  METHODOLOGY_VARIABLES,
  OFFICIAL_SOURCES,
  PRIVACY_CONTENT,
  WORKED_EXAMPLES,
} from "../content";
import type { PrivacySection } from "../content";

const sourceById = new Map(OFFICIAL_SOURCES.map((source) => [source.id, source]));
const privacySections: readonly PrivacySection[] = PRIVACY_CONTENT.sections;

function SourceLinks({ ids, compact = false }: { ids: readonly string[]; compact?: boolean }) {
  return (
    <span className={`source-links ${compact ? "is-compact" : ""}`}>
      {ids.map((id) => {
        const source = sourceById.get(id);
        if (!source) return null;
        return (
          <a href={source.url} target="_blank" rel="noreferrer" key={id}>
            {compact ? source.title.replace(/^Etsy\s/i, "") : source.title}
            <ExternalLink size={13} aria-hidden="true" />
          </a>
        );
      })}
    </span>
  );
}

export function ContentSections() {
  return (
    <div className="editorial-content">
      <section className="content-band methodology-band" id="methodology" aria-labelledby="methodology-title">
        <div className="content-inner">
          <div className="section-heading">
            <BookOpen size={22} aria-hidden="true" />
            <div>
              <p className="section-label">Methodology</p>
              <h2 id="methodology-title">{METHODOLOGY_INTRO.title}</h2>
            </div>
          </div>
          <p className="section-lead">{METHODOLOGY_INTRO.summary}</p>

          <div className="method-grid">
            <div className="method-variables">
              <h3>Order variables</h3>
              <dl>
                {METHODOLOGY_VARIABLES.map((variable) => (
                  <div key={variable.symbol}>
                    <dt>
                      <code>{variable.symbol}</code>
                      <strong>{variable.name}</strong>
                    </dt>
                    <dd>{variable.definition}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="method-formulas">
              <h3>Core formulas</h3>
              <dl>
                {METHODOLOGY_FORMULAS.map((formula) => (
                  <div key={formula.label}>
                    <dt>{formula.label}</dt>
                    <dd>
                      <code>{formula.formula}</code>
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="method-notice">{METHODOLOGY_INTRO.estimateNotice}</p>
            </div>
          </div>

          <div className="method-sections">
            {METHODOLOGY_SECTIONS.map((section) => (
              <article key={section.id} id={section.id}>
                <h3>{section.title}</h3>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {"bullets" in section && section.bullets && (
                  <ul>
                    {section.bullets.map((bullet: string) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                )}
                {section.sourceIds && <SourceLinks ids={section.sourceIds} compact />}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="content-band fee-guide-band" id="fee-guide" aria-labelledby="fee-guide-title">
        <div className="content-inner">
          <div className="section-heading">
            <ArrowUpRight size={22} aria-hidden="true" />
            <div>
              <p className="section-label">Current rules</p>
              <h2 id="fee-guide-title">Etsy US fee guide</h2>
            </div>
          </div>
          <p className="section-lead">
            Each automated rule is tied to an official source and a versioned rate catalog. Variable costs remain seller inputs.
          </p>

          <div
            className="fee-table-wrap"
            role="region"
            aria-label="Etsy fee guide table. Scroll horizontally to view all columns."
            tabIndex={0}
          >
            <table className="fee-table">
              <thead>
                <tr>
                  <th scope="col">Fee or credit</th>
                  <th scope="col">Calculation</th>
                  <th scope="col">When it applies</th>
                  <th scope="col">Calculator treatment</th>
                </tr>
              </thead>
              <tbody>
                {FEE_GUIDE_ITEMS.map((item) => (
                  <tr key={item.id}>
                    <th scope="row">
                      {item.name}
                      <span className={`fee-direction is-${item.direction}`}>{item.direction.replace("-", " ")}</span>
                    </th>
                    <td data-label="Calculation">{item.calculation}</td>
                    <td data-label="When it applies">{item.applicability}</td>
                    <td data-label="Calculator treatment">
                      <p>{item.calculatorTreatment}</p>
                      {item.caveat && <p className="table-caveat">{item.caveat}</p>}
                      <SourceLinks ids={item.sourceIds} compact />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <details className="sources-disclosure">
            <summary>View all official sources and verification status</summary>
            <div className="source-directory">
              {OFFICIAL_SOURCES.map((source) => (
                <article key={source.id}>
                  <div>
                    <span className={`evidence-status is-${source.evidenceStatus}`}>{source.evidenceStatus.replaceAll("-", " ")}</span>
                    <span>Verified {source.verifiedAt}</span>
                  </div>
                  <h3>
                    <a href={source.url} target="_blank" rel="noreferrer">
                      {source.title}
                      <ExternalLink size={14} aria-hidden="true" />
                    </a>
                  </h3>
                  <p>{source.supports.join(" · ")}</p>
                  {source.note && <p className="table-caveat">{source.note}</p>}
                </article>
              ))}
            </div>
          </details>
        </div>
      </section>

      <section className="content-band" id="examples" aria-labelledby="examples-title">
        <div className="content-inner">
          <div className="section-heading">
            <FileClock size={22} aria-hidden="true" />
            <div>
              <p className="section-label">Checked scenarios</p>
              <h2 id="examples-title">Worked examples</h2>
            </div>
          </div>
          <div className="example-grid">
            {WORKED_EXAMPLES.map((example) => (
              <article className="example-item" key={example.id}>
                <h3>{example.title}</h3>
                <ul className="assumption-list">
                  {example.assumptions.map((assumption) => (
                    <li key={assumption}>{assumption}</li>
                  ))}
                </ul>
                <p>{example.result}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="content-band faq-band" id="faq" aria-labelledby="faq-title">
        <div className="content-inner narrow-inner">
          <p className="section-label">Details</p>
          <h2 id="faq-title">Frequently asked questions</h2>
          <div className="faq-list">
            {FAQ_ITEMS.map((item) => (
              <details key={item.id}>
                <summary>{item.question}</summary>
                <div>
                  <p>{item.answer}</p>
                  {item.sourceIds.length > 0 && <SourceLinks ids={item.sourceIds} compact />}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="content-band privacy-band" id="privacy" aria-labelledby="privacy-title">
        <div className="content-inner narrow-inner">
          <div className="section-heading">
            <LockKeyhole size={22} aria-hidden="true" />
            <div>
              <p className="section-label">Privacy</p>
              <h2 id="privacy-title">{PRIVACY_CONTENT.title}</h2>
            </div>
          </div>
          <p className="section-lead">{PRIVACY_CONTENT.summary}</p>
          <p className="privacy-meta">
            Effective {PRIVACY_CONTENT.effectiveDate} · Last updated {PRIVACY_CONTENT.lastUpdated}
          </p>
          <p className="operator-notice">{PRIVACY_CONTENT.operatorNotice}</p>
          <div className="privacy-sections">
            {privacySections.map((section) => (
              <article key={section.id}>
                <h3>{section.title}</h3>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {section.bullets && (
                  <ul>
                    {section.bullets.map((bullet: string) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="content-band changelog-band" id="changelog" aria-labelledby="changelog-title">
        <div className="content-inner narrow-inner">
          <p className="section-label">Version history</p>
          <h2 id="changelog-title">Changelog</h2>
          <div className="changelog-list">
            {CHANGELOG_ENTRIES.map((entry) => (
              <article key={`${entry.date}-${entry.version}`}>
                <div>
                  <time dateTime={entry.date}>{entry.date}</time>
                  <span>v{entry.version}</span>
                </div>
                <h3>{entry.title}</h3>
                <ul>
                  {entry.changes.map((change) => (
                    <li key={change}>{change}</li>
                  ))}
                </ul>
                {entry.catalogId && <code>{entry.catalogId}</code>}
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
