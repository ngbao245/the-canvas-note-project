import { useI18n } from '@/lib/i18n';
import { SketchLayers } from './SketchLayers';

/** Hình vẽ tĩnh của board mẫu, thay canvas thử trên màn hình hẹp. */
export function DemoStaticSketch() {
  const { t } = useI18n();
  return (
    <svg viewBox="0 0 600 440" role="img" aria-labelledby="sk-static-t">
      <title id="sk-static-t">{t('LANDING.DEMO.STATIC_ALT')}</title>
      <rect x="14" y="14" width="572" height="412" fill="url(#sk-dots)" />
      <SketchLayers id="sk-static">
        <rect x="12" y="12" width="576" height="416" rx="10" />
        <path d="M50 60 h100 l24 24 v140 h-124 z" fill="#fffdf7" />
        <path d="M150 60 v24 h24" />
        <path d="M66 104 H158 M66 118 H146 M66 132 H156" strokeWidth="1.1" opacity="0.7" />
        <rect x="66" y="148" width="92" height="56" />
        <rect x="96.6" y="166.6" width="30.6" height="18.6" fill="rgba(245,205,70,0.55)" stroke="none" />
        <path d="M96.6 148 V204 M127.3 148 V204 M66 166.6 H158 M66 185.3 H158" strokeWidth="1.1" />
        <path d="M174 176 C 220 176, 220 120, 262 120" stroke="#2f5d8a" strokeWidth="2" />
        <path d="M253 114 L262 120 L253 126" stroke="#2f5d8a" strokeWidth="2" />
        <path d="M330 250 C 330 290, 380 300, 400 312" strokeDasharray="6 6" />
      </SketchLayers>
      <g filter="url(#sk-rough-a)">
        <use href="#sk-mini-note" transform="translate(264 80) scale(1.25)" />
        <use href="#sk-mini-note" transform="translate(268 200) scale(1.05) rotate(-2)" />
        <use href="#sk-mini-note" transform="translate(404 290) scale(1.2) rotate(1.5)" />
        <rect x="396" y="282" width="160" height="112" rx="9" fill="none" stroke="#2f5d8a" strokeWidth="2.4" />
      </g>
      <g filter="url(#sk-rough-text)">
        <text className="sk-hw sk-t-soft" x="50" y="48" fontSize="16">
          bao-cao-q3.pdf
        </text>
        <text className="sk-hw sk-t-blue" x="190" y="148" fontSize="15">
          {t('LANDING.SKETCH.CITED_FROM')}
        </text>
        <text className="sk-hw sk-t-red" x="420" y="60" fontSize="20">
          {t('LANDING.SKETCH.ALL_IN_ONE')}
        </text>
      </g>
    </svg>
  );
}
