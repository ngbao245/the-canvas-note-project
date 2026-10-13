import { useI18n } from '@/lib/i18n';
import { APP_CANVAS_URL } from './app-url';
import { DemoFrame } from './DemoFrame';
import { SketchDefs } from './sketch/SketchDefs';
import { ProblemSection } from './sketch/ProblemSection';
import { PillarsSection } from './sketch/PillarsSection';
import { FeaturesSection } from './sketch/FeaturesSection';
import { StepsSection } from './sketch/StepsSection';
import { RoadmapSection } from './sketch/RoadmapSection';
import { FinalSection } from './sketch/FinalSection';
import './sketch/sketch.css';

/**
 * Landing (spec canvas-landing-demo): phần đầu + khung canvas thử, bên dưới là phần
 * ký họa giới thiệu sản phẩm. Giấy ký họa dùng màu cứng (ngoại lệ trong coding-style),
 * khung canvas thử bên trong theo theme của app.
 */
export default function LandingPage() {
  const { t } = useI18n();
  return (
    <div className="sk-root">
      <SketchDefs />
      <nav className="sk-nav" aria-label={t('LANDING.NAV.LABEL')}>
        <div className="sk-nav-bar">
          <a className="sk-logo" href="#thu">
            bibo<span>.</span>
          </a>
          <a className="sk-nav-link" href="#van-de">
            {t('LANDING.NAV.PROBLEM')}
          </a>
          <a className="sk-nav-link" href="#tinh-nang">
            {t('LANDING.NAV.FEATURES')}
          </a>
          <a className="sk-nav-link" href="#cach-dung">
            {t('LANDING.NAV.HOW')}
          </a>
          <a className="sk-nav-link" href="#lo-trinh">
            {t('LANDING.NAV.ROADMAP')}
          </a>
          <a className="sk-btn sk-primary" href={APP_CANVAS_URL}>
            {t('LANDING.NAV.OPEN')}
          </a>
        </div>
      </nav>

      <main>
        <section id="thu" className="sk-wrap sk-hero" aria-labelledby="sk-hero-t">
          <h1 id="sk-hero-t">
            {t('LANDING.HERO.TITLE_1')} {t('LANDING.HERO.TITLE_2')}{' '}
            <span className="sk-mark">{t('LANDING.HERO.TITLE_3')}</span>
          </h1>
          <svg className="sk-scrawl" viewBox="0 0 260 22" aria-hidden="true">
            <path
              d="M4 14 C 60 4, 120 20, 180 10 S 240 8, 256 12"
              fill="none"
              stroke="#b4443a"
              strokeWidth="3"
              strokeLinecap="round"
              filter="url(#sk-rough-a)"
            />
          </svg>
          <p className="sk-hero-lead">{t('LANDING.HERO.LEAD')}</p>
          <div className="sk-cta">
            <a className="sk-btn" href="#tinh-nang">
              {t('LANDING.HERO.CTA_FEATURES')}
            </a>
          </div>
          <DemoFrame />
          <p className="sk-hero-note">{t('LANDING.HERO.NOTE')}</p>
        </section>

        <ProblemSection />
        <PillarsSection />
        <FeaturesSection />
        <StepsSection />
        <RoadmapSection />
        <FinalSection />
      </main>

      <footer className="sk-footer">
        <div className="sk-wrap">
          <span>{t('LANDING.FOOTER.NAME')}</span>
          <span>{t('LANDING.FOOTER.DRAWN')}</span>
        </div>
      </footer>
    </div>
  );
}
