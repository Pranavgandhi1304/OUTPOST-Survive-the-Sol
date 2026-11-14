export interface GreenhouseFact {
  text: string;
  sourceUrl: string;
}

const toolkitUrl = 'https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/';
const eatingInSpaceUrl = 'https://www.asc-csa.gc.ca/eng/astronauts/living-in-space/eating-in-space.asp';

export const greenhouseFacts: GreenhouseFact[] = [
  { text: 'Long Moon trips may need gardens because crews cannot pack every meal before launch.', sourceUrl: eatingInSpaceUrl },
  { text: 'A healthy menu helps astronauts stay strong while their bodies adjust to space.', sourceUrl: eatingInSpaceUrl },
  { text: 'Fresh fruit and vegetables are special treats on the space station because supply ships bring them only sometimes.', sourceUrl: eatingInSpaceUrl },
  { text: 'Space meals need to be nutritious, but they also need to fit in a very small home.', sourceUrl: eatingInSpaceUrl },
  { text: 'Food choices can lift a crew’s mood when people live far from home for a long time.', sourceUrl: eatingInSpaceUrl },
  { text: 'Water matters in a space garden: the ISS can recycle water from several parts of daily life.', sourceUrl: eatingInSpaceUrl },
  { text: 'Food in space must avoid loose crumbs, because little bits can float into equipment.', sourceUrl: eatingInSpaceUrl },
  { text: 'The CSA food toolkit links space food to astronaut health and to food challenges on Earth.', sourceUrl: toolkitUrl },
];

export const csaFoodCredit = 'Food-in-space facts adapted from the Canadian Space Agency (CSA) toolkit.';
