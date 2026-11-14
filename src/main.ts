import './styles.css';
import { scienceTerms } from './content/terms';
import { discussionQuestions, tutorialSteps } from './content/tutorial';
import { csaFoodCredit, greenhouseFacts } from './content/greenhouseFacts';
import { calibrationFromData, loadNasaData } from './data/nasa';
import { advanceTurn, createMission, earthAdvice, solarForTurn } from './engine/game';
import { missionCode, randomMissionSeed, seedFromSearch } from './engine/missionCode';
import type { Allocation, MissionState, Site } from './engine/types';
import type { NasaDataBundle } from './data/types';
import { formatPercent } from './ui/format';
import { outpostScene } from './ui/outpostScene';

type Screen = 'tutorial' | 'landing' | 'mission' | 'debrief' | 'classroom';
type Difficulty = 'standard' | 'today';
const tutorialSeen = (): boolean => { try { return localStorage.getItem('outpost:tutorial-seen') !== null; } catch { return false; } };
const rememberTutorial = (): void => { try { localStorage.setItem('outpost:tutorial-seen', 'true'); } catch { /* storage may be unavailable */ } };
const escapeHtml = (value: string | number): string => String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]!);
const externalUrl = (value: string): string => { try { const url = new URL(value); return url.protocol === 'https:' ? escapeHtml(url.href) : '#'; } catch { return '#'; } };
const escapedData = (bundle: NasaDataBundle): NasaDataBundle => ({
  weather: bundle.weather && { ...bundle.weather, eventClass: escapeHtml(bundle.weather.eventClass), eventDate: escapeHtml(bundle.weather.eventDate), eventId: bundle.weather.eventId && escapeHtml(bundle.weather.eventId), badge: escapeHtml(bundle.weather.badge) as typeof bundle.weather.badge, source: escapeHtml(bundle.weather.source) },
  radiation: bundle.radiation && { ...bundle.radiation, readingDate: escapeHtml(bundle.radiation.readingDate), badge: escapeHtml(bundle.radiation.badge) as typeof bundle.radiation.badge, source: escapeHtml(bundle.radiation.source) },
  science: bundle.science && { ...bundle.science, title: escapeHtml(bundle.science.title), description: escapeHtml(bundle.science.description), studyId: escapeHtml(bundle.science.studyId), url: externalUrl(bundle.science.url), badge: escapeHtml(bundle.science.badge) as typeof bundle.science.badge },
});
let screen: Screen = tutorialSeen() ? 'landing' : 'tutorial';
let tutorialStep = 0;
let selectedSite: Site = 'moon';
let difficulty: Difficulty = 'standard';
let muted = false;
let mission: MissionState | undefined;
let data: NasaDataBundle = {};
let allocation: Allocation = { lifeSupport: 6, shielding: 3, greenhouse: 3, science: 2 };
let audioContext: AudioContext | undefined;
const requestedSeed = seedFromSearch(window.location.search);
const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('OUTPOST app root was not found.');

