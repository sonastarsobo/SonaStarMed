// Study notes for every structure in Learn mode.
// Priority: content a teacher entered in the database > curated notes below > notes generated
// from the structure's name, system and place in the hierarchy (anatomical names are descriptive,
// so "Flexor digitorum longus" decodes to "long muscle that bends the toes").

// ---------- curated notes (key = lower-case name without side) ----------
// o = overview, l = location, f = function, k = key features, c = clinical relevance
const C = {
  skull: { o: "The bony framework of the head, made of the cranium (braincase) and the facial skeleton.", l: "Top of the vertebral column.", f: "Protects the brain and special sense organs, gives attachment to muscles of the face and jaw, and frames the airway and mouth.", k: "22 bones (8 cranial, 14 facial) joined mostly by immovable sutures; the mandible is the only freely movable bone.", c: "Skull fractures, especially at the thin pterion, can tear the middle meningeal artery and cause an extradural haematoma." },
  cranium: { o: "The part of the skull that encloses the brain.", l: "Upper and back part of the skull.", f: "Protects the brain and supports the meninges.", k: "Frontal, parietal (2), temporal (2), occipital, sphenoid and ethmoid bones.", c: "Raised intracranial pressure has nowhere to expand to because the adult cranium is rigid." },
  mandible: { o: "The lower jaw bone, the largest and strongest bone of the face.", l: "Lower face; articulates with the temporal bones at the temporomandibular joints.", f: "Holds the lower teeth and moves for chewing and speech.", k: "Body, ramus, angle, condylar and coronoid processes, mental foramen.", c: "Commonly fractured in two places at once because it forms a ring with the skull base." },
  maxilla: { o: "Paired bone forming the upper jaw.", l: "Middle of the face, between the orbits and the mouth.", f: "Holds the upper teeth, forms the floor of the orbit, the side of the nasal cavity and most of the hard palate.", k: "Contains the maxillary sinus, the largest paranasal sinus.", c: "Upper tooth roots lie close to the maxillary sinus, so dental infection can cause sinusitis." },
  "frontal bone": { o: "The bone of the forehead.", l: "Front of the cranium.", f: "Protects the frontal lobes and forms the roof of the orbits.", k: "Contains the frontal sinuses; meets the parietal bones at the coronal suture.", c: "" },
  "parietal bone": { o: "Paired bone forming the sides and roof of the cranium.", l: "Top and sides of the head.", f: "Protects the parietal lobes of the brain.", k: "Joined by the sagittal suture; the middle meningeal artery grooves its inner surface.", c: "" },
  "occipital bone": { o: "Bone forming the back and base of the cranium.", l: "Back of the head.", f: "Protects the occipital lobes and cerebellum; articulates with the atlas.", k: "Foramen magnum (spinal cord passes through) and occipital condyles.", c: "" },
  "temporal bone": { o: "Paired bone on the side and base of the skull.", l: "Side of the head around the ear.", f: "Houses the middle and inner ear and forms the jaw joint.", k: "Squamous, petrous, tympanic and mastoid parts; zygomatic and styloid processes.", c: "Mastoid infection can spread from the middle ear." },
  sternum: { o: "The flat breastbone in the front of the chest.", l: "Midline of the anterior thoracic wall.", f: "Anchors the clavicles and the costal cartilages of the ribs, protecting the heart.", k: "Manubrium, body and xiphoid process; the sternal angle marks the 2nd rib.", c: "Used for bone-marrow sampling; chest compressions in CPR are applied over its lower half." },
  clavicle: { o: "The collarbone, an S-shaped long bone.", l: "Between the sternum and the acromion of the scapula.", f: "Holds the upper limb away from the trunk and transmits forces from the arm to the axial skeleton.", k: "The only bony attachment between the upper limb and trunk.", c: "One of the most commonly fractured bones, usually at the junction of its middle and lateral thirds." },
  scapula: { o: "The shoulder blade, a flat triangular bone.", l: "Posterior chest wall over ribs 2 to 7.", f: "Connects the humerus to the clavicle and gives attachment to 17 muscles.", k: "Spine, acromion, coracoid process, glenoid cavity.", c: "A 'winged scapula' signals long thoracic nerve injury (serratus anterior paralysis)." },
  humerus: { o: "The long bone of the upper arm.", l: "Between the shoulder and the elbow.", f: "Lever for arm movements; attachment for shoulder and elbow muscles.", k: "Head, surgical neck, greater and lesser tubercles, deltoid tuberosity, epicondyles.", c: "Fractures of the surgical neck risk the axillary nerve; mid-shaft fractures risk the radial nerve." },
  radius: { o: "The lateral (thumb-side) bone of the forearm.", l: "Forearm, from the elbow to the wrist.", f: "Rotates around the ulna to turn the palm up and down; carries most of the load at the wrist.", k: "Head, radial tuberosity, styloid process.", c: "A fall on an outstretched hand commonly causes a distal radius (Colles) fracture." },
  ulna: { o: "The medial (little-finger side) bone of the forearm.", l: "Forearm, from the elbow to the wrist.", f: "Forms the main hinge of the elbow joint with the humerus.", k: "Olecranon, coronoid process, trochlear notch, head and styloid process.", c: "The ulnar nerve runs behind the medial epicondyle, the 'funny bone'." },
  pelvis: { o: "The bony ring formed by the two hip bones, sacrum and coccyx.", l: "Base of the trunk.", f: "Transfers body weight to the legs, protects pelvic organs and anchors the lower limb muscles.", k: "The female pelvis is wider with a rounder inlet to allow childbirth.", c: "Pelvic fractures can bleed heavily into the pelvis." },
  "hip bone": { o: "Large flat bone formed by the fused ilium, ischium and pubis.", l: "Side of the pelvis.", f: "Forms the hip socket (acetabulum) and anchors trunk and thigh muscles.", k: "Iliac crest, acetabulum, obturator foramen, ischial tuberosity.", c: "" },
  femur: { o: "The thigh bone, the longest and strongest bone in the body.", l: "Between the hip and the knee.", f: "Bears body weight and transmits forces from the pelvis to the leg.", k: "Head, neck, greater and lesser trochanters, linea aspera, medial and lateral condyles.", c: "Neck-of-femur fractures in older people can cut the blood supply to the femoral head." },
  patella: { o: "The kneecap, the largest sesamoid bone.", l: "Front of the knee, inside the quadriceps tendon.", f: "Increases the leverage of the quadriceps when straightening the knee.", k: "Its back is covered by the thickest articular cartilage in the body.", c: "Can dislocate laterally, especially in young athletes." },
  tibia: { o: "The shin bone, the main weight-bearing bone of the leg.", l: "Medial side of the leg, knee to ankle.", f: "Carries body weight from the femur to the foot.", k: "Tibial plateau, tibial tuberosity, medial malleolus; its front surface lies just under the skin.", c: "Open fractures are common because the shaft is so superficial." },
  fibula: { o: "The slender lateral bone of the leg.", l: "Lateral side of the leg.", f: "Muscle attachment and stability of the ankle; carries little body weight.", k: "Head, neck, lateral malleolus.", c: "The common fibular nerve wraps around its neck and is easily injured (foot drop)." },
  calcaneus: { o: "The heel bone, the largest tarsal bone.", l: "Back of the foot.", f: "Transmits body weight to the ground and anchors the Achilles tendon.", k: "Calcaneal tuberosity and sustentaculum tali.", c: "Fractured in falls from height onto the feet." },
  talus: { o: "Tarsal bone forming the lower part of the ankle joint.", l: "Between the tibia/fibula above and the calcaneus below.", f: "Transmits body weight from the leg to the foot.", k: "No muscles attach to it; much of its surface is covered in cartilage.", c: "Fractures of its neck can cause avascular necrosis." },
  sacrum: { o: "Triangular bone formed by five fused vertebrae.", l: "Back of the pelvis between the hip bones.", f: "Transmits the weight of the body to the pelvis via the sacroiliac joints.", k: "Sacral promontory, sacral foramina, sacral canal.", c: "" },
  coccyx: { o: "The tailbone, three to five small fused vertebrae.", l: "Lower end of the vertebral column.", f: "Attachment for pelvic floor muscles and ligaments.", k: "", c: "Bruised or fractured in falls onto the bottom (coccydynia)." },
  atlas: { o: "The first cervical vertebra (C1).", l: "Top of the neck, under the skull.", f: "Supports the skull and allows nodding at the atlanto-occipital joint.", k: "Ring-shaped with no body and no spinous process.", c: "" },
  axis: { o: "The second cervical vertebra (C2).", l: "Upper neck.", f: "Its dens forms a pivot on which the atlas and skull rotate (shaking the head).", k: "Dens (odontoid process).", c: "Dens fractures are a serious neck injury." },
  heart: { o: "The muscular pump of the circulatory system.", l: "Middle mediastinum, behind the sternum, tilted to the left.", f: "Pumps deoxygenated blood to the lungs and oxygenated blood around the body.", k: "Four chambers (two atria, two ventricles) and four valves.", c: "Coronary artery disease can cause angina or myocardial infarction." },
  brain: { o: "The control centre of the nervous system.", l: "Inside the cranial cavity.", f: "Processes sensation, controls movement, and underlies thought, memory and emotion.", k: "Cerebrum, cerebellum and brainstem; about 86 billion neurons.", c: "Stroke results from interrupted blood supply to part of the brain." },
  cerebrum: { o: "The largest part of the brain, made of two hemispheres.", l: "Upper cranial cavity.", f: "Higher functions: voluntary movement, sensation, language, reasoning and memory.", k: "Frontal, parietal, temporal and occipital lobes; folded into gyri and sulci.", c: "" },
  cerebellum: { o: "The 'little brain' behind the brainstem.", l: "Posterior cranial fossa, under the occipital lobes.", f: "Coordinates movement, balance and posture.", k: "Two hemispheres joined by the vermis.", c: "Damage causes ataxia: unsteady gait and poor coordination on the same side." },
  brainstem: { o: "The stalk connecting the brain to the spinal cord.", l: "Posterior cranial fossa.", f: "Controls breathing, heart rate and consciousness; carries all tracts between brain and body.", k: "Midbrain, pons and medulla oblongata; nuclei of cranial nerves III to XII.", c: "" },
  "spinal cord": { o: "The long bundle of nervous tissue running down the vertebral canal.", l: "From the foramen magnum to about the L1 to L2 vertebra.", f: "Carries signals between the brain and body and handles spinal reflexes.", k: "31 pairs of spinal nerves; cervical and lumbar enlargements.", c: "Lumbar puncture is done below L2 to avoid the cord." },
  "sciatic nerve": { o: "The largest nerve in the body.", l: "Leaves the pelvis through the greater sciatic foramen and runs down the back of the thigh.", f: "Supplies the hamstrings and, through its tibial and common fibular branches, the leg and foot.", k: "Roots L4 to S3.", c: "Injections are given in the upper outer buttock quadrant to avoid it." },
  "vagus nerve": { o: "Cranial nerve X, the longest cranial nerve.", l: "From the medulla through the neck, thorax and abdomen.", f: "Parasympathetic supply to the heart, lungs and gut; also swallowing and voice.", k: "Its recurrent laryngeal branches supply most laryngeal muscles.", c: "Recurrent laryngeal nerve injury causes hoarseness." },
  "median nerve": { o: "Major nerve of the forearm and hand.", l: "Runs down the arm, through the forearm and the carpal tunnel.", f: "Supplies most forearm flexors and the thenar muscles; sensation to the lateral palm and fingers.", k: "Roots C5 to T1.", c: "Compressed in carpal tunnel syndrome." },
  "ulnar nerve": { o: "Nerve of the medial forearm and most small hand muscles.", l: "Behind the medial epicondyle of the humerus, then the medial forearm.", f: "Fine finger movements and sensation of the little finger.", k: "Roots C8 to T1.", c: "Injury gives a 'claw hand'." },
  "radial nerve": { o: "The main nerve of the back of the arm and forearm.", l: "Spirals around the humerus in the radial groove.", f: "Supplies the extensors of the elbow, wrist and fingers.", k: "Roots C5 to T1.", c: "Mid-shaft humeral fractures can cause wrist drop." },
  "femoral nerve": { o: "Major nerve of the front of the thigh.", l: "Passes under the inguinal ligament lateral to the femoral artery.", f: "Supplies the quadriceps and sensation to the front of the thigh and medial leg.", k: "Roots L2 to L4.", c: "" },
  "phrenic nerve": { o: "The nerve to the diaphragm.", l: "Runs from the neck down through the thorax.", f: "The only motor supply to the diaphragm, essential for breathing.", k: "Roots C3, C4, C5.", c: "Diaphragm irritation refers pain to the shoulder tip." },
  "biceps brachii": { o: "Two-headed muscle on the front of the arm.", l: "Anterior arm.", f: "Flexes the elbow and is the strongest supinator of the forearm.", k: "Long head from the supraglenoid tubercle; short head from the coracoid process; inserts on the radial tuberosity.", c: "Biceps reflex tests C5 to C6." },
  "triceps brachii": { o: "Three-headed muscle on the back of the arm.", l: "Posterior arm.", f: "Main extensor of the elbow.", k: "Long, lateral and medial heads insert on the olecranon.", c: "Triceps reflex tests C7." },
  deltoid: { o: "Triangular muscle that caps the shoulder.", l: "Over the shoulder joint.", f: "Abducts the arm beyond the first 15 degrees; front fibres flex and back fibres extend it.", k: "Supplied by the axillary nerve.", c: "A common site for intramuscular injections." },
  "pectoralis major": { o: "Large fan-shaped chest muscle.", l: "Anterior chest wall.", f: "Adducts and medially rotates the arm and flexes it forwards.", k: "Clavicular and sternocostal heads.", c: "" },
  "latissimus dorsi": { o: "Broad flat muscle of the back.", l: "Lower back, sweeping up to the arm.", f: "Extends, adducts and medially rotates the arm (pulling and climbing).", k: "Supplied by the thoracodorsal nerve.", c: "" },
  trapezius: { o: "Large diamond-shaped muscle of the upper back and neck.", l: "From the skull and spine to the clavicle and scapula.", f: "Elevates, retracts and rotates the scapula.", k: "Supplied by the accessory nerve (CN XI).", c: "Shrugging tests the accessory nerve." },
  diaphragm: { o: "Dome-shaped sheet of muscle separating the thorax from the abdomen.", l: "Base of the thoracic cavity.", f: "The main muscle of breathing: contracting flattens it and draws air into the lungs.", k: "Openings for the inferior vena cava (T8), oesophagus (T10) and aorta (T12).", c: "Hiatus hernia: stomach slides up through the oesophageal opening." },
  "rectus abdominis": { o: "The paired 'six-pack' muscle.", l: "Front of the abdomen either side of the linea alba.", f: "Flexes the trunk and compresses the abdomen.", k: "Divided by tendinous intersections; enclosed in the rectus sheath.", c: "" },
  "gluteus maximus": { o: "The largest muscle in the body.", l: "Buttock.", f: "Extends and laterally rotates the hip (climbing, rising from sitting).", k: "Supplied by the inferior gluteal nerve.", c: "" },
  "gluteus medius": { o: "Fan-shaped muscle of the side of the hip.", l: "Outer surface of the ilium, under gluteus maximus.", f: "Abducts the hip and keeps the pelvis level when standing on one leg.", k: "Supplied by the superior gluteal nerve.", c: "Weakness gives a positive Trendelenburg sign." },
  sartorius: { o: "The longest muscle in the body.", l: "Runs diagonally across the front of the thigh.", f: "Flexes, abducts and laterally rotates the hip and flexes the knee (cross-legged sitting).", k: "", c: "" },
  "rectus femoris": { o: "Part of the quadriceps that crosses both hip and knee.", l: "Front of the thigh.", f: "Extends the knee and flexes the hip.", k: "Supplied by the femoral nerve.", c: "" },
  gastrocnemius: { o: "The superficial two-headed calf muscle.", l: "Back of the leg.", f: "Plantarflexes the ankle and helps flex the knee.", k: "Joins soleus to form the Achilles tendon.", c: "" },
  soleus: { o: "Broad flat calf muscle under the gastrocnemius.", l: "Back of the leg.", f: "Plantarflexes the ankle; key for standing posture.", k: "Its veins act as a 'muscle pump' returning blood to the heart.", c: "Deep vein thrombosis often starts in soleal veins." },
  masseter: { o: "Powerful chewing muscle.", l: "Side of the face over the ramus of the mandible.", f: "Elevates the mandible to close the jaw.", k: "Supplied by the trigeminal nerve (V3).", c: "" },
  "temporalis": { o: "Fan-shaped chewing muscle.", l: "Temporal fossa on the side of the head.", f: "Elevates and retracts the mandible.", k: "", c: "" },
  "sternocleidomastoid": { o: "Prominent strap muscle of the neck.", l: "From the sternum and clavicle to the mastoid process.", f: "Turns the head to the opposite side and flexes the neck.", k: "Divides the neck into anterior and posterior triangles.", c: "Shortening causes torticollis (wry neck)." },
  "achilles tendon": { o: "The calcaneal tendon, the strongest tendon in the body.", l: "Back of the ankle.", f: "Transmits the pull of the calf muscles to the heel.", k: "", c: "Can rupture during sudden push-off in sport." },
  lung: { o: "Paired organs of respiration.", l: "Thoracic cavity either side of the heart.", f: "Exchange oxygen and carbon dioxide between air and blood.", k: "Right lung has 3 lobes, left has 2 with a cardiac notch.", c: "" },
  liver: { o: "The largest internal organ and gland.", l: "Right upper abdomen under the diaphragm.", f: "Metabolism, bile production, detoxification and protein synthesis.", k: "Dual blood supply from the hepatic artery and portal vein.", c: "" },
  kidney: { o: "Paired bean-shaped organs.", l: "Posterior abdominal wall, T12 to L3.", f: "Filter blood to make urine and regulate fluids, electrolytes and blood pressure.", k: "About one million nephrons each.", c: "" },
  stomach: { o: "Muscular J-shaped sac of the digestive tract.", l: "Left upper abdomen.", f: "Stores and churns food and begins protein digestion with acid and pepsin.", k: "Cardia, fundus, body, pylorus.", c: "" },
  aorta: { o: "The main artery of the body.", l: "From the left ventricle, arching over the heart and down the trunk.", f: "Carries oxygenated blood to the whole body.", k: "Ascending aorta, arch, descending thoracic and abdominal parts.", c: "Aneurysm of the abdominal aorta can rupture." },
};

