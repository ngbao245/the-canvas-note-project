import { useI18n, type MessageKey } from '@/lib/i18n';
import { Reveal } from './Reveal';
import { SketchFrame } from './SketchFrame';
import { SketchLayers } from './SketchLayers';

const ITEMS: readonly MessageKey[] = [
  'LANDING.PROBLEM.ITEM_1',
  'LANDING.PROBLEM.ITEM_2',
  'LANDING.PROBLEM.ITEM_3',
];

export function ProblemSection() {
  const { t } = useI18n();
  return (
    <Reveal id="van-de" labelledBy="sk-problem-t">
      <div className="sk-wrap sk-two">
        <div>
          <p className="sk-kicker">{t('LANDING.PROBLEM.KICKER')}</p>
          <h2 id="sk-problem-t" className="sk-title">
            {t('LANDING.PROBLEM.TITLE_A')} <span className="sk-mark">{t('LANDING.PROBLEM.TITLE_MARK')}</span>{' '}
            {t('LANDING.PROBLEM.TITLE_B')}
          </h2>
          <p className="sk-lead">{t('LANDING.PROBLEM.LEAD')}</p>
          <ul className="sk-cross-list">
            {ITEMS.map((key) => (
              <li key={key}>
                <svg viewBox="0 0 26 26" aria-hidden="true">
                  <path
                    d="M5 5 L21 21 M21 5 L5 21"
                    fill="none"
                    stroke="#b4443a"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    filter="url(#sk-rough-a)"
                  />
                </svg>
                {t(key)}
              </li>
            ))}
          </ul>
        </div>
        <SketchFrame tilt={-1.2}>
          <svg viewBox="0 0 480 320" role="img" aria-labelledby="sk-problem-svg-t">
            <title id="sk-problem-svg-t">{t('LANDING.PROBLEM.ILLU_ALT')}</title>
            <SketchLayers id="sk-problem">
              <path d="M40 40 h60 l16 16 v70 h-76 z" fill="#fffdf7" transform="rotate(-8 78 83)" />
              <path d="M330 30 h70 l14 14 v60 h-84 z" fill="#fffdf7" transform="rotate(10 372 74)" />
              <rect x="360" y="190" width="90" height="70" rx="3" fill="#fffdf7" transform="rotate(-6 405 225)" />
              <path d="M372 210 h60 M372 226 h48 M372 242 h56" strokeWidth="1.1" transform="rotate(-6 405 225)" />
              <rect x="30" y="200" width="110" height="80" rx="4" fill="url(#sk-hatch)" transform="rotate(5 85 240)" />
              <rect x="180" y="40" width="80" height="50" rx="3" fill="#f7e58a" stroke="none" transform="rotate(-4 220 65)" />
              <path
                d="M150 140 Q 120 120 106 96 M330 140 Q 360 120 370 104 M200 230 Q 160 240 140 240 M290 230 Q 330 236 360 226"
                strokeDasharray="4 7"
                opacity="0.6"
              />
            </SketchLayers>
            <use href="#sk-person" x="240" y="150" filter="url(#sk-rough-a)" />
            <g filter="url(#sk-rough-text)">
              <text className="sk-hw sk-t-red" x="196" y="132" fontSize="34">?</text>
              <text className="sk-hw sk-t-red" x="270" y="124" fontSize="26">?</text>
              <text className="sk-hw sk-t-red" x="290" y="168" fontSize="30">?</text>
              <text className="sk-hw" x="192" y="70" fontSize="15">
                {t('LANDING.PROBLEM.ILLU_QUESTION')}
              </text>
              <text className="sk-hw sk-t-soft" x="56" y="102" fontSize="14">hop-dong.pdf</text>
              <text className="sk-hw sk-t-soft" x="340" y="84" fontSize="14">anh-chup.png</text>
            </g>
          </svg>
        </SketchFrame>
      </div>
    </Reveal>
  );
}
