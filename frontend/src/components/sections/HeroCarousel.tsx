import { useCallback, useEffect, useState } from 'react'
import { HERO_SLIDES, type HeroSlide } from '../../constants/hero'

const AUTO_PLAY_MS = 7000

function SlideButton({
  label,
  href,
  variant,
}: HeroSlide['buttons'][number]) {
  const base =
    'inline-flex items-center justify-center rounded px-5 py-2.5 text-sm font-semibold transition-colors duration-200'

  if (variant === 'primary') {
    return (
      <a
        href={href}
        className={`${base} bg-health-green text-white shadow-sm hover:bg-[#0d6b45]`}
      >
        {label}
      </a>
    )
  }

  return (
    <a
      href={href}
      className={`${base} border border-white/70 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20`}
    >
      {label}
    </a>
  )
}

export function HeroCarousel() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  const goTo = useCallback((index: number) => {
    setActiveIndex((index + HERO_SLIDES.length) % HERO_SLIDES.length)
  }, [])

  useEffect(() => {
    if (isPaused) return

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % HERO_SLIDES.length)
    }, AUTO_PLAY_MS)

    return () => window.clearInterval(timer)
  }, [isPaused])

  return (
    <section
      className="relative isolate min-h-[420px] overflow-hidden sm:min-h-[480px] lg:min-h-[540px]"
      aria-roledescription="carousel"
      aria-label="Présentation de l'ORHS Bénin"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
    >
      {HERO_SLIDES.map((slide, index) => {
        const isActive = index === activeIndex

        return (
          <article
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              isActive ? 'z-10 opacity-100' : 'z-0 opacity-0'
            }`}
            aria-hidden={!isActive}
            aria-roledescription="slide"
            aria-label={`${index + 1} sur ${HERO_SLIDES.length}`}
          >
            <img
              src={slide.image}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover object-center"
              loading={index === 0 ? 'eager' : 'lazy'}
            />

            <div className="absolute inset-0 bg-gradient-to-r from-institutional-blue/90 via-institutional-blue/75 to-institutional-blue/55" />
            <div className="absolute inset-0 bg-black/25" />

            <div className="relative z-10 mx-auto flex h-full max-w-7xl items-center px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
              <div className="max-w-2xl">
                {slide.eyebrow && (
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-gold-accent sm:text-sm">
                    {slide.eyebrow}
                  </p>
                )}
                <h1 className="text-2xl font-semibold leading-tight text-white sm:text-3xl lg:text-4xl xl:text-5xl">
                  {slide.title}
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/90 sm:mt-6 sm:text-base lg:text-lg">
                  {slide.description}
                </p>
                <div className="mt-6 flex flex-wrap gap-3 sm:mt-8">
                  {slide.buttons.map((button) => (
                    <SlideButton key={button.label} {...button} />
                  ))}
                </div>
              </div>
            </div>
          </article>
        )
      })}

      <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 gap-2 sm:bottom-6">
        {HERO_SLIDES.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            onClick={() => goTo(index)}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === activeIndex
                ? 'w-8 bg-gold-accent'
                : 'w-2 bg-white/50 hover:bg-white/80'
            }`}
            aria-label={`Aller à la diapositive ${index + 1}`}
            aria-current={index === activeIndex}
          />
        ))}
      </div>
    </section>
  )
}