// ---------- name decoding ----------
const ACTIONS = [
  [/\bflexor\b/, "bends (flexes)"],
  [/\bextensor\b/, "straightens (extends)"],
  [/\babductor\b/, "moves away from the midline (abducts)"],
  [/\badductor\b/, "pulls towards the midline (adducts)"],
  [/\blevator\b/, "raises (elevates)"],
  [/\bdepressor\b/, "lowers (depresses)"],
  [/\bpronator\b/, "turns the palm down (pronates)"],
  [/\bsupinator\b/, "turns the palm up (supinates)"],
  [/\brotator|rotatores\b/, "rotates"],
  [/\btensor\b/, "tenses"],
  [/\bsphincter\b/, "closes around an opening"],
  [/\bopponens\b/, "brings across the palm to oppose"],
  [/\bconstrictor\b/, "narrows"],
  [/\bdilator\b/, "widens"],
];
const PLACES = [
  [/digitorum|digiti/, "the fingers or toes"],
  [/pollicis/, "the thumb"],
  [/hallucis/, "the big toe"],
  [/carpi/, "the wrist"],
  [/femoris/, "the thigh"],
  [/brachii|brachialis/, "the arm"],
  [/antebrachii/, "the forearm"],
  [/oculi|orbital/, "the eye"],
  [/oris|labii/, "the mouth and lips"],
  [/palpebrae/, "the eyelid"],
  [/capitis/, "the head"],
  [/cervicis|colli/, "the neck"],
  [/thoracis/, "the thorax"],
  [/lumborum/, "the lower back"],
  [/abdominis/, "the abdomen"],
  [/scapulae/, "the scapula"],
  [/anguli oris/, "the corner of the mouth"],
  [/nasi|nasal/, "the nose"],
  [/veli palatini|palat/, "the soft palate"],
  [/pharyn/, "the pharynx"],
  [/laryn|thyro|crico|arytenoid/, "the larynx"],
  [/glott/, "the vocal folds"],
  [/tympani/, "the eardrum"],
  [/plantar/, "the sole of the foot"],
  [/palmar/, "the palm"],
  [/dorsi\b|dorsal/, "the back"],
];
const SIZE = [
  [/\bmagnus\b|\bmaximus\b/, "largest"],
  [/\bmajor\b/, "larger"],
  [/\bminor\b|\bminimus\b/, "smaller"],
  [/\blongus\b|\blongissimus\b/, "long"],
  [/\bbrevis\b/, "short"],
  [/\blatissimus\b/, "widest"],
  [/\bprofundus\b/, "deep"],
  [/\bsuperficialis\b/, "superficial"],
  [/\bmedius\b/, "middle-sized"],
];
const POSITION = [
  [/\banterior\b/, "front"],
  [/\bposterior\b/, "back"],
  [/\bsuperior\b/, "upper"],
  [/\binferior\b/, "lower"],
  [/\blateral(is)?\b/, "outer"],
  [/\bmedial(is)?\b/, "inner"],
  [/\binternus|internal\b/, "internal"],
  [/\bexternus|external\b/, "external"],
];
const SHAPE = [
  [/deltoid/, "triangular"],
  [/trapezi/, "trapezium-shaped"],
  [/rhomboid/, "rhomboid (diamond-shaped)"],
  [/serrat/, "saw-toothed"],
  [/teres/, "round"],
  [/quadrat/, "square"],
  [/orbicular/, "ring-shaped"],
  [/biceps/, "two-headed"],
  [/triceps/, "three-headed"],
  [/quadriceps/, "four-headed"],
  [/lumbrical/, "worm-like"],
  [/piriform/, "pear-shaped"],
  [/gracilis/, "slender"],
  [/rectus/, "straight"],
  [/obliqu/, "oblique (slanting)"],
  [/transvers/, "transverse"],
];
const pick = (n, list) => list.filter(([re]) => re.test(n)).map(([, v]) => v);
const an = (w) => (/^[aeiou]/i.test(w) ? "an " : "a ") + w;

