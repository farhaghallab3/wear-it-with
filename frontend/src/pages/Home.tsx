import { Link, useNavigate } from 'react-router-dom'
import { GarmentArt } from '../components/GarmentArt'
import { Arrow } from '../components/ui'
import { t } from '../i18n/en'
import { useStore } from '../lib/store'

export function Home() {
  const { loadDemo } = useStore()
  const navigate = useNavigate()

  return (
    <div className="space-y-24 sm:space-y-32">
      <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <div>
          <p className="eyebrow mb-5">{t.home.eyebrow}</p>
          <h1 className="text-5xl leading-[0.98] sm:text-7xl">
            {t.home.title} <em className="text-plum">{t.home.titleEm}</em>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">{t.home.body}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <button
              className="btn-primary"
              onClick={() => {
                loadDemo()
                navigate('/looks')
              }}
            >
              {t.home.ctaDemo} <Arrow />
            </button>
            <Link to="/closet" className="btn-ghost">{t.home.ctaOwn}</Link>
          </div>
        </div>

        <HeroCollage />
      </section>

      <section aria-labelledby="how">
        <h2 id="how" className="mb-10 text-4xl sm:text-5xl">{t.home.stepsTitle}</h2>
        <ol className="grid gap-px overflow-hidden rounded-3xl bg-line sm:grid-cols-2 lg:grid-cols-4">
          {t.home.steps.map((step, i) => (
            <li key={step.title} className="bg-paper p-7">
              <span className="font-display text-5xl italic text-plum/70">0{i + 1}</span>
              <h3 className="mt-4 text-xl">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}

function HeroCollage() {
  return (
    <div className="relative mx-auto aspect-[4/5] w-full max-w-md" aria-hidden="true">
      <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-blush via-ivory to-sand" />
      <div className="absolute start-[8%] top-[7%] w-[58%] -rotate-3 rounded-3xl bg-paper p-5 shadow-xl shadow-ink/10">
        <GarmentArt kind="blazer" color="camel" className="w-full" />
        <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-plum">Considering · $89</p>
      </div>
      <div className="absolute end-[7%] top-[16%] w-[34%] rotate-3 rounded-2xl bg-paper p-3 shadow-lg shadow-ink/10">
        <GarmentArt kind="tee" color="white" className="w-full" />
      </div>
      <div className="absolute bottom-[8%] end-[10%] w-[36%] -rotate-2 rounded-2xl bg-paper p-3 shadow-lg shadow-ink/10">
        <GarmentArt kind="jeans" color="denim" className="w-full" />
      </div>
      <div className="absolute bottom-[10%] start-[10%] rounded-2xl bg-ink px-4 py-3 text-paper shadow-lg">
        <p className="font-display text-2xl italic">Works with</p>
        <p className="text-xs opacity-75">what you already own?</p>
      </div>
    </div>
  )
}
