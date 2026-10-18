// Calendar conventions. Put a #tag anywhere in an event title, e.g. "Svømning #svømning".
// Tags are removed from the title shown on the wall. Edit this file to add or rename tags.

// Kids' "Today" pictures: tag → emoji + Danish label (the 5-year-old reads the picture).
export const KID_TAGS = {
  børnehave: { emoji: '🏫', label: 'Børnehave' },
  vuggestue: { emoji: '🧸', label: 'Vuggestue' },
  svømning: { emoji: '🏊', label: 'Svømning' },
  mormor: { emoji: '👵', label: 'Mormor' },
  morfar: { emoji: '👴', label: 'Morfar' },
  farmor: { emoji: '👵', label: 'Farmor' },
  farfar: { emoji: '👴', label: 'Farfar' },
  bedsteforældre: { emoji: '👵', label: 'Bedsteforældre' },
  fødselsdag: { emoji: '🎂', label: 'Fødselsdag' },
  legeaftale: { emoji: '🧒', label: 'Legeaftale' },
  gymnastik: { emoji: '🤸', label: 'Gymnastik' },
  fodbold: { emoji: '⚽', label: 'Fodbold' },
  læge: { emoji: '🩺', label: 'Læge' },
  tandlæge: { emoji: '🦷', label: 'Tandlæge' },
  frisør: { emoji: '💇', label: 'Frisør' },
  tur: { emoji: '🚌', label: 'Tur' },
  ferie: { emoji: '🏖️', label: 'Ferie' },
  fri: { emoji: '🏠', label: 'Hjemme' },
  syg: { emoji: '🤒', label: 'Syg' },
};
export const WEEKEND = { emoji: '🏠', label: 'Weekend' };

// A day with any of these tags has no børnehave/vuggestue for the kids it concerns.
export const NO_INSTITUTION = ['fri', 'ferie', 'syg', 'lukket'];

// Drop-off and pick-up at Pilegården: a tag, or a title starting with these words,
// plus the adult's name, e.g. "Aflevering Stian" or "Hentning #ulrika".
export const DROPOFF = /^(aflever|#aflevering)/i;
export const PICKUP = /^(hent|#hentning)/i;

// Birthdays and family events for widget 7.
export const BIRTHDAY = /#fødselsdag|fødselsdag|birthday|🎂/i;
export const FAMILY_EVENT_TAG = 'familie';

// "Everyone": these tags or words put an event on all four people.
export const EVERYONE = ['familie', 'alle'];

const TAG = /#([\p{L}\d_-]+)/gu;
export function splitTags(title = '') {
  const tags = [...title.matchAll(TAG)].map((m) => m[1].toLowerCase());
  const clean = title.replace(TAG, '').replace(/\s{2,}/g, ' ').trim();
  return { title: clean || title.trim(), tags };
}