// Strips left/right markers: "Femur L", "Left femur", "femur.r", "Biceps brachii (right)"
export function splitSide(name) {
  let side = "";
  const n = String(name || "")
    .replace(/[_.]/g, " ")
    .replace(/\(?\b(left|right|l|r|lt|rt|sin|dex)\b\)?/gi, (m, w) => {
      const x = w.toLowerCase();
      side = /^(left|l|lt|sin)$/.test(x) ? "left" : "right";
      return " ";
    })
    .replace(/\s+/g, " ")
    .trim();
  return { base: n || String(name || ""), side };
}

function curatedFor(base) {
  const k = base.toLowerCase();
  if (C[k]) return C[k];
  // longest curated key contained in the name ("Shaft of femur" -> femur)
  let best = null;
  for (const key of Object.keys(C))
    if (new RegExp(`\\b${key}\\b`).test(k) && (!best || key.length > best.length)) best = key;
  return best ? { ...C[best], partOf: best } : null;
}

function kindOf(n, sys) {
  if (/tendon|aponeuros/.test(n)) return "tendon";
  if (/ligament|retinacul/.test(n)) return "ligament";
  if (/cartilage|meniscus|disc\b/.test(n)) return "cartilage";
  if (/incisor|canine|premolar|molar|tooth|teeth/.test(n)) return "tooth";
  if (/nerve|ramus|rami|plexus|ganglion|cauda equina|root of|fibres/.test(n)) return "nerve";
  if (/artery|arteries|aorta/.test(n)) return "artery";
  if (/vein|venous|sinus\b/.test(n)) return "vein";
  if (/vertebra|\b[ctl]\d{1,2}\b/.test(n)) return "vertebra";
  if (/\brib\b|costal/.test(n)) return "rib";
  if (/phalan/.test(n)) return "phalanx";
  if (/metacarp|metatars/.test(n)) return "metabone";
  if (/scaphoid|lunate|triquetr|pisiform|trapezium|trapezoid|capitate|hamate/.test(n)) return "carpal";
  if (/cuboid|navicular|cuneiform/.test(n)) return "tarsal";
  if (/muscle|\b(m|mm)\b/.test(n) || /muscul/.test(sys)) return "muscle";
  if (/skelet|bone/.test(sys) || /bone|process|condyle|fossa|foramen|tubercle|crest/.test(n)) return "bone";
  if (/nerv/.test(sys)) return "nerve";
  if (/circul|cardio|vascul/.test(sys)) return "vessel";
  return "structure";
}

