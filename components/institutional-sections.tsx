import { AssetImage } from "./media";
import type { InstitutionalSectionContent } from "@/lib/institutional-pages";

/**
 * Structured institutional page sections.
 *
 * Two layouts, because the pages that gain sections did not all share a design
 * and a CMS must not quietly restyle them:
 *   - "cards" pairs text and image side by side, alternating so two illustrated
 *     sections in a row do not read as the same block twice.
 *   - "numbered" keeps the existing numbered list used by Governance.
 *
 * In both, a section with no image renders as text only, which is what most
 * sections will be. Image and alt are authored per section because a section's
 * picture usually illustrates that section specifically.
 */
export function InstitutionalSections({
  sections,
  variant = "cards",
}: {
  sections: InstitutionalSectionContent[];
  variant?: "cards" | "numbered" | "prose";
}) {
  if (!sections.length) return null;

  /**
   * "prose" is a single-column reading layout for pages whose sections are
   * long-form text. The cards variant lays a section out as `md:grid-cols-2`
   * so text can sit beside an image; with no image, the text lands in one of
   * the two columns and reads as an accidental half-width column. Renewed Hope
   * is four imageless paragraphs, so it uses this instead.
   */
  if (variant === "prose") {
    return (
      <div className="mt-10 grid gap-6">
        {sections.map((section) => (
          <section
            key={`${section.position}-${section.title}`}
            className="border hairline bg-white p-6 md:p-8"
            aria-labelledby={`institutional-section-${section.position}`}
          >
            <h2
              id={`institutional-section-${section.position}`}
              className="font-display text-2xl text-forest-950"
            >
              {section.title}
            </h2>
            {section.imageUrl && (
              <AssetImage
                src={section.imageUrl}
                alt={section.imageAlt ?? ""}
                width={1200}
                height={675}
                className="mt-5 aspect-[16/9] w-full bg-forest-900/5 object-cover"
                sizes="(max-width: 768px) 100vw, 900px"
              />
            )}
            <div className="mt-4 max-w-3xl space-y-4">
              {section.body
                .split(/\n\s*\n/)
                .filter(Boolean)
                .map((paragraph, i) => (
                  <p key={i} className="text-[15px] leading-relaxed text-ink/75">
                    {paragraph}
                  </p>
                ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  if (variant === "numbered") {
    return (
      <div className="mt-8 divide-y divide-ink/10 border-y hairline bg-white">
        {sections.map((section, index) => (
          <section
            key={`${section.position}-${section.title}`}
            className="grid items-start gap-4 px-6 py-6 md:grid-cols-[80px_240px_1fr]"
            aria-labelledby={`institutional-section-${section.position}`}
          >
            <span aria-hidden className="font-display text-xl text-gold-deep">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <h2 id={`institutional-section-${section.position}`} className="font-semibold text-forest-950">
                {section.title}
              </h2>
              {section.imageUrl && (
                <AssetImage
                  src={section.imageUrl}
                  alt={section.imageAlt ?? ""}
                  width={640}
                  height={420}
                  className="mt-3 aspect-[3/2] w-full bg-forest-900/5 object-cover"
                  sizes="240px"
                />
              )}
            </div>
            <div className="space-y-3 text-sm text-ink/65">
              {section.body
                .split(/\n\s*\n/)
                .filter(Boolean)
                .map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-10 grid gap-6">
      {sections.map((section, index) => {
        const imageFirst = index % 2 === 1;
        const hasImage = Boolean(section.imageUrl);

        return (
          <section
            key={`${section.position}-${section.title}`}
            className="grid items-start gap-6 border hairline bg-white p-6 md:grid-cols-2 md:p-8"
            aria-labelledby={`institutional-section-${section.position}`}
          >
            {hasImage && (
              <div className={imageFirst ? "md:order-1" : undefined}>
                <AssetImage
                  src={section.imageUrl!}
                  alt={section.imageAlt ?? ""}
                  width={800}
                  height={600}
                  className="aspect-[4/3] w-full bg-forest-900/5 object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            )}
            <div className={hasImage && !imageFirst ? "md:order-2" : undefined}>
              <h2 id={`institutional-section-${section.position}`} className="font-display text-2xl text-forest-950">
                {section.title}
              </h2>
              <div className="mt-3 space-y-4">
                {section.body
                  .split(/\n\s*\n/)
                  .filter(Boolean)
                  .map((paragraph, i) => (
                    <p key={i} className="text-[15px] leading-relaxed text-ink/75">
                      {paragraph}
                    </p>
                  ))}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