const siteName = (site: Site): string => (site === 'moon' ? 'Moon: Shackleton rim' : 'Mars: Jezero crater');
const meter = (label: string, value: number, color: string, hint: string): string => { const icon = label === 'POWER' ? '⚡' : label === 'AIR' ? '◌' : '◒'; return `<section class="meter" aria-label="${label}: ${Math.round(value)} out of 100"><svg viewBox="0 0 42 42" role="img" aria-hidden="true"><circle class="meter-track" cx="21" cy="21" r="16"/><circle class="meter-value" cx="21" cy="21" r="16" pathLength="100" stroke-dasharray="${Math.max(2, value)} 100" style="stroke:${color}"/></svg><div><b aria-hidden="true">${icon}</b><strong>${label}</strong><span>${formatPercent(value)}</span><small>${hint}</small></div></section>`; };
const sourceStatus = (): string => `<details class="data-panel"><summary>Where this data comes from</summary><ul>${data.weather ? `<li><strong>NASA CCMC DONKI</strong> — ${data.weather.badge}; the strongest FLR, CME, or GST record sets Today’s Real Space Weather baseline.</li>` : ''}${data.radiation ? `<li><strong>NASA OSDR RadLab</strong> — ${data.radiation.badge}; ISS reading from ${data.radiation.readingDate} calibrates crew radiation dose.</li>` : ''}${data.science ? `<li><strong>NASA OSDR search</strong> — ${data.science.badge}; provides the end-of-mission Real NASA Science card.</li>` : ''}<li><strong>Canadian Space Agency (CSA) food toolkit</strong> — reference snapshot (accessed 2026-11-14); powers greenhouse learning facts only.</li></ul><p>Terrain data from NASA Trek is not used in this build.</p></details>`;
const greenhouseFact = (turn = 0): string => { const fact = greenhouseFacts[turn % greenhouseFacts.length]; return `<p class="greenhouse-fact"><span aria-hidden="true">✦</span> ${escapeHtml(fact.text)} <a href="${externalUrl(fact.sourceUrl)}" target="_blank" rel="noreferrer">CSA source ↗</a></p>`; };
const weatherPanel = (): string => data.weather ? `<section class="nasa-weather" aria-label="Real NASA Space Weather"><p class="eyebrow">REAL NASA SPACE WEATHER · ${data.weather.badge}</p><h2>${data.weather.eventClass} <span>· ${data.weather.eventDate}</span></h2><p>${difficulty === 'today' ? `Today’s Real Space Weather is active: this DONKI event sets a level ${data.weather.severity} storm baseline tonight.` : `Training difficulty is active. This DONKI event would set a level ${data.weather.severity} storm baseline in Today’s mode.`}</p></section>` : '';
const playSignal = (): void => {
  if (muted) return;
  audioContext ??= new AudioContext();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.frequency.value = 523.25;
  gain.gain.setValueAtTime(0.03, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.12);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.12);
};