const GENERIC = {
  tendon: { f: "Connects muscle to bone and transmits the muscle's pull to move a joint.", k: "Dense regular connective tissue made of parallel collagen fibres; tough but with a poor blood supply.", c: "Tendons heal slowly; overuse causes tendinopathy." },
  ligament: { f: "Connects bone to bone and stabilises a joint, limiting unwanted movement.", k: "Dense collagen bands with a little elastic tissue.", c: "Over-stretching causes a sprain." },
  cartilage: { f: "Provides a smooth, shock-absorbing or flexible support surface.", k: "Avascular tissue: hyaline (joints, ribs), fibrocartilage (discs, menisci) or elastic (ear).", c: "Heals poorly because it has no blood supply." },
  tooth: { f: "Bites and grinds food as the first step of digestion.", k: "Enamel crown, dentine, pulp cavity with nerves and vessels; rooted in the jaw by the periodontal ligament.", c: "Tooth decay begins when acid from plaque bacteria dissolves enamel." },
  nerve: { f: "Carries electrical signals between the central nervous system and the body: motor commands out and sensations in.", k: "Bundles of axons wrapped in endoneurium, perineurium and epineurium.", c: "Damage can cause weakness, numbness or tingling in the area it supplies." },
  artery: { f: "Carries blood away from the heart under high pressure.", k: "Thick muscular and elastic wall (tunica intima, media, adventitia).", c: "Narrowing by atherosclerosis reduces blood flow to the tissue it supplies." },
  vein: { f: "Returns blood towards the heart under low pressure.", k: "Thinner wall than arteries; limb veins have valves to stop backflow.", c: "Valve failure leads to varicose veins." },
  vessel: { f: "Part of the circulatory system that moves blood through the body.", k: "", c: "" },
  vertebra: { f: "One of the stacked bones of the spine: protects the spinal cord, supports the body and allows the trunk to move.", k: "Body, vertebral arch, spinous and transverse processes, vertebral foramen.", c: "Intervertebral disc herniation between vertebrae can compress nerve roots." },
  rib: { f: "Protects the thoracic organs and moves during breathing.", k: "Ribs 1 to 7 are true ribs, 8 to 10 false ribs and 11 to 12 floating ribs.", c: "Rib fractures can injure the lung (pneumothorax)." },
  phalanx: { f: "One of the small long bones of the fingers or toes that make up the digits.", k: "Each digit has proximal, middle and distal phalanges (the thumb and big toe have no middle phalanx).", c: "" },
  metabone: { f: "Forms the framework of the palm (metacarpals) or the sole (metatarsals) and links the wrist or ankle to the digits.", k: "Five per hand or foot, numbered from the thumb or big toe.", c: "A 'boxer's fracture' is a break of the 5th metacarpal neck." },
  carpal: { f: "One of the eight small wrist bones that let the wrist bend and glide.", k: "Arranged in a proximal and a distal row.", c: "The scaphoid is the most commonly fractured carpal bone." },
  tarsal: { f: "One of the seven ankle and foot bones that form the arches and transmit body weight.", k: "", c: "" },
  muscle: { f: "Contracts to produce movement, maintain posture and generate heat.", k: "Skeletal muscle is striated and under voluntary control.", c: "" },
  bone: { f: "Supports the body, protects organs, anchors muscles, stores minerals and houses bone marrow.", k: "Compact bone outside, spongy bone inside, covered by periosteum.", c: "" },
  structure: { f: "", k: "", c: "" },
};

