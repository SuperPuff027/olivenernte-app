import { useSprache } from './i18n/kontext';

export function App() {
  const { t } = useSprache();
  return <main>{t('app.titel')}</main>;
}
