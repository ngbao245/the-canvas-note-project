import { useI18n } from '@/lib/i18n';
import { APP_CANVAS_URL } from '../app-url';
import { Reveal } from './Reveal';

export function FinalSection() {
  const { t } = useI18n();
  return (
    <Reveal className="sk-final" labelledBy="sk-final-t">
      <div className="sk-wrap">
        <div className="sk-final-box">
          <h2 id="sk-final-t">
            {t('LANDING.FINAL.TITLE_A')}
            <br />
            <span className="sk-mark">{t('LANDING.FINAL.TITLE_MARK')}</span>
          </h2>
          <p>{t('LANDING.FINAL.BODY')}</p>
          <div className="sk-cta">
            <a className="sk-btn sk-primary" href="#thu">
              {t('LANDING.FINAL.CTA_TRY')}
            </a>
            <a className="sk-btn" href={APP_CANVAS_URL}>
              {t('LANDING.HERO.OPEN_FULL')}
            </a>
          </div>
        </div>
      </div>
    </Reveal>
  );
}
