import type { ReactNode } from 'react';
import { useI18n, type MessageKey } from '@/lib/i18n';
import { Reveal } from './Reveal';
import { SketchFrame } from './SketchFrame';
import { SketchLayers } from './SketchLayers';

/** 3 cụm tính năng. Cụm Canvas không có hình: trỏ lên khung thử ở đầu trang. */
export function FeaturesSection() {
  const { t } = useI18n();
  return (
    <Reveal id="tinh-nang" labelledBy="sk-features-t">
      <div className="sk-wrap">
        <p className="sk-kicker">{t('LANDING.FEATURES.KICKER')}</p>
        <h2 id="sk-features-t" className="sk-title" style={{ marginBottom: 48 }}>
          {t('LANDING.FEATURES.TITLE')}
        </h2>

        <Feature
          tag="LANDING.FEATURES.PROV_TAG"
          titleA="LANDING.FEATURES.PROV_TITLE_A"
          titleMark="LANDING.FEATURES.PROV_TITLE_MARK"
          body="LANDING.FEATURES.PROV_BODY"
          points={['LANDING.FEATURES.PROV_1', 'LANDING.FEATURES.PROV_2', 'LANDING.FEATURES.PROV_3']}
        >
          <SketchFrame tilt={0.8}>
            <ProvenanceSketch />
          </SketchFrame>
        </Feature>

        <Feature
          flip
          tag="LANDING.FEATURES.CANVAS_TAG"
          titleA="LANDING.FEATURES.CANVAS_TITLE_A"
          titleMark="LANDING.FEATURES.CANVAS_TITLE_MARK"
          body="LANDING.FEATURES.CANVAS_BODY"
          points={['LANDING.FEATURES.CANVAS_1', 'LANDING.FEATURES.CANVAS_2', 'LANDING.FEATURES.CANVAS_3']}
        >
          <div className="sk-sticky" style={{ margin: '0 auto' }}>
            <strong>{t('LANDING.FEATURES.CANVAS_POINTER_TITLE')}</strong>
            {t('LANDING.FEATURES.CANVAS_POINTER_BODY')}{' '}
            <a href="#thu">{t('LANDING.FEATURES.CANVAS_POINTER_LINK')}</a>
          </div>
        </Feature>

        <Feature
          tag="LANDING.FEATURES.AI_TAG"
          titleA="LANDING.FEATURES.AI_TITLE_A"
          titleMark="LANDING.FEATURES.AI_TITLE_MARK"
          body="LANDING.FEATURES.AI_BODY"
          points={['LANDING.FEATURES.AI_1', 'LANDING.FEATURES.AI_2', 'LANDING.FEATURES.AI_3']}
        >
          <SketchFrame tilt={0.6}>
            <AiSketch />
          </SketchFrame>
        </Feature>
      </div>
    </Reveal>
  );
}

interface FeatureProps {
  flip?: boolean;
  tag: MessageKey;
  titleA: MessageKey;
  titleMark: MessageKey;
  body: MessageKey;
  points: readonly MessageKey[];
  children: ReactNode;
}

