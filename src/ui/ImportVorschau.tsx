import { useSprache } from '../i18n/kontext';
import type { ImportPlan } from '../logic/importGeojson';
import { Blatt } from './Blatt';

interface Props {
  plan: ImportPlan;
  beiBestaetigen: () => void;
  beiAbbrechen: () => void;
}

export function hatNeues(plan: ImportPlan): boolean {
  return plan.grundstueck !== null || plan.baeume.length > 0 || plan.neueSorten.length > 0;
}

export function ImportVorschau({ plan, beiBestaetigen, beiAbbrechen }: Props) {
  const { t } = useSprache();
  const neues = hatNeues(plan);

  return (
    <Blatt
      titel={t('import.titel')}
      beiSchliessen={beiAbbrechen}
      aktionen={
        <>
          <button type="button" class="knopf" onClick={beiAbbrechen}>
            {t('allgemein.abbrechen')}
          </button>
          {neues && (
            <button type="button" class="knopf knopf-primaer" onClick={beiBestaetigen}>
              {t('import.ausfuehren')}
            </button>
          )}
        </>
      }
    >
      <ul class="liste">
        {plan.grundstueck && (
          <li>
            {t(plan.grundstueck.ersetzt ? 'import.grundstueck_ersetzt' : 'import.grundstueck_neu', {
              name: plan.grundstueck.datensatz.name,
            })}
          </li>
        )}
        {plan.baeume.length > 0 && <li>{t('import.baeume', { n: plan.baeume.length })}</li>}
        {plan.neueSorten.length > 0 && <li>{t('import.sorten', { n: plan.neueSorten.length })}</li>}
        {plan.saisonStatus.length > 0 && <li>{t('import.saison', { n: plan.saisonStatus.length })}</li>}
        {!neues && <li>{t('import.nichts_neu')}</li>}
      </ul>

      {plan.uebersprungen.length > 0 && (
        <>
          <h3>{t('import.uebersprungen', { n: plan.uebersprungen.length })}</h3>
          <ul class="liste liste-klein">
            {plan.uebersprungen.map((u) => (
              <li key={u.nr}>
                {u.nummer ?? t('import.eintrag', { nr: u.nr })}: {t(`import.grund.${u.grund}`)}
              </li>
            ))}
          </ul>
        </>
      )}
    </Blatt>
  );
}
