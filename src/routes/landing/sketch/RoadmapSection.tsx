import { useI18n } from '@/lib/i18n';
import { Reveal } from './Reveal';
import { SketchFrame } from './SketchFrame';
import { SketchLayers } from './SketchLayers';

export function RoadmapSection() {
  const { t } = useI18n();
  return (
    <Reveal id="lo-trinh" labelledBy="sk-roadmap-t">
      <div className="sk-wrap sk-two">
        <div>
          <p className="sk-kicker">{t('LANDING.ROADMAP.KICKER')}</p>
          <h2 id="sk-roadmap-t" className="sk-title">
            {t('LANDING.ROADMAP.TITLE')}
          </h2>
          <p className="sk-lead">{t('LANDING.ROADMAP.LEAD')}</p>
          <div className="sk-sticky">
            <strong>{t('LANDING.ROADMAP.STICKY_TITLE')}</strong>
            {t('LANDING.ROADMAP.STICKY_BODY')}
          </div>
        </div>
        <SketchFrame tilt={-0.6}>
          <svg viewBox="0 0 480 330" role="img" aria-labelledby="sk-roadmap-svg-t">
            <title id="sk-roadmap-svg-t">{t('LANDING.ROADMAP.ALT')}</title>
            <SketchLayers id="sk-roadmap">
              <path d="M60 300 C 120 240, 140 230, 240 200 S 380 110, 420 60" strokeDasharray="7 8" opacity="0.6" />
              <circle cx="84" cy="276" r="7" fill="#b4443a" stroke="none" />
              <circle cx="240" cy="200" r="7" fill="#2a2a2e" stroke="none" opacity="0.6" />
              <circle cx="404" cy="80" r="7" fill="#2a2a2e" stroke="none" opacity="0.6" />
              <rect x="300" y="110" width="80" height="54" rx="6" fill="url(#sk-hatch-blue)" stroke="#2f5d8a" strokeWidth="2" />
            </SketchLayers>
            <g filter="url(#sk-rough-a)" transform="scale(0.8)">
              <use href="#sk-person" x="110" y="250" />
              <use href="#sk-person" x="260" y="160" />
              <use href="#sk-person" x="300" y="160" />
              <use href="#sk-person" x="340" y="160" />
              <use href="#sk-person" x="350" y="150" />
              <use href="#sk-person" x="500" y="150" />
            </g>
            <g filter="url(#sk-rough-text)">
              <text className="sk-hw sk-t-red" x="20" y="252" fontSize="20">
                {t('LANDING.ROADMAP.STAGE_1')}
              </text>
              <text className="sk-hw sk-t-soft" x="20" y="322" fontSize="15">
                {t('LANDING.ROADMAP.STAGE_1_SUB')}
              </text>
              <text className="sk-hw" x="150" y="238" fontSize="20">
                {t('LANDING.ROADMAP.STAGE_2')}
              </text>
              <text className="sk-hw sk-t-soft" x="150" y="258" fontSize="15">
                {t('LANDING.ROADMAP.STAGE_2_SUB')}
              </text>
              <text className="sk-hw" x="300" y="96" fontSize="20">
                {t('LANDING.ROADMAP.STAGE_3')}
              </text>
              <text className="sk-hw sk-t-soft" x="300" y="190" fontSize="15">
                {t('LANDING.ROADMAP.STAGE_3_SUB')}
              </text>
            </g>
          </svg>
        </SketchFrame>
      </div>
    </Reveal>
  );
}
