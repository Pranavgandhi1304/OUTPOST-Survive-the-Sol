import type { Allocation, MissionState } from '../engine/types';

export const outpostScene = (state: MissionState, allocation: Allocation): string => {
  const lowPower = state.power < 20;
  const shieldActive = state.shielding >= 40;
  const plantHeight = Math.min(28, 6 + Math.round(Math.max(state.greenhouseYield, allocation.greenhouse) * 2.2));
  const dust = state.event.kind === 'dustStorm';
  const world = state.site === 'moon' ? 'lunar' : 'martian';
  return `<figure class="outpost-scene ${world} ${lowPower ? 'low-power' : ''} ${shieldActive ? 'shield-active' : ''} ${dust ? 'dusty' : ''}" aria-label="${state.site === 'moon' ? 'Lunar' : 'Martian'} outpost scene. ${lowPower ? 'The outpost lights are dim because power is low.' : 'Outpost lights are bright.'} ${shieldActive ? 'The radiation shield is active.' : 'The radiation shield is weak.'}">
    <svg viewBox="0 0 720 230" role="img" aria-hidden="true">
      <defs><linearGradient id="sky" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#122948"/><stop offset="1" stop-color="#301e3a"/></linearGradient><linearGradient id="ground" x1="0" x2="1"><stop stop-color="#384664"/><stop offset="1" stop-color="#1f263d"/></linearGradient></defs>
      <rect class="scene-sky" width="720" height="230" fill="url(#sky)"/><g class="stars"><circle cx="64" cy="34" r="2"/><circle cx="155" cy="72" r="1.5"/><circle cx="250" cy="28" r="2"/><circle cx="489" cy="46" r="1.5"/><circle cx="632" cy="22" r="2"/><circle cx="681" cy="90" r="1"/></g>
      <path class="scene-ground" d="M0 160 Q90 135 180 158 T360 154 T540 150 T720 162 V230 H0Z" fill="url(#ground)"/><g class="solar-panels"><path d="M93 173 l72 -25 20 18 -72 26Z"/><path d="M523 169 l73 -26 19 18 -72 27Z"/><path d="M128 159 l13 33M560 155 l13 35"/></g>
      <g class="shield-dome"><path d="M208 161 A152 132 0 0 1 512 161"/><path d="M221 161 A139 119 0 0 1 499 161"/></g><g class="habitat"><path class="hab-base" d="M254 164 V120 Q360 50 466 120 V164Z"/><path class="hab-window" d="M333 119 h54 v29 h-54Z"/><rect class="hab-door" x="349" y="143" width="22" height="21" rx="2"/><circle class="outpost-light left" cx="292" cy="144" r="6"/><circle class="outpost-light right" cx="429" cy="144" r="6"/></g>
      <g class="greenhouse"><path d="M469 164 V124 h72 v40Z"/><path d="M469 124 l16 -14 h40 l16 14Z"/><path class="plant one" d="M486 160 v-${plantHeight} m0 ${Math.round(plantHeight * .65)} l-8 -7 m8 1 l9 -8"/><path class="plant two" d="M509 160 v-${Math.max(7, plantHeight - 5)} m0 ${Math.round(plantHeight * .55)} l-7 -6 m7 2 l8 -7"/><path class="plant three" d="M530 160 v-${Math.max(6, plantHeight - 9)} m0 ${Math.round(plantHeight * .5)} l-6 -5 m6 1 l7 -6"/></g><g class="antenna"><path d="M289 119 V83 M278 94 l11 -11 12 11 M274 105 h30"/><circle cx="289" cy="80" r="3"/></g>
      ${dust ? '<g class="dust-overlay"><path d="M0 119 Q115 82 220 118 T440 108 T720 94"/><path d="M0 145 Q120 110 265 142 T520 127 T720 139"/><path d="M37 85 Q190 67 327 89 T622 72"/></g>' : ''}
    </svg><figcaption><span class="scene-dot"></span>${lowPower ? 'Power-saving lights' : 'Outpost systems ready'} · ${shieldActive ? 'Shield dome charged' : 'Shield dome needs power'} · greenhouse growth ${plantHeight > 15 ? 'strong' : 'slow'}</figcaption></figure>`;
};
