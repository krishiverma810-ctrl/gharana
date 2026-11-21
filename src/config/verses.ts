// Bhagavad Gita — daily verses. Sanskrit + IAST transliteration + plain English + how it applies to Krishi's life.
// English renderings are written fresh for GHARANA (the Sanskrit text is public domain).
// Phase 1 ships 26; the full 60+ set arrives in a later phase (and you can add your own in Settings).

export interface Verse {
  ref: string
  sanskrit: string
  translit: string
  english: string
  apply: string
}

export const VERSES: Verse[] = [
  {
    ref: '2.47',
    sanskrit: 'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन ।\nमा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि ॥',
    translit: 'karmaṇy evādhikāras te mā phaleṣu kadācana\nmā karma-phala-hetur bhūr mā te saṅgo ’stv akarmaṇi',
    english: 'Your right is to the work alone, never to its fruits. Do not let results be your motive, and do not cling to doing nothing.',
    apply: 'Do the reps, the study block, the post. The views, the GPA and the gains are not yours to control today — the work is.',
  },
  {
    ref: '2.14',
    sanskrit: 'मात्रास्पर्शास्तु कौन्तेय शीतोष्णसुखदुःखदाः ।\nआगमापायिनोऽनित्यास्तांस्तितिक्षस्व भारत ॥',
    translit: 'mātrā-sparśās tu kaunteya śītoṣṇa-sukha-duḥkha-dāḥ\nāgamāpāyino ’nityās tāṁs titikṣasva bhārata',
    english: 'Cold and heat, pleasure and pain come from contact with the senses. They come and go; they do not last. Endure them.',
    apply: 'The 7am alarm, the sore shoulders, the boring lecture — temporary. Sit through the discomfort; it passes, the result stays.',
  },
  {
    ref: '2.48',
    sanskrit: 'योगस्थः कुरु कर्माणि सङ्गं त्यक्त्वा धनञ्जय ।\nसिद्ध्यसिद्ध्योः समो भूत्वा समत्वं योग उच्यते ॥',
    translit: 'yoga-sthaḥ kuru karmāṇi saṅgaṁ tyaktvā dhanañjaya\nsiddhy-asiddhyoḥ samo bhūtvā samatvaṁ yoga ucyate',
    english: 'Steady in yoga, act without clinging. Stay even in success and failure — that evenness is called yoga.',
    apply: 'A great day and a flat day get the same response from you: show up tomorrow. No spiral, no ego trip.',
  },
  {
    ref: '2.50',
    sanskrit: 'बुद्धियुक्तो जहातीह उभे सुकृतदुष्कृते ।\nतस्माद्योगाय युज्यस्व योगः कर्मसु कौशलम् ॥',
    translit: 'buddhi-yukto jahātīha ubhe sukṛta-duṣkṛte\ntasmād yogāya yujyasva yogaḥ karmasu kauśalam',
    english: 'One united with wisdom lets go of both good and bad deeds here. So commit to yoga: yoga is skill in action.',
    apply: 'Skill in action — do the thing properly. Clean form on the bag, clean lines on the poster, clean notes on renal.',
  },
  {
    ref: '2.20',
    sanskrit: 'न जायते म्रियते वा कदाचिन्नायं भूत्वा भविता वा न भूयः ।\nअजो नित्यः शाश्वतोऽयं पुराणो न हन्यते हन्यमाने शरीरे ॥',
    translit: 'na jāyate mriyate vā kadācin nāyaṁ bhūtvā bhavitā vā na bhūyaḥ\najo nityaḥ śāśvato ’yaṁ purāṇo na hanyate hanyamāne śarīre',
    english: 'The self is never born and never dies. Unborn, eternal, ancient — it is not destroyed when the body is.',
    apply: 'Your worth isn’t a bad mark or a quiet week on TikTok. The core of you is steady — build on it.',
  },
  {
    ref: '2.62',
    sanskrit: 'ध्यायतो विषयान्पुंसः सङ्गस्तेषूपजायते ।\nसङ्गात्सञ्जायते कामः कामात्क्रोधोऽभिजायते ॥',
    translit: 'dhyāyato viṣayān puṁsaḥ saṅgas teṣūpajāyate\nsaṅgāt sañjāyate kāmaḥ kāmāt krodho ’bhijāyate',
    english: 'Dwelling on sense objects breeds attachment; attachment breeds desire; from desire comes anger.',
    apply: 'Three more reels becomes an hour becomes a wasted night. Catch the first scroll, not the fortieth.',
  },
  {
    ref: '2.63',
    sanskrit: 'क्रोधाद्भवति सम्मोहः सम्मोहात्स्मृतिविभ्रमः ।\nस्मृतिभ्रंशाद्बुद्धिनाशो बुद्धिनाशात्प्रणश्यति ॥',
    translit: 'krodhād bhavati sammohaḥ sammohāt smṛti-vibhramaḥ\nsmṛti-bhraṁśād buddhi-nāśo buddhi-nāśāt praṇaśyati',
    english: 'Anger brings delusion; delusion clouds memory; lost memory ruins judgement; and with judgement gone, one falls.',
    apply: 'When you’re heated, don’t text, don’t decide, don’t post. Walk, breathe, then act.',
  },
  {
    ref: '3.8',
    sanskrit: 'नियतं कुरु कर्म त्वं कर्म ज्यायो ह्यकर्मणः ।\nशरीरयात्रापि च ते न प्रसिद्ध्येदकर्मणः ॥',
    translit: 'niyataṁ kuru karma tvaṁ karma jyāyo hy akarmaṇaḥ\nśarīra-yātrāpi ca te na prasiddhyed akarmaṇaḥ',
    english: 'Do your prescribed work — action is better than inaction. Without action, even your body could not be sustained.',
    apply: 'Bummy mode ends with one action. Not a plan — a rep. Do the first block on the Blueprint now.',
  },
  {
    ref: '3.21',
    sanskrit: 'यद्यदाचरति श्रेष्ठस्तत्तदेवेतरो जनः ।\nस यत्प्रमाणं कुरुते लोकस्तदनुवर्तते ॥',
    translit: 'yad yad ācarati śreṣṭhas tat tad evetaro janaḥ\nsa yat pramāṇaṁ kurute lokas tad anuvartate',
    english: 'Whatever a great person does, others follow. Whatever standard they set, the world goes by.',
    apply: 'Your brother, Sidak, the boys — they copy your standard. Be the man you needed at 14.',
  },
  {
    ref: '3.35',
    sanskrit: 'श्रेयान्स्वधर्मो विगुणः परधर्मात्स्वनुष्ठितात् ।\nस्वधर्मे निधनं श्रेयः परधर्मो भयावहः ॥',
    translit: 'śreyān sva-dharmo viguṇaḥ para-dharmāt sv-anuṣṭhitāt\nsva-dharme nidhanaṁ śreyaḥ para-dharmo bhayāvahaḥ',
    english: 'Better your own path done imperfectly than another’s done well. Another’s path is full of fear.',
    apply: 'Stop comparing your chapter 2 to someone’s chapter 20. Your lane: dentistry, NAZARA, the house you’re building.',
  },
  {
    ref: '6.5',
    sanskrit: 'उद्धरेदात्मनात्मानं नात्मानमवसादयेत् ।\nआत्मैव ह्यात्मनो बन्धुरात्मैव रिपुरात्मनः ॥',
    translit: 'uddhared ātmanātmānaṁ nātmānam avasādayet\nātmaiva hy ātmano bandhur ātmaiva ripur ātmanaḥ',
    english: 'Lift yourself by yourself; do not let yourself sink. You are your own friend, and you are your own enemy.',
    apply: 'Nobody is coming to drag you out of bed. Be your own best mate today, not your own worst enemy.',
  },
  {
    ref: '6.6',
    sanskrit: 'बन्धुरात्मात्मनस्तस्य येनात्मैवात्मना जितः ।\nअनात्मनस्तु शत्रुत्वे वर्तेतात्मैव शत्रुवत् ॥',
    translit: 'bandhur ātmātmanas tasya yenātmaivātmanā jitaḥ\nanātmanas tu śatrutve vartetātmaiva śatru-vat',
    english: 'For one who has conquered himself, the self is a friend. For one who has not, the self acts like an enemy.',
    apply: 'Win the small fights — phone down, out of bed, one more round — and your mind starts working for you.',
  },
  {
    ref: '6.16',
    sanskrit: 'नात्यश्नतस्तु योगोऽस्ति न चैकान्तमनश्नतः ।\nन चातिस्वप्नशीलस्य जाग्रतो नैव चार्जुन ॥',
    translit: 'nātyaśnatas tu yogo ’sti na caikāntam anaśnataḥ\nna cāti-svapna-śīlasya jāgrato naiva cārjuna',
    english: 'Yoga is not for one who eats too much or too little, nor for one who sleeps too much or too little.',
    apply: 'The 10am wake-ups are oversleeping, the 3am nights are undersleeping. Find the middle: consistent bed, consistent rise.',
  },
  {
    ref: '6.17',
    sanskrit: 'युक्ताहारविहारस्य युक्तचेष्टस्य कर्मसु ।\nयुक्तस्वप्नावबोधस्य योगो भवति दुःखहा ॥',
    translit: 'yuktāhāra-vihārasya yukta-ceṣṭasya karmasu\nyukta-svapnāvabodhasya yogo bhavati duḥkha-hā',
    english: 'For one balanced in eating and recreation, balanced in effort, balanced in sleep and waking, yoga ends sorrow.',
    apply: 'Protein, training, study, sleep — balance them and half your bad moods disappear on their own.',
  },
  {
    ref: '6.26',
    sanskrit: 'यतो यतो निश्चरति मनश्चञ्चलमस्थिरम् ।\nततस्ततो नियम्यैतदात्मन्येव वशं नयेत् ॥',
    translit: 'yato yato niścarati manaś cañcalam asthiram\ntatas tato niyamyaitad ātmany eva vaśaṁ nayet',
    english: 'Wherever the restless, unsteady mind wanders, bring it back and settle it in the self.',
    apply: 'Mind drifts mid-study? Normal. The skill is the return. Every time you notice, come back — that’s the rep.',
  },
  {
    ref: '6.35',
    sanskrit: 'असंशयं महाबाहो मनो दुर्निग्रहं चलम् ।\nअभ्यासेन तु कौन्तेय वैराग्येण च गृह्यते ॥',
    translit: 'asaṁśayaṁ mahā-bāho mano durnigrahaṁ calam\nabhyāsena tu kaunteya vairāgyeṇa ca gṛhyate',
    english: 'No doubt the mind is restless and hard to hold. But it is held by practice and by detachment.',
    apply: 'Discipline isn’t a personality trait you lack — it’s practice. Streaks are literally abhyāsa.',
  },
  {
    ref: '4.7',
    sanskrit: 'यदा यदा हि धर्मस्य ग्लानिर्भवति भारत ।\nअभ्युत्थानमधर्मस्य तदात्मानं सृजाम्यहम् ॥',
    translit: 'yadā yadā hi dharmasya glānir bhavati bhārata\nabhyutthānam adharmasya tadātmānaṁ sṛjāmy aham',
    english: 'Whenever righteousness declines and its opposite rises, I bring myself forth.',
    apply: 'When your standards slip, that’s the signal to rise — not to give up. Reset today.',
  },
  {
    ref: '4.38',
    sanskrit: 'न हि ज्ञानेन सदृशं पवित्रमिह विद्यते ।\nतत्स्वयं योगसंसिद्धः कालेनात्मनि विन्दति ॥',
    translit: 'na hi jñānena sadṛśaṁ pavitram iha vidyate\ntat svayaṁ yoga-saṁsiddhaḥ kālenātmani vindati',
    english: 'Nothing in this world purifies like knowledge. One perfected in practice finds it within, in time.',
    apply: 'Every hour of physiology is an investment that compounds. In time it becomes part of you — DDS-level.',
  },
  {
    ref: '4.39',
    sanskrit: 'श्रद्धावाँल्लभते ज्ञानं तत्परः संयतेन्द्रियः ।\nज्ञानं लब्ध्वा परां शान्तिमचिरेणाधिगच्छति ॥',
    translit: 'śraddhāvāl labhate jñānaṁ tat-paraḥ saṁyatendriyaḥ\njñānaṁ labdhvā parāṁ śāntim acireṇādhigacchati',
    english: 'One with faith, devoted and with senses in check, gains knowledge — and with it, soon, the highest peace.',
    apply: 'Commit, focus, cut distractions. Peace comes from mastery, not from avoiding the hard thing.',
  },
  {
    ref: '2.3',
    sanskrit: 'क्लैब्यं मा स्म गमः पार्थ नैतत्त्वय्युपपद्यते ।\nक्षुद्रं हृदयदौर्बल्यं त्यक्त्वोत्तिष्ठ परन्तप ॥',
    translit: 'klaibyaṁ mā sma gamaḥ pārtha naitat tvayy upapadyate\nkṣudraṁ hṛdaya-daurbalyaṁ tyaktvottiṣṭha parantapa',
    english: 'Do not give in to weakness — it does not suit you. Cast off this petty faint-heartedness and stand up.',
    apply: 'Krishna’s first real instruction: get up. Literally. Feet on the floor, now.',
  },
  {
    ref: '2.56',
    sanskrit: 'दुःखेष्वनुद्विग्नमनाः सुखेषु विगतस्पृहः ।\nवीतरागभयक्रोधः स्थितधीर्मुनिरुच्यते ॥',
    translit: 'duḥkheṣv anudvigna-manāḥ sukheṣu vigata-spṛhaḥ\nvīta-rāga-bhaya-krodhaḥ sthita-dhīr munir ucyate',
    english: 'Undisturbed in sorrow, free of craving in joy, beyond attachment, fear and anger — that one is steady in wisdom.',
    apply: 'Be the calm one in the group chat, at the wedding, under pressure in an exam. Steady is magnetic.',
  },
  {
    ref: '3.19',
    sanskrit: 'तस्मादसक्तः सततं कार्यं कर्म समाचर ।\nअसक्तो ह्याचरन्कर्म परमाप्नोति पूरुषः ॥',
    translit: 'tasmād asaktaḥ satataṁ kāryaṁ karma samācara\nasakto hy ācaran karma param āpnoti pūruṣaḥ',
    english: 'So always do the work that must be done, without attachment. By working without attachment, one reaches the highest.',
    apply: 'Post the video even if it flops. Ship the NAZARA drop. Attachment to perfect is just fear dressed up.',
  },
  {
    ref: '18.48',
    sanskrit: 'सहजं कर्म कौन्तेय सदोषमपि न त्यजेत् ।\nसर्वारम्भा हि दोषेण धूमेनाग्निरिवावृताः ॥',
    translit: 'saha-jaṁ karma kaunteya sa-doṣam api na tyajet\nsarvārambhā hi doṣeṇa dhūmenāgnir ivāvṛtāḥ',
    english: 'Do not abandon the work that is yours, even if it has flaws. Every undertaking is clouded by some fault, as fire by smoke.',
    apply: 'Every start is messy — first boxing class, first TikTok, first poster. Smoke means there’s fire. Keep going.',
  },
  {
    ref: '2.27',
    sanskrit: 'जातस्य हि ध्रुवो मृत्युर्ध्रुवं जन्म मृतस्य च ।\nतस्मादपरिहार्येऽर्थे न त्वं शोचितुमर्हसि ॥',
    translit: 'jātasya hi dhruvo mṛtyur dhruvaṁ janma mṛtasya ca\ntasmād aparihārye ’rthe na tvaṁ śocitum arhasi',
    english: 'For the born, death is certain; for the dead, birth is certain. Do not grieve over what cannot be avoided.',
    apply: 'Some things are out of your hands. Grieve them, then put your energy into what you can still move.',
  },
  {
    ref: '18.66',
    sanskrit: 'सर्वधर्मान्परित्यज्य मामेकं शरणं व्रज ।\nअहं त्वां सर्वपापेभ्यो मोक्षयिष्यामि मा शुचः ॥',
    translit: 'sarva-dharmān parityajya mām ekaṁ śaraṇaṁ vraja\nahaṁ tvāṁ sarva-pāpebhyo mokṣayiṣyāmi mā śucaḥ',
    english: 'Let go of every other duty and take refuge in me alone. I will free you from all wrongs — do not fear.',
    apply: 'When it all feels like too much, simplify. One anchor, one next step. You don’t have to carry everything at once.',
  },
  {
    ref: '18.78',
    sanskrit: 'यत्र योगेश्वरः कृष्णो यत्र पार्थो धनुर्धरः ।\nतत्र श्रीर्विजयो भूतिर्ध्रुवा नीतिर्मतिर्मम ॥',
    translit: 'yatra yogeśvaraḥ kṛṣṇo yatra pārtho dhanur-dharaḥ\ntatra śrīr vijayo bhūtir dhruvā nītir matir mama',
    english: 'Where there is Krishna, master of yoga, and Arjuna, the archer — there will be fortune, victory, prosperity and sound policy.',
    apply: 'Wisdom plus action. Knowing and doing together. That’s where the wins live — that’s the whole house.',
  },
]