const landing = (): string => `<main class="shell landing"><a class="skip" href="#mission-start">Skip to mission start</a><header><p class="eyebrow">2026 NASA SPACE APPS CHALLENGE</p><h1>OUTPOST<br><em>Survive the Sol</em></h1><p class="lead">Can you share one small power budget and keep your crew safe for 30 sols?</p></header><section class="site-picker" aria-labelledby="mission-start"><h2 id="mission-start">Pick your outpost</h2><div class="site-buttons"><button class="site ${selectedSite === 'moon' ? 'selected' : ''}" data-site="moon" aria-pressed="${selectedSite === 'moon'}"><span>◐</span>Moon<br><small>Shackleton rim</small></button><button class="site ${selectedSite === 'mars' ? 'selected' : ''}" data-site="mars" aria-pressed="${selectedSite === 'mars'}"><span>●</span>Mars<br><small>Jezero crater</small></button></div><p class="choice-note">${selectedSite === 'moon' ? 'Long nights make your battery important.' : 'Earth advice takes 3–22 minutes to reach Mars.'}</p><div class="difficulty-picker" aria-label="Mission difficulty"><button data-difficulty="standard" aria-pressed="${difficulty === 'standard'}">Training weather</button><button data-difficulty="today" aria-pressed="${difficulty === 'today'}">Today’s Real Space Weather</button></div><button class="primary" data-action="start">Start the 30-sol mission</button></section><details class="learn"><summary>What is a sol?</summary><p>A sol is one day on Mars. We use it here as one mission turn.</p></details>${sourceStatus()}<div class="landing-actions"><button class="mute" data-action="classroom">Classroom / parent mode</button><button class="mute" data-action="mute" aria-pressed="${muted}">${muted ? 'Unmute signals' : 'Mute signals'}</button></div></main>`;
const tutorial = (): string => { const step = tutorialSteps[tutorialStep]; return `<main class="shell tutorial-screen"><p class="eyebrow">${step.eyebrow}</p><h1>${step.title}</h1><section class="tutorial-card"><div class="tutorial-orbit" aria-hidden="true"><span>⚡</span><span>◒</span><span>✦</span></div><p class="lead">${step.body}</p></section><div class="tutorial-actions"><button class="mute" data-action="tutorial-skip">Skip tutorial</button><button class="primary" data-action="tutorial-next">${tutorialStep === tutorialSteps.length - 1 ? 'Start training' : 'Next step'}</button></div></main>`; };
const classroom = (): string => `<main class="shell classroom-screen"><header><p class="eyebrow">CLASSROOM / PARENT MODE</p><h1>Talk it through</h1><p class="lead">Use these questions after one mission. There are no single right answers—ask learners to explain their evidence.</p></header><section class="discussion-card"><h2>Discussion questions</h2><ol>${discussionQuestions.map((question) => `<li>${question}</li>`).join('')}</ol></section><section class="discussion-card"><h2>Quick activity</h2><p>Have one learner protect the crew, one grow food, and one chase science. Compare their power plans, then try a shared plan.</p></section><button class="primary" data-action="classroom-close">Back to mission select</button></main>`;
const control = (label: keyof Allocation, title: string, help: string): string => `<label class="allocation ${label === 'greenhouse' ? 'greenhouse-control' : ''}"><span><strong>${title}</strong><small>${help}</small>${label === 'greenhouse' && allocation.greenhouse > 0 ? greenhouseFact(mission?.turn ?? 0) : ''}</span><output id="${label}-value">${allocation[label]}</output><input type="range" min="0" max="10" value="${allocation[label]}" data-allocation="${label}" aria-label="${title} power units" /></label>`;
const tradeoff = (choice: Allocation): string => {
  if (choice.lifeSupport < 5) return `Life Support received only ${choice.lifeSupport} units, so air and crew health fell.`;
  if (choice.shielding < 2) return `Radiation Shield received only ${choice.shielding} units, leaving the crew exposed.`;
  if (choice.greenhouse < 2) return `Greenhouse received only ${choice.greenhouse} units, so future food stores shrank.`;
  if (choice.science < 1) return 'Science received no power, so the mission science goal slipped away.';
  return `The split spent ${choice.science} units on science while the other systems shared the rest.`;
};
const replayTimeline = (state: MissionState): string => `<ol class="replay-timeline">${state.replay.slice(-5).map((entry, index, entries) => `<li class="${index === entries.length - 1 ? 'turning-point' : ''}"><strong>Sol ${entry.turn}</strong><span>${entry.event.title}. ${tradeoff(entry.allocation)} ${entry.note}</span></li>`).join('')}</ol>`;
const missionScreen = (state: MissionState): string => { const replay = state.replay.at(-1); const forecast = state.nextEvent; const forecastPower = solarForTurn(state.site, state.turn, forecast) + state.battery; return `<main class="shell mission-shell"><header class="mission-header"><div><p class="eyebrow">${siteName(state.site)} · MISSION CODE ${missionCode(state.missionSeed)}</p><h1>Sol ${Math.min(state.turn, 30)} <span>/ 30</span></h1></div><button class="mute" data-action="mute" aria-pressed="${muted}">${muted ? 'Unmute' : 'Mute'}</button></header>${outpostScene(state, allocation)}${weatherPanel()}<section class="meters" aria-label="Outpost status">${meter('POWER', state.power, '#4db6ff', 'left after your plan')}${meter('AIR', state.air, '#77d6a5', 'breathable air')}${meter('SHIELDING', state.shielding, '#f4cf63', 'storm protection')}</section><section class="event-card ${forecast.kind}" aria-live="polite"><p class="eyebrow">${forecast.kind === 'quiet' ? 'FORECAST' : 'FORECAST · WATCH OUT'}</p><h2>Upcoming sol: ${forecast.title}</h2><p>${forecast.message} Plan for up to ${forecastPower} power units, including ${state.battery} in the battery.</p><small>${earthAdvice(state.site, state.turn, replay?.event)}</small></section><section class="planner" aria-labelledby="plan-title"><div class="planner-title"><h2 id="plan-title">Share today’s power</h2><p>Plan: <strong>${allocation.lifeSupport + allocation.shielding + allocation.greenhouse + allocation.science}</strong> units. Any extra solar power charges the battery.</p></div>${control('lifeSupport', 'Life Support', 'More air now; less power for other jobs.')}${control('shielding', 'Radiation Shield', 'Blocks more storm radiation; costs power.')}${control('greenhouse', 'Greenhouse', 'Uses power today; grows food next sol.')}${control('science', 'Science / Comms', 'Earns science; pauses during a blackout.')}<button class="primary next" data-action="next">Run sol ${state.turn}</button></section><details class="learn"><summary>Tap to learn science words</summary><p>${scienceTerms}</p></details>${sourceStatus()}</main>`; };
const debrief = (state: MissionState): string => { const last = state.replay.at(-1); const won = state.outcome === 'won'; const scienceCard = data.science ? `<article class="science-card"><p class="eyebrow">REAL NASA SCIENCE · OSDR · ${data.science.badge}</p><h2>${data.science.title}</h2><p>${data.science.description}</p><a href="${data.science.url}" target="_blank" rel="noreferrer">Explore ${data.science.studyId} at NASA OSDR <span aria-hidden="true">↗</span></a></article>` : ''; return `<main class="shell debrief"><header><p class="eyebrow">MISSION ${won ? 'COMPLETE' : 'REPLAY'}</p><h1>${won ? 'You made it through 30 sols!' : 'Mission Replay'}</h1><p class="lead">${won ? 'Your crew balanced survival and discovery.' : state.failureReason}</p></header><section class="replay-card"><h2>${won ? 'The last five sols' : `The turning point: sol ${last?.turn ?? 1}`}</h2><p>${won ? 'Your final choices show how careful planning carried the crew through.' : `The highlighted sol is where this trade-off became the mission-ending problem.`}</p>${replayTimeline(state)}</section>${scienceCard}<article class="food-card"><p class="eyebrow">HOW ASTRONAUTS REALLY GROW FOOD</p>${greenhouseFact(state.turn)}<p class="credit-line">${csaFoodCredit}</p></article><section class="end-stats" aria-label="Mission support stats"><p><strong>${Math.round(state.science)}</strong> science points</p><p><strong>${Math.round(state.radiationDose)}</strong> dose units</p><p><strong>${Math.round(state.food)}</strong> food stores</p></section><button class="primary" data-action="again">Try a new mission</button>${sourceStatus()}</main>`; };
const render = (): void => { app.innerHTML = screen === 'tutorial' ? tutorial() : screen === 'classroom' ? classroom() : screen === 'landing' ? landing() : screen === 'mission' && mission ? missionScreen(mission) : mission ? debrief(mission) : landing(); };
app.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  const site = target.closest<HTMLButtonElement>('[data-site]')?.dataset.site as Site | undefined;
  if (site) { selectedSite = site; render(); return; }
  const selectedDifficulty = target.closest<HTMLButtonElement>('[data-difficulty]')?.dataset.difficulty as Difficulty | undefined;
  if (selectedDifficulty) { difficulty = selectedDifficulty; render(); return; }
  const action = target.closest<HTMLButtonElement>('[data-action]')?.dataset.action;
  if (action === 'tutorial-next') { tutorialStep += 1; if (tutorialStep >= tutorialSteps.length) { rememberTutorial(); screen = 'landing'; } render(); return; }
  if (action === 'tutorial-skip') { rememberTutorial(); screen = 'landing'; render(); return; }
  if (action === 'classroom') { screen = 'classroom'; render(); return; }
  if (action === 'classroom-close') { screen = 'landing'; render(); return; }
  if (action === 'mute') { muted = !muted; render(); return; }
  if (action === 'start') { mission = createMission(selectedSite, requestedSeed ?? randomMissionSeed(), calibrationFromData(data, difficulty === 'today')); screen = 'mission'; playSignal(); render(); return; }
  if (action === 'next' && mission) { mission = advanceTurn(mission, allocation).state; if (mission.outcome !== 'playing') screen = 'debrief'; playSignal(); render(); return; }
  if (action === 'again') { screen = 'landing'; mission = undefined; render(); }
});
app.addEventListener('input', (event) => { const input = event.target as HTMLInputElement; const key = input.dataset.allocation as keyof Allocation | undefined; if (!key) return; allocation = { ...allocation, [key]: Number(input.value) }; const output = app.querySelector<HTMLOutputElement>(`#${key}-value`); if (output) output.value = input.value; const total = app.querySelector('.planner-title p strong'); if (total) total.textContent = String(allocation.lifeSupport + allocation.shielding + allocation.greenhouse + allocation.science); });
render();
void loadNasaData().then((nextData) => { data = escapedData(nextData); render(); });
