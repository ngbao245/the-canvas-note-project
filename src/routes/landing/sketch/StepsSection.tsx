import { useI18n, type MessageKey } from '@/lib/i18n';
import { Reveal } from './Reveal';

const STEPS: readonly { title: MessageKey; body: MessageKey }[] = [
  { title: 'LANDING.STEPS.S1_TITLE', body: 'LANDING.STEPS.S1_BODY' },
  { title: 'LANDING.STEPS.S2_TITLE', body: 'LANDING.STEPS.S2_BODY' },
  { title: 'LANDING.STEPS.S3_TITLE', body: 'LANDING.STEPS.S3_BODY' },
];

export function StepsSection() {
  const { t, formatNumber } = useI18n();
  return (
    <Reveal id="cach-dung" labelledBy="sk-steps-t">
      <div className="sk-wrap">
        <p className="sk-kicker">{t('LANDING.STEPS.KICKER')}</p>
        <h2 id="sk-steps-t" className="sk-title">
          {t('LANDING.STEPS.TITLE')}
        </h2>
        <p className="sk-lead">{t('LANDING.STEPS.LEAD')}</p>
        <ol className="sk-steps m-0 list-none p-0">
          {STEPS.map((step, i) => (
            <li key={step.title} className="sk-step">
              <span className="sk-step-num">
                <svg viewBox="0 0 56 56" aria-hidden="true">
                  <circle cx="28" cy="28" r="23" fill="none" stroke="#b4443a" strokeWidth="2" filter="url(#sk-rough-b)" />
                </svg>
                {formatNumber(i + 1)}
              </span>
              <h3>{t(step.title)}</h3>
              <p>{t(step.body)}</p>
            </li>
          ))}
        </ol>
      </div>
    </Reveal>
  );
}
