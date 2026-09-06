// Seeds the `sources` collection with a starter knowledge base.
//
// This matters more than it looks. Vitaura's model is instructed never to
// guess from general knowledge — with an empty `sources` collection, every
// single check correctly but uselessly returns "unverified". A demo on an
// unseeded database looks broken.
//
// These entries paraphrase widely-published public-health guidance (WHO, CDC,
// Malaysia's MOH) on the myths that actually circulate on WhatsApp. Treat them
// as a starting point, not a citation of record: swap the URLs and wording for
// the exact source documents you want to stand behind before judging.
//
// Usage:
//   npm run seed:sources          # add any that aren't already present
//   npm run seed:sources -- --reset   # delete all sources first
//
// Safe to re-run: entries are upserted by title.

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { MongoClient } from "mongodb";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  const envPath = join(__dirname, "..", ".env.local");
  if (!existsSync(envPath)) return;
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

const SOURCES = [
  {
    title: "WHO: Vaccines and autism",
    url: "https://www.who.int/news-room/questions-and-answers/item/vaccines-and-immunization-myths-and-misconceptions",
    topicTags: ["vaccines", "children"],
    text: `There is no evidence of any link between vaccines and autism or autistic disorders. The 1998 study that raised the concern was later found to be seriously flawed and was retracted by the journal that published it; the physician who authored it lost his medical licence. Large studies covering millions of children in multiple countries have found no association between the MMR vaccine and autism. Vaccines are among the most rigorously tested medical products, and are monitored for safety continuously after licensing.`,
  },
  {
    title: "WHO: Antibiotics do not work on viral infections",
    url: "https://www.who.int/news-room/fact-sheets/detail/antimicrobial-resistance",
    topicTags: ["antibiotics", "infection"],
    text: `Antibiotics kill bacteria; they have no effect on viruses. Colds, most sore throats, most coughs and influenza are caused by viruses, so antibiotics will not cure them, will not speed recovery, and will not stop them being passed to others. Taking antibiotics when they are not needed drives antimicrobial resistance, which makes bacterial infections harder to treat later. Antibiotics should only be taken when prescribed by a qualified health professional, and the full prescribed course should be completed.`,
  },
  {
    title: "WHO: No food, supplement or home remedy cures cancer",
    url: "https://www.who.int/news-room/fact-sheets/detail/cancer",
    topicTags: ["cancer", "nutrition"],
    text: `No single food, fruit, juice, herb, alkaline diet or supplement has been shown to cure cancer. Claims that a particular food "starves" or "kills" cancer cells are not supported by clinical evidence. Cancer is treated with surgery, radiotherapy, chemotherapy, immunotherapy, hormonal and targeted therapies, chosen according to the type and stage of disease. Abandoning or delaying evidence-based cancer treatment in favour of an unproven alternative is associated with substantially higher risk of death. A balanced diet, physical activity, avoiding tobacco and limiting alcohol reduce cancer risk, but do not treat existing cancer.`,
  },
  {
    title: "CDC: Type 1 diabetes and insulin",
    url: "https://www.cdc.gov/diabetes/about/about-type-1-diabetes.html",
    topicTags: ["diabetes", "medication"],
    text: `People with type 1 diabetes do not produce insulin and require insulin therapy to survive. Insulin is not optional and cannot be replaced by diet, exercise, cinnamon, bitter gourd, herbal preparations or any supplement. Stopping insulin can lead to diabetic ketoacidosis, a life-threatening emergency, within hours to days. Type 2 diabetes can sometimes be managed or put into remission with diet, weight loss and physical activity, but medication changes must always be made with a doctor, never independently.`,
  },
  {
    title: "WHO: Drinking water, hot drinks and gargling do not cure respiratory viruses",
    url: "https://www.who.int/emergencies/diseases/novel-coronavirus-2019/advice-for-public/myth-busters",
    topicTags: ["covid", "infection"],
    text: `Drinking hot water, gargling with salt water or vinegar, drinking warm water every 15 minutes, or holding your breath does not prevent, detect or cure viral respiratory infections including COVID-19. Viruses that have entered the body cannot be flushed into the stomach by drinking water. Staying hydrated is generally good for health, and gargling salt water may temporarily soothe a sore throat, but neither eliminates a viral infection. Methanol, ethanol and bleach are poisonous and must never be consumed or injected under any circumstances.`,
  },
  {
    title: "Malaysia MOH: Dengue prevention and Aedes control",
    url: "https://www.moh.gov.my/index.php/pages/view/2019",
    topicTags: ["dengue", "prevention"],
    text: `Dengue is transmitted by the bite of an infected Aedes mosquito, which breeds in clean stagnant water in and around homes — flower pot trays, discarded containers, roof gutters, air-conditioner trays and water storage vessels. It is not transmitted from person to person by touch, sharing food or coughing. The most effective prevention is removing standing water weekly, using repellent, and wearing covering clothing. Papaya leaf juice, guava juice and crab soup are popular remedies but are not proven treatments for dengue; anyone with high fever, severe abdominal pain, persistent vomiting or bleeding should seek medical care immediately, as severe dengue is a medical emergency.`,
  },
  {
    title: "WHO: Vitamin C does not prevent colds or COVID-19",
    url: "https://www.who.int/news-room/fact-sheets/detail/micronutrients",
    topicTags: ["nutrition", "supplements"],
    text: `Regular vitamin C supplementation does not prevent colds in the general population. Trials show at most a small reduction in how long a cold lasts, and no reduction in how often people catch one. Very high doses do not confer additional benefit and can cause gastrointestinal upset and kidney stones. There is no evidence that vitamin C, zinc or any other supplement prevents or cures COVID-19. Micronutrient supplements are valuable for treating diagnosed deficiencies, which should be identified by a health professional.`,
  },
  {
    title: "WHO: Microwaving food does not make it radioactive or cause cancer",
    url: "https://www.who.int/news-room/questions-and-answers/item/radiation-electromagnetic-fields",
    topicTags: ["nutrition", "radiation"],
    text: `Microwave ovens heat food using non-ionising radiation, which does not have enough energy to alter atoms or make anything radioactive. Food heated in a microwave is not radioactive and does not cause cancer. Microwaving can preserve nutrients better than some longer cooking methods because cooking times are shorter. The genuine safety considerations are practical ones: uneven heating can leave cold spots where bacteria survive, superheated liquids can boil over suddenly, and some plastic containers are not suitable for microwave use.`,
  },
  {
    title: "WHO: Stroke and heart attack warning signs need emergency care",
    url: "https://www.who.int/health-topics/cardiovascular-diseases",
    topicTags: ["stroke", "emergency"],
    text: `Stroke symptoms — sudden face drooping, arm weakness, or slurred speech — and heart attack symptoms — chest pain or pressure, pain spreading to the arm, jaw or back, shortness of breath, cold sweat — require immediate emergency medical care. Widely forwarded advice to prick the fingertips with a needle, make the person cough repeatedly, give them aspirin without medical advice, or wait for symptoms to pass is not supported by evidence and delays the treatment that determines survival and disability. For stroke in particular, treatment is time-critical: call emergency services immediately.`,
  },
  {
    title: "WHO: 5G networks do not spread viruses",
    url: "https://www.who.int/emergencies/diseases/novel-coronavirus-2019/advice-for-public/myth-busters",
    topicTags: ["covid", "radiation"],
    text: `Viruses cannot travel on radio waves or mobile networks. COVID-19 spread widely in many countries that have no 5G network at all. 5G uses non-ionising radio frequencies well below the thresholds set by international exposure guidelines, and there is no established evidence that it damages health or suppresses the immune system. Respiratory viruses spread mainly through droplets and aerosols produced when an infected person coughs, sneezes, speaks or breathes.`,
  },
  {
    title: "WHO: Detox diets and cleanses",
    url: "https://www.who.int/news-room/fact-sheets/detail/healthy-diet",
    topicTags: ["nutrition", "detox"],
    text: `The body removes waste products continuously through the liver, kidneys, lungs, skin and digestive system. Commercial detox teas, juice cleanses, foot pads and colon cleanses have not been shown to remove toxins that these organs do not already handle, and no controlled trial supports their marketed benefits. Extended fasting or laxative-based cleanses can cause dehydration, electrolyte imbalance and, in some cases, serious harm. Sustained health benefits come from a diet high in vegetables, fruit, legumes and whole grains, limited free sugars and salt, and regular physical activity.`,
  },
  {
    title: "WHO: Traditional and complementary medicine alongside conventional care",
    url: "https://www.who.int/health-topics/traditional-complementary-and-integrative-medicine",
    topicTags: ["traditional-medicine", "supplements"],
    text: `Traditional and herbal preparations are widely used and some have genuine pharmacological activity, but "natural" does not mean safe or effective. Herbal products can be toxic in themselves, can be contaminated or adulterated with undeclared pharmaceuticals, and can interact dangerously with prescribed medicines — for example affecting blood thinners, blood pressure medication or chemotherapy. Anyone using a traditional preparation should tell their doctor, and should not stop or substitute a prescribed treatment for it without medical advice.`,
  },
  {
    title: "WHO: Protein, diet and building muscle",
    url: "https://www.who.int/news-room/fact-sheets/detail/healthy-diet",
    topicTags: ["nutrition", "supplements", "exercise"],
    text: `Dietary protein supplies the amino acids the body uses to build and repair muscle, and adequate protein intake alongside resistance exercise supports muscle growth. Protein alone does not build muscle: the stimulus is the training, and protein supports the adaptation. Most people meet their protein needs from ordinary food such as eggs, fish, poultry, dairy, legumes, tofu and nuts. Protein powders and shakes are a convenience, not a requirement, and offer no advantage over the same amount of protein from food. Very high intakes confer no additional muscle benefit. People with kidney disease should not increase protein intake without medical advice.`,
  },
  {
    title: "WHO: Physical activity and health",
    url: "https://www.who.int/news-room/fact-sheets/detail/physical-activity",
    topicTags: ["exercise", "prevention"],
    text: `Adults should do at least 150 to 300 minutes of moderate-intensity aerobic activity per week, or 75 to 150 minutes of vigorous activity, plus muscle-strengthening activity on two or more days a week. Physical inactivity is a leading risk factor for noncommunicable disease and premature death. Some activity is better than none, and benefits begin below the recommended amounts. Exercise does not need to be intense or done in a gym to count, and no supplement, device or passive treatment substitutes for regular activity.`,
  },
  {
    title: "WHO: Tobacco and e-cigarettes (vaping)",
    url: "https://www.who.int/news-room/fact-sheets/detail/tobacco",
    topicTags: ["smoking", "vaping", "cancer"],
    text: `Tobacco kills up to half of its users. There is no safe level of exposure to tobacco smoke, and secondhand smoke causes disease in non-smokers. Electronic cigarettes are not harmless: their aerosols contain nicotine and other toxicants, nicotine is highly addictive and harms adolescent brain development, and evidence that e-cigarettes help people quit smoking is inconclusive. Light, low-tar, herbal and shisha products are not safer alternatives. Waterpipe smoking exposes users to large volumes of smoke over a single session.`,
  },
  {
    title: "WHO: Hypertension (high blood pressure)",
    url: "https://www.who.int/news-room/fact-sheets/detail/hypertension",
    topicTags: ["hypertension", "medication", "prevention"],
    text: `Hypertension usually causes no symptoms, which is why it is called a silent killer and why it must be detected by measurement rather than by how a person feels. Feeling well is not evidence that blood pressure is controlled. Blood pressure medication should not be stopped or skipped because symptoms are absent, as stopping raises the risk of stroke, heart attack and kidney failure. Reducing salt intake, physical activity, avoiding tobacco and limiting alcohol all help, but they complement prescribed treatment rather than replacing it. Garlic, herbal preparations and blood cleansing remedies are not proven treatments for hypertension.`,
  },
  {
    title: "WHO: Mental health and depression",
    url: "https://www.who.int/news-room/fact-sheets/detail/depression",
    topicTags: ["mental-health"],
    text: `Depression is a common medical condition, not a personal weakness, a lack of faith, or something a person can simply decide to stop feeling. It is distinct from ordinary short-lived sadness. Effective treatments exist, including psychological therapy and, for moderate to severe cases, medication. Antidepressants are not addictive in the way that term is normally used, though they should not be stopped abruptly without medical advice. Telling someone to snap out of it is not treatment. Anyone with thoughts of self-harm should seek help urgently from a health professional or a crisis line.`,
  },
  {
    title: "WHO: Antimicrobial resistance and completing treatment",
    url: "https://www.who.int/news-room/fact-sheets/detail/antimicrobial-resistance",
    topicTags: ["antibiotics", "infection"],
    text: `Antibiotics should only be used when prescribed by a qualified health professional, and never shared with others or saved for later use. Leftover antibiotics from a previous illness, or a course belonging to someone else, may be the wrong drug, the wrong dose or the wrong duration. Taking antibiotics that are not needed accelerates antimicrobial resistance, which already causes millions of deaths each year and makes routine infections, surgery and cancer treatment more dangerous. Follow the prescribing clinician instructions about how long to take the course.`,
  },
  {
    title: "WHO: Breastfeeding and infant nutrition",
    url: "https://www.who.int/news-room/fact-sheets/detail/infant-and-young-child-feeding",
    topicTags: ["maternal", "children", "nutrition"],
    text: `WHO recommends exclusive breastfeeding for the first six months of life, with continued breastfeeding alongside appropriate complementary foods up to two years of age or beyond. Exclusive breastfeeding means no other food or drink, not even water, unless medically indicated. Breastfeeding reduces infant infections and mortality and benefits the mother. Honey should never be given to infants under 12 months because of the risk of infant botulism. Claims that particular foods, teas or supplements dramatically increase milk supply are largely unsupported, and concerns about supply should be raised with a health worker.`,
  },
  {
    title: "WHO: Hydration and water intake",
    url: "https://www.who.int/news-room/fact-sheets/detail/healthy-diet",
    topicTags: ["nutrition", "hydration"],
    text: `Water needs vary with body size, activity, climate and health status, and there is no single figure such as eight glasses a day that applies to everyone. Fluid comes from drinks of all kinds and from food. Thirst is a reasonable guide for most healthy adults. Drinking very large volumes of water in a short period is not beneficial and can cause dangerous dilution of blood sodium, known as hyponatraemia. Alkaline, structured and hydrogen-rich waters have not been shown to treat or prevent disease, because the body regulates blood pH tightly regardless of what is drunk.`,
  },
  {
    title: "WHO: Sleep, rest and health",
    url: "https://www.who.int/news-room/fact-sheets/detail/healthy-diet",
    topicTags: ["sleep", "mental-health"],
    text: `Adequate sleep supports immune function, cardiovascular health, metabolic regulation and mental health. Persistently short sleep is associated with increased risk of obesity, diabetes, hypertension and depression. Sleep cannot be reliably caught up in a single long weekend sleep. Sleeping tablets are intended for short-term use under medical supervision and are not a long-term solution for insomnia, for which behavioural approaches are first-line. Alcohol may shorten the time taken to fall asleep but degrades sleep quality later in the night, so it is not a sleep aid.`,
  },
  {
    title: "Malaysia MOH: When to seek urgent medical care",
    url: "https://www.moh.gov.my/",
    topicTags: ["emergency", "traditional-medicine"],
    text: `Symptoms that require immediate medical attention include difficulty breathing, chest pain, severe or persistent abdominal pain, persistent vomiting, bleeding that does not stop, sudden weakness or numbness on one side of the body, difficulty speaking, seizures, high fever with confusion, and reduced consciousness. Delaying hospital care in order to try a home or traditional remedy first is a common and serious cause of preventable harm. Traditional treatment may be used alongside conventional care, but it should be disclosed to the treating doctor and must never replace urgent assessment.`,
  },
];

