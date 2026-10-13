import { useI18n } from '@/lib/i18n';
import { Reveal } from './Reveal';

export function PillarsSection() {
  const { t } = useI18n();
  return (
    <Reveal labelledBy="sk-pillars-t">
      <div className="sk-wrap">
        <p className="sk-kicker">{t('LANDING.PILLARS.KICKER')}</p>
        <h2 id="sk-pillars-t" className="sk-title">
          {t('LANDING.PILLARS.TITLE')}
        </h2>
        <p className="sk-lead">{t('LANDING.PILLARS.LEAD')}</p>
        <div className="sk-pillars">
          <article className="sk-card">
            <svg viewBox="0 0 72 56" aria-hidden="true">
              <g fill="none" stroke="#2a2a2e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" filter="url(#sk-rough-a)">
                <path d="M10 6 h26 l10 10 v34 h-36 z" fill="#fffdf7" />
                <path d="M36 6 v10 h10" />
                <rect x="40" y="18" width="26" height="22" rx="2" fill="#fffdf7" />
                <path d="M40 38 L48 29 L54 34 L58 30 L66 38" />
              </g>
            </svg>
            <h3>{t('LANDING.PILLARS.SOURCE_TITLE')}</h3>
            <p>{t('LANDING.PILLARS.SOURCE_BODY')}</p>
          </article>
          <article className="sk-card">
            <svg viewBox="0 0 72 56" aria-hidden="true">
              <g fill="none" stroke="#2a2a2e" strokeWidth="1.8" strokeLinecap="round" filter="url(#sk-rough-a)">
                <rect x="10" y="8" width="52" height="40" rx="3" fill="#fffdf7" />
                <path d="M10 9 H62" stroke="#2f5d8a" strokeWidth="3" />
                <path d="M18 22 H50 M18 31 H44 M18 40 H36" />
              </g>
            </svg>
            <h3>{t('LANDING.PILLARS.NOTE_TITLE')}</h3>
            <p>{t('LANDING.PILLARS.NOTE_BODY')}</p>
          </article>
          <article className="sk-card">
            <svg viewBox="0 0 72 56" aria-hidden="true">
              <g fill="none" stroke="#2a2a2e" strokeWidth="1.8" strokeLinecap="round" filter="url(#sk-rough-a)">
                <rect x="4" y="4" width="64" height="48" rx="4" fill="url(#sk-dots)" />
                <rect x="10" y="12" width="20" height="14" rx="2" fill="#fffdf7" />
                <rect x="42" y="30" width="20" height="14" rx="2" fill="#fffdf7" />
                <path d="M30 19 C 40 19, 36 37, 42 37" stroke="#2f5d8a" />
              </g>
            </svg>
            <h3>{t('LANDING.PILLARS.CANVAS_TITLE')}</h3>
            <p>{t('LANDING.PILLARS.CANVAS_BODY')}</p>
          </article>
        </div>
      </div>
    </Reveal>
  );
}
