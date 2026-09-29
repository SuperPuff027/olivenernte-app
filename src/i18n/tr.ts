// UNGEPRÜFT – von Claude Code erstellt, muss von Muttersprachlern gegengelesen werden.
import type { Uebersetzung } from './de';

export const tr: Uebersetzung = {
  'app.titel': 'Zeytin Hasadı',

  'allgemein.speichern': 'Kaydet',
  'allgemein.abbrechen': 'İptal',
  'allgemein.loeschen': 'Sil',
  'allgemein.ok': 'Tamam',
  'allgemein.schliessen': 'Kapat',

  'status.nicht_bereit': 'Hazır değil',
  'status.bereit': 'Hazır',
  'status.geerntet': 'Hasat edildi',

  'standort.zeigen': 'Konumum',
  'standort.fehler.verweigert': 'Konum erişimi reddedildi. Lütfen telefon ayarlarından izin verin.',
  'standort.fehler.nicht_verfuegbar': 'Konum alınamıyor. GPS açık mı?',
  'standort.fehler.zeitueberschreitung': 'GPS sinyali yok. Lütfen açık alanda tekrar deneyin.',

  'menue.oeffnen': 'Menü',

  'import.knopf': 'GeoJSON içe aktar',
  'import.titel': 'İçe aktarmayı kontrol et',
  'import.grundstueck_neu': 'Yeni arazi: {name}',
  'import.grundstueck_ersetzt': 'Arazi sınırı değiştirilecek: {name}',
  'import.baeume': 'Yeni ağaçlar: {n}',
  'import.sorten': 'Yeni çeşitler: {n}',
  'import.uebersprungen': 'Atlanan: {n}',
  'import.eintrag': 'Kayıt {nr}',
  'import.grund.unbekannter_typ': 'bilinmeyen tür',
  'import.grund.ungueltige_geometrie': 'geçersiz koordinatlar',
  'import.grund.ohne_nummer': 'ağaç numarası yok',
  'import.grund.nummer_doppelt': 'numara dosyada iki kez var',
  'import.grund.nummer_vorhanden': 'numara zaten mevcut',
  'import.grund.weiteres_grundstueck': 'yalnızca bir arazi alınır',
  'import.nichts_neu': 'İçe aktarılacak yeni bir şey yok.',
  'import.ausfuehren': 'İçe aktar',
  'import.fertig': 'İçe aktarma tamamlandı.',
  'import.fehler.kein_geojson': 'Dosya geçerli bir GeoJSON değil.',
  'import.fehler.leer': 'Dosyada ne arazi ne de ağaç var.',
  'import.fehler.lesen': 'Dosya okunamadı.',
  'import.fehler.speichern': 'İçe aktarma başarısız. Hiçbir şey kaydedilmedi.',
};