async function main() {
  loadEnvLocal();

  const reset = process.argv.includes("--reset");

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || "vitaura";
  if (!uri) {
    console.error("MONGODB_URI is not set. Add it to .env.local first.");
    process.exit(1);
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const sources = client.db(dbName).collection("sources");

    if (reset) {
      const { deletedCount } = await sources.deleteMany({});
      console.log(`Deleted ${deletedCount} existing source(s).`);
    }

    let inserted = 0;
    let updated = 0;
    for (const source of SOURCES) {
      const result = await sources.updateOne(
        { title: source.title },
        {
          // Embeddings are deliberately NOT written here: this script has no
          // Gemini key requirement, and embedding 12 sources sequentially
          // would make it slow and rate-limit-prone. The sources land
          // unembedded, and /admin/sources flags them with a one-click
          // "Re-embed all" — which is also the path you need if the embedding
          // dimension ever changes.
          $set: { ...source, addedAt: new Date(), createdBy: "seed" },
          $setOnInsert: { embedding: null },
        },
        { upsert: true }
      );
      if (result.upsertedCount) inserted++;
      else if (result.modifiedCount) updated++;
    }

    console.log(`Seeded sources: ${inserted} added, ${updated} updated.`);
    console.log("");
    console.log("NEXT STEP — these are not searchable yet:");
    console.log("  1. npm run dev");
    console.log("  2. Sign in at /admin/login");
    console.log("  3. Go to /admin/sources and click 'Re-embed all'");
    console.log("");
    console.log("Until then every check will return 'unverified'.");
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("Failed to seed sources:", err.message || err);
  process.exit(1);
});
