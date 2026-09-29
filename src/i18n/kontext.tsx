import { createContext, type ComponentChildren } from 'preact';
import { useContext, useEffect, useMemo } from 'preact/hooks';
import type { Sprache } from '../logic/sprache';
import { erstelleUebersetzer, type Uebersetzer } from './index';

interface SprachKontext {
  sprache: Sprache;
  t: Uebersetzer;
}

const Kontext = createContext<SprachKontext | null>(null);

export function SprachAnbieter(props: { sprache: Sprache; children: ComponentChildren }) {
  const { sprache } = props;
  const wert = useMemo(() => ({ sprache, t: erstelleUebersetzer(sprache) }), [sprache]);

  useEffect(() => {
    document.documentElement.lang = sprache;
  }, [sprache]);

  return <Kontext.Provider value={wert}>{props.children}</Kontext.Provider>;
}

export function useSprache(): SprachKontext {
  const wert = useContext(Kontext);
  if (!wert) throw new Error('useSprache außerhalb von SprachAnbieter');
  return wert;
}
