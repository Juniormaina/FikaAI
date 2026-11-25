/**
 * Synthetic demo advisory library.
 * Explicitly marked as demonstration data — not verified agronomic or
 * veterinary advice. Product names, rates and thresholds must always be
 * confirmed with a certified extension officer, agrovet, or vet.
 */

export const DEMO_LAST_UPDATED = '2026-11-20T06:30:00.000Z';
export const DEMO_LAST_UPDATED_LABEL = '20 Nov 2026, 09:30 EAT';
export const DEMO_DATA_SOURCE = 'Synthetic agri data — for demonstration only';

export const CATEGORIES = ['nutrient', 'pest', 'disease', 'water', 'planting', 'livestock'];

export const SYNTHETIC_ADVISORIES = [
  {
    id: 'adv-maize-nitrogen',
    title: 'Nitrogen deficiency — V-shaped yellowing on lower leaves',
    category: 'nutrient',
    crops: ['maize'],
    regions: ['Kiambu', 'Nakuru', 'Nyandarua'],
    urgency: 'urgent',
    summary:
      'Heavy rain can wash nitrogen below the shallow root zone. Yellowing that starts at the leaf tip and runs down the midrib in a "V", on the older lower leaves first, is a common sign.',
    symptoms: ['yellow', 'yellowing', 'chlorosis', 'pale', 'midrib', 'lower leaves', 'v-shaped', 'stunted', 'rain'],
    field_checks: [
      {
        title: 'Examine leaf anatomy',
        detail: 'Look for yellowing that starts at the leaf tip and moves down the midrib. Older, lower leaves usually show it first.',
      },
      {
        title: 'Check soil moisture and feel',
        detail: 'Dig 10 cm beside a plant. Dense, cold, waterlogged soil can cause similar yellowing, so rule that out first.',
      },
    ],
    remediation:
      'If nitrogen shortage is the likely cause, split the top-dressing and apply only when the soil surface is moist. Keep granules a hand-width away from the stem and out of the leaf whorl to avoid burn. Confirm the product and rate for your soil with your extension officer or agrovet.',
    caution: 'Do not drop fertiliser into the leaf whorl. Rate and product depend on your soil and stage — confirm locally.',
    protocol_ref: 'DEMO-MZ-NITR-04',
    sms_en: 'Likely nitrogen shortage: V-shaped yellowing from leaf tip, lower leaves first. Rule out waterlogging. Top-dress on moist soil, away from the whorl. Confirm rate with your extension officer.',
    sms_sw: 'Huenda ni upungufu wa nitrojeni: manjano umbo la V kuanzia ncha ya jani, majani ya chini kwanza. Angalia kama shamba lina maji mengi. Weka mbolea ya kukuzia udongo ukiwa na unyevu, mbali na moyo wa mmea. Thibitisha kiasi na afisa wa ugani.',
  },
  {
    id: 'adv-maize-faw',
    title: 'Fall armyworm — whorl feeding and windowpane damage',
    category: 'pest',
    crops: ['maize'],
    regions: ['Kiambu', 'Nakuru', 'Nyandarua', 'Machakos'],
    urgency: 'urgent',
    summary:
      'Early leaf damage can mimic nutrient problems. Windowpane scars, ragged holes and sawdust-like droppings in the whorl point to fall armyworm larvae.',
    symptoms: ['armyworm', 'worm', 'larvae', 'caterpillar', 'frass', 'sawdust', 'holes', 'windowpane', 'whorl', 'chewed', 'eaten'],
    field_checks: [
      {
        title: 'Scout 20 plants along a "W" path',
        detail: 'Walk a W across the block. Check the whorl of each plant for fresh droppings, small larvae or windowpane scars.',
      },
      {
        title: 'Count plants with fresh damage',
        detail: 'Write down how many of the 20 plants show fresh feeding. Share the count with your extension officer.',
      },
    ],
    remediation:
      'On small plots, hand-pick egg masses and larvae early in the morning. If damage is widespread, ask your extension officer or agrovet for a registered product for your crop stage and follow the label exactly.',
    caution: 'Wear protective gear, never mix chemicals without advice, and keep children and animals away from sprayed fields.',
    protocol_ref: 'DEMO-MZ-FAW-02',
    sms_en: 'Possible fall armyworm: windowpane scars, ragged holes, sawdust droppings in the whorl. Scout 20 plants along a W path. If many are damaged, ask your extension officer for a registered product. Follow the label.',
    sms_sw: 'Huenda ni viwavi jeshi: alama za dirisha, mashimo, vumbi la kinyesi kwenye moyo wa mmea. Kagua mimea 20 kwa njia ya W. Ikiwa mingi imeharibika, muulize afisa wa ugani dawa iliyosajiliwa. Fuata maelekezo.',
  },
  {
    id: 'adv-maize-mln',
    title: 'Maize lethal necrosis — mottled streaks and dried leaf edges',
    category: 'disease',
    crops: ['maize'],
    regions: ['Nakuru', 'Nyandarua', 'Kiambu'],
    urgency: 'urgent',
    summary:
      'Mottled yellow streaks along the leaf, drying from the edges, and stunting can signal a viral disease. It needs to be reported rather than treated by yourself.',
    symptoms: ['mottled', 'streaks', 'mosaic', 'dried', 'edges', 'dead heart', 'stunted', 'thrips', 'virus', 'necrosis', 'mln', 'yellow'],
    field_checks: [
      {
        title: 'Look at the whole plant',
        detail: 'Check for mottled streaks across the leaf, tan dried edges, and short internodes. Note which plants and how many.',
      },
      {
        title: 'Report before you remove anything',
        detail: 'Call or message your extension officer so the sighting is recorded before plants are removed.',
      },
    ],
    remediation:
      'Remove suspect plants and keep them out of the compost pile. Avoid replanting maize on the same plot straight away and ask your extension officer about rotation.',
    caution: 'Do not feed suspect plants to animals or move them off the farm without advice.',
    protocol_ref: 'DEMO-MZ-MLN-01',
    sms_en: 'Possible viral disease: mottled streaks, dried leaf edges, stunting. Report to your extension officer first. Remove suspect plants, do not compost them. Avoid replanting maize on this plot right away.',
    sms_sw: 'Huenda ni ugonjwa wa virusi: michirizi ya madoa, kingo kavu, kudumaa. Ripoti kwa afisa wa ugani kwanza. Ondoa mimea inayoshukiwa, usiitie kwenye mbolea. Epuka kupanda mahindi tena hapo mara moja.',
  },
  {
    id: 'adv-maize-waterlogging',
    title: 'Waterlogging — pale patches in low spots',
    category: 'water',
    crops: ['maize', 'beans'],
    regions: ['Kiambu', 'Nakuru', 'Nyandarua'],
    urgency: 'advisory',
    summary:
      'Standing water starves roots of oxygen. Stunted, pale patches that follow low spots in the field often point to drainage rather than a nutrient or pest problem.',
    symptoms: ['waterlogged', 'waterlogging', 'standing water', 'pooling', 'wet', 'low spots', 'stunted', 'purple', 'yellow', 'yellowing', 'drain'],
    field_checks: [
      {
        title: 'Match the damage to the land',
        detail: 'Do the weak patches line up with low ground or furrow ends where water collects?',
      },
      {
        title: 'Dig a test hole',
        detail: 'Dig 20 cm. If water seeps in or the soil smells sour, drainage is likely the problem.',
      },
    ],
    remediation:
      'Open shallow cut-off drains along the slope to release standing water. Once the soil firms, ask your extension officer whether a foliar feed is worthwhile.',
    caution: 'Avoid heavy foot traffic on saturated soil — it compacts the root zone.',
    protocol_ref: 'DEMO-SOIL-DRN-03',
    sms_en: 'Possible waterlogging: pale, stunted patches in low spots. Dig a 20 cm test hole. If it fills or smells sour, cut shallow drains along the slope. Avoid walking on wet soil.',
    sms_sw: 'Huenda ni maji yaliyotuama: madoa meupe na kudumaa maeneo ya chini. Chimba shimo la sentimita 20. Likijaa maji au kunuka vibaya, chimba mifereji mifupi kufuata mteremko. Epuka kukanyaga udongo wenye maji.',
  },
  {
    id: 'adv-beans-planting-window',
    title: 'Bean planting window after the onset of rains',
    category: 'planting',
    crops: ['beans'],
    regions: ['Nakuru', 'Nyandarua', 'Machakos'],
    urgency: 'routine',
    summary:
      'Plant when the rains are established and the soil is moist to hand depth. Planting on the first showers risks a dry spell after germination.',
    symptoms: ['plant', 'planting', 'sow', 'sowing', 'seed', 'when', 'window', 'spacing', 'germination', 'rains'],
    field_checks: [
      {
        title: 'Confirm the rains are established',
        detail: 'Look for two to three rainy days in a row and soil that stays moist when you squeeze a handful.',
      },
      {
        title: 'Prepare certified seed and a fine seedbed',
        detail: 'Use certified seed from a registered agrovet. Break up large clods before planting.',
      },
    ],
    remediation:
      'Plant in rows at the spacing your extension officer recommends for your bean variety, and note your planting date in your farm plan.',
    caution: 'Do not use grain from the market as seed — it may carry disease and has unknown germination.',
    protocol_ref: 'DEMO-BN-PLT-01',
    sms_en: 'Beans: plant once rains are established and soil is moist to hand depth. Use certified seed, break clods, plant in rows at the spacing for your variety. Note the planting date.',
    sms_sw: 'Maharagwe: panda mvua zikishaanza na udongo ukiwa na unyevu kwa kina cha mkono. Tumia mbegu iliyothibitishwa, vunja madonge, panda kwa mistari. Andika tarehe ya kupanda.',
  },
  {
    id: 'adv-tomato-blight',
    title: 'Tomato blight — dark patches and white mould on leaves',
    category: 'disease',
    crops: ['tomatoes'],
    regions: ['Kiambu', 'Nakuru', 'Machakos'],
    urgency: 'urgent',
    summary:
      'Dark, water-soaked patches on leaves and stems, sometimes with white fuzz underneath in damp weather, can point to blight. It spreads fast in cool, wet conditions.',
    symptoms: ['blight', 'dark', 'patches', 'spots', 'mould', 'mold', 'white', 'wilting', 'rot', 'fruit', 'wet', 'brown'],
    field_checks: [
      {
        title: 'Check the underside of leaves',
        detail: 'Look for white fuzzy growth on the underside of damaged leaves early in the morning.',
      },
      {
        title: 'Walk the whole block',
        detail: 'Note whether spots are on a few plants or spreading from low, damp corners.',
      },
    ],
    remediation:
      'Remove and bag badly affected leaves, space and stake plants for airflow, and avoid watering the leaves. Ask your agrovet or extension officer about a registered fungicide and follow the label.',
    caution: 'Do not compost diseased plant material. Wash tools between plants.',
    protocol_ref: 'DEMO-TM-BLT-02',
    sms_en: 'Possible tomato blight: dark water-soaked patches, white fuzz under leaves. Bag affected leaves, improve airflow, water at the base. Ask your agrovet for a registered fungicide. Follow the label.',
    sms_sw: 'Huenda ni ukungu wa nyanya: madoa meusi yenye maji, unga mweupe chini ya majani. Weka majani yaliyoathirika kwenye mfuko, ongeza hewa, mwagilia chini ya mmea. Muulize muuzaji wa dawa fungicide iliyosajiliwa. Fuata maelekezo.',
  },
  {
    id: 'adv-potato-late-blight',
    title: 'Potato late blight — water-soaked lesions after cool, wet spells',
    category: 'disease',
    crops: ['potatoes'],
    regions: ['Nyandarua', 'Nakuru'],
    urgency: 'urgent',
    summary:
      'Dark, water-soaked lesions on leaves that spread quickly after cool, wet weather are a classic sign of late blight, which can also affect tubers.',
    symptoms: ['blight', 'dark', 'lesions', 'spots', 'black', 'rot', 'tubers', 'foliage', 'wet', 'mould', 'brown'],
    field_checks: [
      {
        title: 'Inspect leaves and stems',
        detail: 'Look for dark, water-soaked lesions, often starting at leaf edges or tips.',
      },
      {
        title: 'Check a few tubers',
        detail: 'Lift two or three plants. Look for firm brown rot under the skin.',
      },
    ],
    remediation:
      'Hill soil well over tubers, remove badly affected haulms, and ask your extension officer about a registered fungicide and the spray interval for your variety.',
    caution: 'Do not store tubers that show rot with healthy ones.',
    protocol_ref: 'DEMO-PT-LBL-01',
    sms_en: 'Possible potato late blight: dark water-soaked lesions after cool, wet weather. Hill soil over tubers, remove badly hit haulms, ask your extension officer about a registered fungicide.',
    sms_sw: 'Huenda ni ukungu wa viazi: madoa meusi yenye maji baada ya hali ya baridi na mvua. Panda udongo juu ya viazi, ondoa mashina yaliyoharibika, muulize afisa wa ugani dawa iliyosajiliwa.',
  },
  {
    id: 'adv-coffee-cbd',
    title: 'Coffee berry disease — dark sunken spots on green berries',
    category: 'disease',
    crops: ['coffee'],
    regions: ['Kiambu', 'Nyandarua'],
    urgency: 'advisory',
    summary:
      'Dark, sunken spots on green berries and early berry drop in wet, cool weather are typical signs of coffee berry disease.',
    symptoms: ['berry', 'berries', 'spots', 'sunken', 'dark', 'drop', 'dropping', 'cbd', 'green', 'cherries'],
    field_checks: [
      {
        title: 'Inspect green berries',
        detail: 'Check berries on several branches for dark, sunken spots.',
      },
      {
        title: 'Check the ground under trees',
        detail: 'Count how many green berries have dropped under a few trees.',
      },
    ],
    remediation:
      'Pick up and bury fallen infected berries, prune for airflow, and ask your cooperative or extension officer about the right spray programme for your variety.',
    caution: 'Follow pre-harvest intervals on any product label.',
    protocol_ref: 'DEMO-CF-CBD-01',
    sms_en: 'Possible coffee berry disease: dark sunken spots on green berries, early berry drop. Bury fallen berries, prune for airflow, ask your cooperative for the right spray programme.',
    sms_sw: 'Huenda ni ugonjwa wa matunda ya kahawa: madoa meusi yaliyozama kwenye matunda mabichi, kudondoka mapema. Zika matunda yaliyodondoka, punguza matawi, muulize ushirika ratiba ya kunyunyizia.',
  },
  {
    id: 'adv-dairy-mastitis',
    title: 'Mastitis check — swollen udder or clots in milk',
    category: 'livestock',
    crops: ['dairy cattle'],
    regions: ['Kiambu', 'Nyandarua', 'Nakuru'],
    urgency: 'urgent',
    summary:
      'A hot, swollen or hard udder, clots or watery milk, and a sudden drop in yield can signal mastitis. Early checking protects the cow and the rest of the herd.',
    symptoms: ['mastitis', 'udder', 'swollen', 'clots', 'milk', 'watery', 'hot', 'hard', 'cow', 'teat', 'yield'],
    field_checks: [
      {
        title: 'Check the udder and the first milk',
        detail: 'Feel for heat or hardness and strip a few squirts from each quarter onto a dark surface to look for clots.',
      },
      {
        title: 'Run a California mastitis test (CMT)',
        detail: 'If you have a CMT kit, test each quarter. Record which quarters react.',
      },
    ],
    remediation:
      'Milk the affected cow last, keep her apart, and call your veterinary officer or animal health provider for treatment advice.',
    caution: 'Do not use leftover antibiotics. Milk from treated cows must not be sold until the withdrawal period ends.',
    protocol_ref: 'DEMO-DC-MST-01',
    sms_en: 'Possible mastitis: hot or hard udder, clots or watery milk. Strip each quarter onto a dark surface, milk this cow last, and call your vet for treatment. Do not use leftover antibiotics.',
    sms_sw: 'Huenda ni ugonjwa wa kiwele: kiwele chenye joto au kigumu, maziwa yenye makovu au maji. Kamua kila robo kwenye sehemu nyeusi, kamua ng\'ombe huyu mwisho, na umpigie daktari wa mifugo. Usitumie dawa zilizobaki.',
  },
  {
    id: 'adv-dairy-dry-season-feed',
    title: 'Dairy cattle feed planning for a dry spell',
    category: 'livestock',
    crops: ['dairy cattle'],
    regions: ['Kiambu', 'Nyandarua', 'Nakuru', 'Machakos'],
    urgency: 'routine',
    summary:
      'Milk yield often drops when fodder runs short. Planning silage, hay and water access before the dry spell protects yield and body condition.',
    symptoms: ['feed', 'fodder', 'silage', 'napier', 'dry', 'drought', 'milk drop', 'hay', 'thin', 'yield'],
    field_checks: [
      {
        title: 'Estimate your fodder stock',
        detail: 'Count how many days of silage, hay or napier you have for the herd.',
      },
      {
        title: 'Check water access',
        detail: 'Make sure troughs are clean and cows can drink freely at least twice a day.',
      },
    ],
    remediation:
      'Conserve surplus fodder now, and ask your livestock officer about affordable supplements for your herd size.',
    caution: 'Introduce new feed gradually over several days.',
    protocol_ref: 'DEMO-DC-FEED-02',
    sms_en: 'Dry spell feed plan: count days of silage, hay or napier on hand, keep water clean and available, introduce new feed gradually. Ask your livestock officer about supplements.',
    sms_sw: 'Mpango wa chakula wakati wa kiangazi: hesabu siku za silage, nyasi kavu au napier ulizonazo, weka maji safi, anzisha chakula kipya polepole. Muulize afisa wa mifugo kuhusu virutubisho.',
  },
];

export function toAdvisoryRow(record) {
  const checks = Array.isArray(record.field_checks) ? record.field_checks : [];
  const steps = [
    ...checks.map((check) => ({ title: check.title, detail: check.detail, kind: 'check' })),
    { title: 'Act on the remediation guidance', detail: record.remediation, kind: 'action' },
  ];
  return {
    id: record.id,
    title: record.title,
    category: record.category,
    crops: Array.isArray(record.crops) ? record.crops : [],
    regions: Array.isArray(record.regions) ? record.regions : [],
    urgency: record.urgency,
    summary: record.summary,
    symptoms: Array.isArray(record.symptoms) ? record.symptoms : [],
    fieldChecks: checks,
    steps,
    remediation: record.remediation,
    caution: record.caution,
    protocolRef: record.protocol_ref,
    smsEn: record.sms_en,
    smsSw: record.sms_sw,
    lastUpdated: record.last_updated || DEMO_LAST_UPDATED,
    lastUpdatedLabel: DEMO_LAST_UPDATED_LABEL,
    dataSource: record.data_source || DEMO_DATA_SOURCE,
    isDemoData: record.is_demo_data === undefined ? true : Boolean(record.is_demo_data),
  };
}