function Feature({ flip, tag, titleA, titleMark, body, points, children }: FeatureProps) {
  const { t } = useI18n();
  return (
    <div className={`sk-feature ${flip ? 'sk-flip' : ''}`}>
      <div className="sk-feature-text">
        <span className="sk-tag">{t(tag)}</span>
        <h3>
          {t(titleA)} <span className="sk-mark">{t(titleMark)}</span>
        </h3>
        <p>{t(body)}</p>
        <ul className="sk-check-list">
          {points.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ul>
      </div>
      {children}
    </div>
  );
}

function ProvenanceSketch() {
  const { t } = useI18n();
  return (
    <svg viewBox="0 0 560 320" role="img" aria-labelledby="sk-prov-t">
      <title id="sk-prov-t">{t('LANDING.FEATURES.PROV_ALT')}</title>
      <SketchLayers id="sk-prov">
        <path d="M24 30 h120 l26 26 v220 h-146 z" fill="#fffdf7" />
        <path d="M144 30 v26 h26" />
        <path d="M40 80 H150 M40 96 H136" strokeWidth="1.1" opacity="0.7" />
        <rect x="40" y="130" width="114" height="72" />
        <rect x="78" y="154" width="38" height="24" fill="rgba(245,205,70,0.55)" stroke="none" />
        <path d="M78 130 V202 M116 130 V202 M40 154 H154 M40 178 H154" strokeWidth="1.2" />
        <path d="M262 160 C 200 160, 190 166, 128 166" stroke="#2f5d8a" strokeWidth="2.2" />
        <path d="M138 160 L128 166 L138 172" stroke="#2f5d8a" strokeWidth="2.2" />
        <rect x="262" y="96" width="150" height="110" rx="6" fill="#fffdf7" />
        <rect x="262" y="96" width="150" height="5" fill="#2f5d8a" stroke="none" opacity="0.6" />
        <rect x="274" y="168" width="110" height="22" rx="11" stroke="#2f5d8a" />
        <path d="M412 150 Q 426 140 432 140" strokeDasharray="4 5" />
        <rect x="432" y="40" width="112" height="240" rx="8" fill="#fffdf7" />
        <path d="M432 74 H544" />
        <rect x="444" y="176" width="88" height="10" rx="3" />
        <rect x="444" y="176" width="70" height="10" rx="3" fill="url(#sk-hatch-blue)" stroke="none" />
        <rect x="444" y="236" width="88" height="28" rx="6" fill="url(#sk-hatch)" />
      </SketchLayers>
      <ellipse cx="97" cy="166" rx="30" ry="20" fill="none" stroke="#b4443a" strokeWidth="1.8" filter="url(#sk-rough-a)" />
      <g filter="url(#sk-rough-text)">
        <text className="sk-hw" x="40" y="62" fontSize="16">Q3</text>
        <text className="sk-hw sk-t-soft" x="24" y="300" fontSize="15">
          {t('LANDING.DEMO.SOURCE_LOCATION', { page: 12, table: 3 })}
        </text>
        <text className="sk-hw sk-t-blue" x="176" y="150" fontSize="16">
          {t('LANDING.SKETCH.CITED_FROM')}
        </text>
        <text className="sk-hw" x="274" y="132" fontSize="19">Q3 +18%</text>
        <text className="sk-hw sk-t-blue" x="282" y="184" fontSize="13">
          {t('LANDING.DEMO.SOURCE_LOCATION', { page: 12, table: 3 })}
        </text>
        <text className="sk-hw" x="444" y="64" fontSize="18">Inspector</text>
        <text className="sk-hw" x="444" y="100" fontSize="14">bao-cao-q3.pdf</text>
        <text className="sk-hw" x="444" y="126" fontSize="14">
          {t('LANDING.SKETCH.PAGE', { page: 12 })}
        </text>
        <text className="sk-hw" x="444" y="150" fontSize="14">
          {t('LANDING.SKETCH.TABLE', { table: 3 })}
        </text>
        <text className="sk-hw" x="444" y="170" fontSize="14">
          {t('LANDING.SKETCH.CONFIDENCE')}
        </text>
        <text className="sk-hw" x="444" y="216" fontSize="14">
          {t('LANDING.SKETCH.RELATIONS', { count: 2 })}
        </text>
        <text className="sk-hw" x="452" y="256" fontSize="15">
          {t('LANDING.DEMO.OPEN_SOURCE')}
        </text>
      </g>
    </svg>
  );
}

function AiSketch() {
  const { t } = useI18n();
  return (
    <svg viewBox="0 0 560 320" role="img" aria-labelledby="sk-ai-t">
      <title id="sk-ai-t">{t('LANDING.FEATURES.AI_ALT')}</title>
      <SketchLayers id="sk-ai">
        <rect x="40" y="70" width="170" height="120" rx="5" fill="#fffdf7" />
        <path d="M40 104 H210 M40 132 H210 M40 160 H210 M97 84 V190 M154 84 V190" strokeWidth="1.2" />
        <rect x="350" y="70" width="170" height="120" rx="5" fill="#fffdf7" />
        <rect x="464" y="132" width="56" height="28" fill="rgba(245,205,70,0.55)" stroke="none" />
        <path d="M350 104 H520 M350 132 H520 M350 160 H520 M407 84 V190 M464 84 V190" strokeWidth="1.2" />
        <path d="M210 130 C 260 130, 300 130, 350 130" stroke="#2f5d8a" strokeWidth="2" strokeDasharray="7 6" />
        <path d="M340 124 L350 130 L340 136" stroke="#2f5d8a" strokeWidth="2" />
        <path
          d="M280 218 l0 -16 M280 250 l0 16 M264 234 l-16 0 M296 234 l16 0 M269 223 l-9 -9 M291 245 l9 9 M291 223 l9 -9 M269 245 l-9 9"
          stroke="#2f5d8a"
          strokeWidth="2"
        />
        <circle cx="280" cy="234" r="9" fill="url(#sk-hatch-blue)" stroke="#2f5d8a" />
      </SketchLayers>
      <ellipse cx="492" cy="146" rx="38" ry="22" fill="none" stroke="#b4443a" strokeWidth="1.8" filter="url(#sk-rough-a)" />
      <g filter="url(#sk-rough-text)">
        <text className="sk-hw" x="40" y="58" fontSize="19">Q2</text>
        <text className="sk-hw" x="350" y="58" fontSize="19">Q3</text>
        <text className="sk-hw sk-t-blue" x="280" y="118" fontSize="17" textAnchor="middle">
          {t('LANDING.SKETCH.COMPARE')}
        </text>
        <text className="sk-hw sk-t-red" x="460" y="226" fontSize="17">
          {t('LANDING.SKETCH.CHANGE')}
        </text>
        <text className="sk-hw sk-t-soft" x="280" y="296" fontSize="16" textAnchor="middle">
          {t('LANDING.SKETCH.AI_HINT')}
        </text>
      </g>
    </svg>
  );
}
