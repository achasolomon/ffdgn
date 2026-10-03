export type HeroSlide = { src: string; alt: string };

export const DEFAULT_HERO_SLIDES: HeroSlide[] = [
  { src: "/assets/hero/fdg.jpg", alt: "Forum leaders at a national engagement" },
  { src: "/assets/hero/fdg2.jpg", alt: "Forum members in session" },
  { src: "/assets/hero/national.jpg", alt: "National institutional setting" },
];

export function heroSlides(settings: Record<string, string>): HeroSlide[] {
  return DEFAULT_HERO_SLIDES.map((slide, index) => ({
    src: settings[`hero.image_${index + 1}`] ?? slide.src,
    alt: settings[`hero.image_${index + 1}_alt`]?.trim() || slide.alt,
  })).filter((slide) => slide.src.trim());
}