// row: { name }, ctx: { system, parent, children: [names] }
export function contentFor(row, ctx = {}) {
  const { base, side } = splitSide(row.name);
  const n = base.toLowerCase();
  const sys = String(ctx.system || "").toLowerCase();
  const kind = kindOf(n, sys);
  const cur = curatedFor(base);
  const g = GENERIC[kind] || GENERIC.structure;

  // Decoded meaning for muscles / named parts
  const acts = pick(n, ACTIONS),
    places = pick(n, PLACES),
    size = pick(n, SIZE),
    pos = pick(n, POSITION),
    shape = pick(n, SHAPE);
  let decoded = "";
  if (acts.length || places.length || size.length || shape.length || pos.length) {
    const bits = [];
    if (shape.length) bits.push(shape.join(", "));
    if (size.length) bits.push(size.join(", "));
    if (pos.length) bits.push(pos.join(", "));
    const what = kind === "muscle" || acts.length ? "muscle" : kind;
    decoded = `The name describes ${an(`${bits.length ? bits.join(", ") + " " : ""}${what}`)}${acts.length ? ` that ${acts.join(" and ")}${places.length ? " " + places.join(" and ") : ""}` : places.length ? ` of ${places.join(" and ")}` : ""}.`;
  }

  const sideTxt = side ? `This is the ${side}-side ${base}; a mirror-image partner sits on the other side of the body. ` : "";
  const parentTxt = ctx.parent ? ` It is part of the ${ctx.parent}.` : "";
  const sysTxt = ctx.system ? `${ctx.system} system` : "body";

  const overview =
    cur?.o && !cur.partOf
      ? cur.o
      : cur?.partOf
        ? `A part of the ${cur.partOf}. ${cur.o}`
        : `The ${base} is ${an(kind === "metabone" || kind === "carpal" || kind === "tarsal" || kind === "phalanx" ? "bone" : kind)} of the ${sysTxt}.${parentTxt}`;

  return {
    generated: !cur || !!cur.partOf,
    overview: sideTxt + overview,
    location: cur?.l || (ctx.parent ? `Found within the ${ctx.parent}${side ? ` on the ${side} side` : ""}.` : side ? `On the ${side} side of the body.` : ""),
    function: cur?.f || (acts.length ? `As its name says, it ${acts.join(" and ")}${places.length ? " " + places.join(" and ") : ""}. ${g.f}` : g.f),
    features: [cur?.k || g.k, decoded].filter(Boolean).join(" "),
    clinical: cur?.c || g.c,
    children: ctx.children || [],
  };
}
