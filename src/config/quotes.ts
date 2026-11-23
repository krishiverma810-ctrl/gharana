// Daily quotes. Lines for fictional characters are ORIGINAL lines written "in the spirit of"
// each character (not copied dialogue). Kabir's dohas are 15th-century and public domain —
// the romanised Hindi is his, the English is a fresh rendering.
// Add your own in Settings (Phase 4 editor) — they'll mix into the rotation.

export interface Quote {
  text: string
  by: string
  spirit?: boolean // true = written in the spirit of the character
  original?: string
}

const harvey = (text: string): Quote => ({ text, by: 'Harvey Specter', spirit: true })
const mike = (text: string): Quote => ({ text, by: 'Mike Ross', spirit: true })
const bat = (text: string): Quote => ({ text, by: 'Batman', spirit: true })
const alfred = (text: string): Quote => ({ text, by: 'Alfred', spirit: true })
const wing = (text: string): Quote => ({ text, by: 'Nightwing', spirit: true })

export const QUOTES: Quote[] = [
  harvey('Winners don’t wait for the right moment. They make the moment wait for them.'),
  harvey('I don’t have bad days. I have days I haven’t closed yet.'),
  harvey('Your reputation walks into the room before you do. Make sure it’s wearing a good suit.'),
  harvey('Stop telling me how hard it is. Tell me when it’s done.'),
  harvey('Leverage is built in private and spent in public.'),
  harvey('The best closers already decided they’re winning before the meeting starts.'),
  harvey('Care about the result less than you care about the standard.'),
  harvey('If you’re going to lose, lose because they were better — never because you were lazy.'),
  harvey('First impressions are a free win. Never give them away.'),
  mike('Memory is a muscle. I just never skip the session.'),
  mike('I didn’t get here because I’m a genius. I got here because I kept reading after everyone else stopped.'),
  mike('Doing the right thing costs more up front and less every day after.'),
  mike('You can’t fake knowing it. Learn it so well you can explain it to a kid.'),
  mike('Second chances are rare. Treat this one like it’s the last.'),
  mike('Loyalty is earned in the small moments nobody’s watching.'),
  mike('Smart gets you in the room. Work keeps you there.'),
  bat('The mask doesn’t make the man. The nights he keeps showing up do.'),
  bat('Fear is information. Use it, then move.'),
  bat('The training is boring. The result is legendary.'),
  bat('Discipline is choosing the mission over the mood.'),
  bat('A plan for every outcome means no outcome owns you.'),
  bat('The city doesn’t need you to feel ready. It needs you to show up.'),
  bat('Pain is temporary. The standard is permanent.'),
  bat('Prepare in the dark so you can perform in the light.'),
  alfred('A stumble is merely rehearsal, sir. I have seen you rehearse a great deal — the performance will be splendid.'),
  alfred('Breakfast first, sir. Even legends require protein.'),
  alfred('I shan’t pretend the alarm was gentle. But neither is regret.'),
  alfred('Some days the heroic thing is simply going to bed on time.'),
  alfred('Endure, sir. Not because it is easy, but because you are capable of it.'),
  alfred('You needn’t be perfect, Master Krishi. Merely present, and slightly better than yesterday.'),
  alfred('A tidy room is a tidy mind. I’ve taken the liberty of reminding you.'),
  alfred('The house remembers every promise you keep to yourself.'),
  alfred('Call your mother, sir. The empire can wait four minutes.'),
  wing('Lighten up. You can be serious about the work and still enjoy the flip.'),
  wing('You don’t have to be the old man. Be the best version of you.'),
  wing('Momentum beats motivation. Keep moving and the mood catches up.'),
  wing('Family isn’t who trained you. It’s who you show up for.'),
  wing('Land it ugly, then land it clean. Then land it every time.'),
  wing('Confidence is just evidence you collected by doing it scared.'),
  wing('Stay light on your feet. Life throws combos.'),
  { by: 'Kabir', original: 'Kal kare so aaj kar, aaj kare so ab.\nPal mein parlay hoyegi, bahuri karega kab.', text: 'Do tomorrow’s work today, and today’s work now. The moment can vanish — when will you do it then?' },
  { by: 'Kabir', original: 'Dheere dheere re mana, dheere sab kuch hoye.\nMaali seenche sau ghada, ritu aaye phal hoye.', text: 'Slowly, mind — everything happens slowly. The gardener pours a hundred pots, but fruit comes in its season.' },
  { by: 'Kabir', original: 'Bura jo dekhan main chala, bura na milya koye.\nJo dil khoja aapna, mujhse bura na koye.', text: 'I went looking for the bad in others and found none. When I searched my own heart, I found no one worse than me.' },
  { by: 'Kabir', original: 'Pothi padh padh jag mua, pandit bhaya na koye.\nDhai aakhar prem ka, padhe so pandit hoye.', text: 'The world died reading books and none became wise. Learn the two-and-a-half letters of love, and you are wise.' },
  { by: 'Kabir', original: 'Jaise til mein tel hai, jyon chakmak mein aag.\nTera saain tujh mein hai, tu jaag sake to jaag.', text: 'As oil lives in the seed and fire in the flint, what you seek is already in you. Wake up, if you can.' },
  { by: 'Kabir', original: 'Nindak niyare raakhiye, aangan kuti chhawaye.\nBin paani saabun bina, nirmal kare subhaye.', text: 'Keep your critic close — give them a hut in your courtyard. Without soap or water, they wash your character clean.' },
  { by: 'Kabir', original: 'Maati kahe kumhaar se, tu kya ronde moye.\nEk din aisa aayega, main rondungi toye.', text: 'The clay says to the potter, “You knead me now — one day I’ll knead you.” Stay humble; time turns every wheel.' },
  { by: 'Kabir', original: 'Aisi baani boliye, man ka aapa khoye.\nAuron ko sheetal kare, aaphu sheetal hoye.', text: 'Speak words that drop the ego — they cool the listener, and they cool you too.' },
  { by: 'Kabir', original: 'Jahaan daya tahaan dharm hai, jahaan lobh tahaan paap.\nJahaan krodh tahaan kaal hai, jahaan kshama tahaan aap.', text: 'Where there is kindness there is dharma; where there is greed, wrong. Where there is anger, ruin; where there is forgiveness, the divine.' },
  { by: 'Kabir', original: 'Saayi itna deejiye, ja mein kutumb samaaye.\nMain bhi bhookha na rahun, saadhu na bhookha jaaye.', text: 'Give me just enough to hold my family — so I don’t go hungry, and no guest at my door does either.' },
]

import { MORE_QUOTES } from './quotes2'
QUOTES.push(...MORE_QUOTES)
