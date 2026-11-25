/**
 * Short poultry guidance for USSD screens (about 160 characters each, so the
 * screen plus the "0. Back" line stays inside the ~182-character USSD limit).
 * Mirrors src/guidance/poultry-guide.js: confirm any schedule with a vet.
 */

export const POULTRY_USSD_STAGES = ['hatching', 'brooding', 'growers', 'adults'];
export const POULTRY_USSD_TOPICS = ['feeding', 'care', 'vaccination', 'accommodation', 'hygiene'];

export const POULTRY_USSD_TEXT = {
  en: {
    hatching: {
      feeding: 'Water and chick starter within 24h of arrival. Dip a few beaks to show chicks where to drink.',
      care: 'Incubate 21 days at 37.5C. Turn eggs 3x daily to day 18. Keep chicks dry and warm. Do not help them out of the shell.',
      vaccination: "Marek's vaccine is given at the hatchery on day 1. Ask for the record. Never vaccinate chilled or sick chicks.",
      accommodation: 'Warm the brooder 24h before arrival: 32-35C under the heat, 5-7cm dry litter, no draughts.',
      hygiene: 'Wash hands first. Disinfect incubator and trays between hatches. Never mix hatches.',
    },
    brooding: {
      feeding: 'Chick starter from day 1, always available. Clean water at all times. 1 feeder and drinker per 50 chicks.',
      care: '32-35C in week 1, then drop 2-3C weekly. Huddled = cold; panting at edges = hot. Check 3x daily.',
      vaccination: 'Typical: Newcastle d7-10, Gumboro d14+d21, Newcastle booster d21-28. Keep vaccine cold. Confirm with your vet.',
      accommodation: '20-25 chicks per m2, dry litter 5-7cm. Ventilate any charcoal stove: fumes kill.',
      hygiene: 'Footbath at the door. Wash drinkers daily. All-in all-out. Keep litter dry to stop coccidiosis.',
    },
    growers: {
      feeding: 'Grower mash from week 6-8. Do not overfeed pullets. Clean water always. Never use mouldy feed.',
      care: 'Deworm about every 3 months (ask your vet). No lamp light before week 16-18. Add perches from week 8.',
      vaccination: 'Typical: fowl pox wk6-8, Newcastle booster wk8-10 and wk16-18. Confirm with your vet.',
      accommodation: '6-8 birds per m2 on deep litter. Wire-mesh sides, curtain for cold nights, predator-proof door.',
      hygiene: 'Keep litter dry. Quarantine new birds 2 weeks. Bury or burn dead birds. Rest house between batches.',
    },
    adults: {
      feeding: 'Layer mash with calcium from first egg, about 110-120g per hen daily. Never run out of water. Offer oyster shell.',
      care: '14-16 hours of light daily once laying. Collect eggs 2-3x a day. 1 nest box per 4-5 hens. Give shade in heat.',
      vaccination: 'Typical: Newcastle booster every 3 months. Observe egg withdrawal after any treatment. Ask your vet.',
      accommodation: '4-5 layers per m2, 20cm perch per bird, dry airy house, rodent-proof feed store.',
      hygiene: 'Wash hands after handling birds and eggs. Clean litter each batch. Bury dead birds. Report sudden deaths.',
    },
  },
  sw: {
    hatching: {
      feeding: 'Wape vifaranga maji na chakula cha vifaranga ndani ya saa 24. Chovya midomo ya wachache waone maji.',
      care: 'Atamia siku 21 kwa 37.5C. Geuza mayai mara 3 kwa siku hadi siku 18. Weka vifaranga vikavu na joto.',
      vaccination: 'Chanjo ya Marek hutolewa kwenye kituo cha kutotoa siku ya 1. Omba rekodi. Usichanje vifaranga wagonjwa.',
      accommodation: 'Andaa chumba cha joto saa 24 kabla: 32-35C chini ya joto, matandiko makavu 5-7cm, bila upepo.',
      hygiene: 'Nawa mikono kwanza. Safisha mashine na trei kila baada ya kutotoa. Usichanganye makundi.',
    },
    brooding: {
      feeding: 'Chakula cha vifaranga tangu siku ya 1, kila wakati. Maji safi daima. Chombo 1 kwa vifaranga 50.',
      care: '32-35C wiki 1, kisha punguza 2-3C kila wiki. Kukusanyika = baridi; kuhema = joto. Kagua mara 3 kwa siku.',
      vaccination: 'Kawaida: Newcastle siku 7-10, Gumboro siku 14+21, nyongeza siku 21-28. Hifadhi baridi. Muulize daktari.',
      accommodation: 'Vifaranga 20-25 kwa m2, matandiko makavu 5-7cm. Weka hewa kwenye jiko la mkaa: moshi unaua.',
      hygiene: 'Beseni la dawa mlangoni. Osha vinywesha kila siku. Kundi moja kwa wakati. Matandiko makavu.',
    },
    growers: {
      feeding: 'Mash ya kuku wanaokua tangu wiki 6-8. Usinenepeshe. Maji safi kila wakati. Usitumie chakula chenye ukungu.',
      care: 'Dawa ya minyoo kila miezi 3 (muulize daktari). Usiongeze mwanga kabla ya wiki 16-18. Weka vichanja wiki 8.',
      vaccination: 'Kawaida: ndui wiki 6-8, nyongeza Newcastle wiki 8-10 na 16-18. Thibitisha na daktari.',
      accommodation: 'Kuku 6-8 kwa m2. Pande za wavu, pazia usiku wa baridi, mlango salama dhidi ya wanyama.',
      hygiene: 'Matandiko makavu. Tenga kuku wapya wiki 2. Zika au choma waliokufa. Pumzisha banda kati ya makundi.',
    },
    adults: {
      feeding: 'Chakula cha mayai chenye kalsiamu tangu yai la kwanza, 110-120g kwa kuku kwa siku. Maji yasikose. Toa chokaa cha ganda.',
      care: 'Mwanga masaa 14-16 kwa siku. Kusanya mayai mara 2-3. Kiota 1 kwa kuku 4-5. Kivuli kwenye joto.',
      vaccination: 'Kawaida: nyongeza Newcastle kila miezi 3. Subiri muda wa dawa kabla ya kuuza mayai. Muulize daktari.',
      accommodation: 'Kuku 4-5 kwa m2, kichanja 20cm kwa kuku, banda kavu lenye hewa, stoo isiyoingiliwa na panya.',
      hygiene: 'Nawa mikono baada ya kushika kuku na mayai. Safisha matandiko kila kundi. Zika waliokufa. Ripoti vifo vya ghafla.',
    },
  },
};

export const POULTRY_USSD_LABELS = {
  en: {
    stages: { hatching: 'Hatching/day-old', brooding: 'Brooding chicks', growers: 'Growers', adults: 'Adult layers' },
    topics: { feeding: 'Feeding', care: 'Care', vaccination: 'Vaccines', accommodation: 'Housing', hygiene: 'Hygiene' },
    title: 'POULTRY GUIDE',
    stagePrompt: 'Select stage:',
    topicPrompt: 'Select topic:',
  },
  sw: {
    stages: { hatching: 'Kutotoa/vifaranga', brooding: 'Kulea vifaranga', growers: 'Kuku wanaokua', adults: 'Kuku wa mayai' },
    topics: { feeding: 'Chakula', care: 'Matunzo', vaccination: 'Chanjo', accommodation: 'Banda', hygiene: 'Usafi' },
    title: 'MWONGOZO WA KUKU',
    stagePrompt: 'Chagua hatua:',
    topicPrompt: 'Chagua mada:',
  },
};
