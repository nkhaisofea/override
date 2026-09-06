// Result-page copy in the four languages Vitaura supports, plus the single
// source of truth for which languages exist at all.
//
// Only the AI-written parts of a result (the extracted claim and the
// explanation) need a model call to translate. Everything else — labels,
// buttons, the risk rationale — is a fixed set of strings, so it's translated
// here for free. That matters more than it sounds: the free Gemini tier allows
// 20 generations a day, and spending one of them re-rendering the word
// "Source" would be indefensible.

export const LANGUAGES = [
  { code: "ms", label: "Bahasa Melayu", short: "BM" },
  { code: "en", label: "English", short: "EN" },
  { code: "zh", label: "中文", short: "中文" },
  { code: "ta", label: "தமிழ்", short: "தமிழ்" },
];

// Full names as the model should be told them. Kept beside the list so adding
// a language is one edit here rather than four scattered ones.
export const LANGUAGE_NAMES = {
  ms: "Bahasa Melayu",
  en: "English",
  zh: "Simplified Chinese (中文)",
  ta: "Tamil (தமிழ்)",
};

// BCP-47 tags for the Web Speech API. The recogniser needs a region, not just
// a language — bare "ms" or "ta" is rejected or silently falls back to the
// browser locale. ta-IN is used because ta-MY has patchy recogniser support.
export const SPEECH_LOCALES = {
  ms: "ms-MY",
  en: "en-MY",
  zh: "zh-CN",
  ta: "ta-IN",
};

export const SUPPORTED_LANGUAGES = LANGUAGES.map((l) => l.code);

// Name of the interface-language cookie.
//
// It lives HERE, in a plain module, rather than beside the provider — the
// provider is a "use client" module, and a non-component export imported from
// one into a server component arrives as an opaque client reference, not the
// string. `cookies().get(<reference>)` then silently returns undefined, so the
// server renders English no matter what the cookie says. That failure is
// completely silent: no error, no warning, just the wrong language.
export const UI_LANGUAGE_COOKIE = "vitaura_ui_lang";

const STRINGS = {
  en: {
    claimChecked: "Claim checked",
    why: "Why",
    twoAxis: "Two-axis read",
    source: "Source",
    sources: "Sources",
    supportingEvidence: "Supporting evidence",
    modelPick: "Main citation",
    evidenceConfidence: "Evidence confidence",
    evidenceConfidenceHelp:
      "How strongly our trusted sources support this claim being true.",
    actionRisk: "Action risk",
    actionRiskHelp: "How dangerous it would be to act on this claim if it's wrong.",
    checkAnother: "Check another message",
    browseFaqs: "Browse health FAQs",
    share: "Share",
    linkCopied: "Link copied",
    copyFailed: "Copy failed",
    disclaimer:
      "Not medical advice. For anything about your own health, talk to a clinician.",
    overridden: "This verdict was reviewed and corrected by our fact-checking team.",
    answerLanguage: "Answer language",
    translating: "Translating…",
    translationFailed: "Couldn't translate right now. Showing the original.",
    noSourceUnverified:
      "No trusted source in our knowledge base covers this claim yet.",
  },
  ms: {
    claimChecked: "Dakwaan disemak",
    why: "Sebabnya",
    twoAxis: "Bacaan dua paksi",
    source: "Sumber",
    sources: "Sumber",
    supportingEvidence: "Bukti sokongan",
    modelPick: "Petikan utama",
    evidenceConfidence: "Keyakinan bukti",
    evidenceConfidenceHelp:
      "Sejauh mana sumber dipercayai kami menyokong dakwaan ini sebagai benar.",
    actionRisk: "Risiko tindakan",
    actionRiskHelp:
      "Betapa bahayanya jika anda bertindak atas dakwaan ini sekiranya ia salah.",
    checkAnother: "Semak mesej lain",
    browseFaqs: "Lihat Soalan Lazim kesihatan",
    share: "Kongsi",
    linkCopied: "Pautan disalin",
    copyFailed: "Gagal menyalin",
    disclaimer:
      "Bukan nasihat perubatan. Untuk apa-apa berkaitan kesihatan anda, rujuk doktor.",
    overridden: "Keputusan ini telah disemak dan dibetulkan oleh pasukan penyemak fakta kami.",
    answerLanguage: "Bahasa jawapan",
    translating: "Menterjemah…",
    translationFailed: "Tidak dapat menterjemah sekarang. Memaparkan versi asal.",
    noSourceUnverified:
      "Belum ada sumber dipercayai dalam pangkalan pengetahuan kami yang meliputi dakwaan ini.",
  },
  ta: {
    claimChecked: "சரிபார்க்கப்பட்ட கூற்று",
    why: "ஏன்",
    twoAxis: "இரு அச்சு பார்வை",
    source: "ஆதாரம்",
    sources: "ஆதாரங்கள்",
    supportingEvidence: "ஆதரவு சான்றுகள்",
    modelPick: "முதன்மை மேற்கோள்",
    evidenceConfidence: "சான்று நம்பகத்தன்மை",
    evidenceConfidenceHelp:
      "இந்தக் கூற்று உண்மை என்பதை எங்கள் நம்பகமான ஆதாரங்கள் எந்த அளவு ஆதரிக்கின்றன.",
    actionRisk: "செயல் அபாயம்",
    actionRiskHelp:
      "இந்தக் கூற்று தவறாக இருந்தால், அதன்படி நடப்பது எவ்வளவு ஆபத்தானது.",
    checkAnother: "மற்றொரு செய்தியைச் சரிபார்க்கவும்",
    browseFaqs: "சுகாதாரக் கேள்வி பதில்களைப் பார்க்கவும்",
    share: "பகிர்",
    linkCopied: "இணைப்பு நகலெடுக்கப்பட்டது",
    copyFailed: "நகலெடுக்க முடியவில்லை",
    disclaimer:
      "இது மருத்துவ ஆலோசனை அல்ல. உங்கள் உடல்நலம் தொடர்பான எதற்கும் மருத்துவரை அணுகவும்.",
    overridden:
      "இந்த முடிவு எங்கள் உண்மை சரிபார்ப்புக் குழுவால் மறுஆய்வு செய்யப்பட்டு திருத்தப்பட்டது.",
    answerLanguage: "பதில் மொழி",
    translating: "மொழிபெயர்க்கிறது…",
    translationFailed: "இப்போது மொழிபெயர்க்க முடியவில்லை. மூலப் பதிப்பு காட்டப்படுகிறது.",
    noSourceUnverified:
      "எங்கள் அறிவுத் தளத்தில் இந்தக் கூற்றை உள்ளடக்கிய நம்பகமான ஆதாரம் இதுவரை இல்லை.",
  },
  zh: {
    claimChecked: "已核查的说法",
    why: "原因",
    twoAxis: "双轴解读",
    source: "来源",
    sources: "来源",
    supportingEvidence: "支持证据",
    modelPick: "主要引用",
    evidenceConfidence: "证据置信度",
    evidenceConfidenceHelp: "我们的可信来源在多大程度上支持该说法为真。",
    actionRisk: "行动风险",
    actionRiskHelp: "如果该说法是错的，照做会有多危险。",
    checkAnother: "查证另一条消息",
    browseFaqs: "浏览健康常见问题",
    share: "分享",
    linkCopied: "链接已复制",
    copyFailed: "复制失败",
    disclaimer: "本内容不构成医疗建议。有关您自身健康的问题，请咨询医生。",
    overridden: "此结论已由我们的事实核查团队复核并更正。",
    answerLanguage: "回答语言",
    translating: "翻译中…",
    translationFailed: "暂时无法翻译，显示原文。",
    noSourceUnverified: "我们的知识库中还没有涵盖该说法的可信来源。",
  },
};

// Risk rationale, keyed rather than hard-coded as English — see
// riskRationaleKey() in lib/risk.js for which key applies when.
const RATIONALE = {
  en: {
    supported: "Supported by our trusted sources.",
    unverifiedRisky: "Unconfirmed, and acting on it could be harmful — treat with care.",
    unverified: "We couldn't confirm this either way against a trusted source.",
    wrongAndDangerous: "Incorrect, and acting on it could cause real harm.",
    wrongButHarmless: "Incorrect, but unlikely to cause harm on its own.",
    wrong: "This claim doesn't hold up against our trusted sources.",
  },
  ms: {
    supported: "Disokong oleh sumber dipercayai kami.",
    unverifiedRisky:
      "Belum disahkan, dan bertindak atasnya boleh membahayakan — berhati-hati.",
    unverified: "Kami tidak dapat mengesahkan perkara ini dengan sumber dipercayai.",
    wrongAndDangerous: "Tidak betul, dan bertindak atasnya boleh mendatangkan bahaya.",
    wrongButHarmless: "Tidak betul, tetapi tidak mungkin membahayakan dengan sendirinya.",
    wrong: "Dakwaan ini tidak menepati sumber dipercayai kami.",
  },
  ta: {
    supported: "எங்கள் நம்பகமான ஆதாரங்களால் ஆதரிக்கப்படுகிறது.",
    unverifiedRisky:
      "உறுதிப்படுத்தப்படவில்லை; அதன்படி நடப்பது தீங்கு விளைவிக்கக்கூடும் — கவனமாக இருங்கள்.",
    unverified: "நம்பகமான ஆதாரத்துடன் இதை உறுதிப்படுத்தவோ மறுக்கவோ முடியவில்லை.",
    wrongAndDangerous: "இது தவறானது; அதன்படி நடப்பது உண்மையான தீங்கு விளைவிக்கக்கூடும்.",
    wrongButHarmless: "இது தவறானது, ஆனால் தானாகவே தீங்கு விளைவிக்க வாய்ப்பில்லை.",
    wrong: "இந்தக் கூற்று எங்கள் நம்பகமான ஆதாரங்களுடன் ஒத்துப்போகவில்லை.",
  },
  zh: {
    supported: "有我们的可信来源支持。",
    unverifiedRisky: "未获证实，且照做可能有害——请谨慎对待。",
    unverified: "我们无法用可信来源证实或否定该说法。",
    wrongAndDangerous: "该说法不正确，照做可能造成真正的伤害。",
    wrongButHarmless: "该说法不正确，但本身不太可能造成伤害。",
    wrong: "该说法与我们的可信来源不符。",
  },
};

/** UI strings for a language, falling back to English for anything missing. */
export function t(language) {
  return { ...STRINGS.en, ...(STRINGS[language] || {}) };
}

/** Localised risk rationale for a key produced by riskRationaleKey(). */
export function rationaleText(key, language) {
  const table = { ...RATIONALE.en, ...(RATIONALE[language] || {}) };
  return table[key] || RATIONALE.en.wrong;
}

// ---------------------------------------------------------------------------
// Interface language
//
// This is a SEPARATE axis from the answer language above.
//
//   Answer language  — what language a verdict is written in. Belongs to the
//                      claim, is decided at check time, and is translated by
//                      the model on demand (see /api/claims/[id]/translate).
//   Interface language — what language the app's own chrome is in: headings,
//                      buttons, labels, placeholders. Belongs to the person,
//                      persists across visits, costs nothing.
//
// Keeping them apart matters. Someone may want the interface in Bahasa Melayu
// while reading a verdict about an English-language forward exactly as it was
// written. Collapsing the two would take that choice away.
// ---------------------------------------------------------------------------

const UI = {
  en: {
    // header + nav
    healthFaqs: "Health FAQs",
    admin: "Admin",
    checkAClaim: "Check a claim",
    backToVitaura: "Back to Vitaura",
    interfaceLanguage: "Language",

    // home hero
    heroTitle: "Is this health message true?",
    heroSubtitle:
      "Someone sent you something about health. Check it here before you believe it or forward it on.",

    // primary actions
    scanLabel: "Take a photo or screenshot",
    scanTitle: "Scan a screenshot or document",
    scanHelp: "Upload a screenshot, poster or PDF — we'll read the claim out of it.",
    scanReading: "Reading it now…",

    askLabel: "Speak instead",
    askHelpIdle: "Say the message out loud",
    askHelpListening: "Listening… tap to stop",
    askHelpUnsupported: "Voice needs Chrome, Edge, or Safari",

    pasteLabel: "Type or paste",
    pasteHelp: "Paste the message you received",

    // composer
    composerTitle: "Paste the message here",
    answerLanguage: "Answer language",
    clear: "Clear",
    checking: "Checking…",
    disclaimerShort:
      "Vitaura checks claims against trusted sources. It is not medical advice — for anything about your own health, talk to a doctor.",

    // sidebar
    riskPortfolio: "Your checks so far",
    recentChecks: "Recent checks",
    searchChecks: "Search your checks…",
    noChecksMatch: "No checks match",
    emptyHistory: "Your checks appear here — private to this device, no account needed.",
    trendingNow: "Trending right now",
    askedCount: "asked",

    // footer
    footerTagline: "Vitaura — check health messages before you trust, act, or share.",

    // faq page
    faqTitle: "Health FAQs",
    faqSubtitle: "Claims checked so often we've turned them into quick answers.",
    faqSearch: "Search topics…",
    faqAll: "All",
    faqEmpty: "No FAQ entries yet — check back soon.",
    faqNoMatch: "No FAQs match that. Try a different search or topic.",
    clearFilters: "Clear filters",
    sourceLink: "Source",
    youAsked: "What you asked",
    yourExactWords: "Your message, exactly as you sent it",
  },

  ms: {
    healthFaqs: "Soalan Lazim",
    admin: "Admin",
    checkAClaim: "Semak dakwaan",
    backToVitaura: "Kembali ke Vitaura",
    interfaceLanguage: "Bahasa",

    heroTitle: "Betulkah mesej kesihatan ini?",
    heroSubtitle:
      "Ada orang hantar sesuatu tentang kesihatan. Semak di sini sebelum anda percaya atau kongsi kepada orang lain.",

    scanLabel: "Ambil gambar atau tangkap layar",
    scanTitle: "Imbas tangkap layar atau dokumen",
    scanHelp: "Muat naik tangkap layar, poster atau PDF — kami akan baca dakwaannya.",
    scanReading: "Sedang membaca…",

    askLabel: "Cakap sahaja",
    askHelpIdle: "Sebut mesej itu dengan kuat",
    askHelpListening: "Sedang mendengar… tekan untuk berhenti",
    askHelpUnsupported: "Suara perlukan Chrome, Edge atau Safari",

    pasteLabel: "Taip atau tampal",
    pasteHelp: "Tampal mesej yang anda terima",

    composerTitle: "Tampal mesej di sini",
    answerLanguage: "Bahasa jawapan",
    clear: "Padam",
    checking: "Sedang semak…",
    disclaimerShort:
      "Vitaura menyemak dakwaan dengan sumber dipercayai. Ini bukan nasihat perubatan — untuk hal kesihatan anda sendiri, jumpa doktor.",

    riskPortfolio: "Semakan anda setakat ini",
    recentChecks: "Semakan terkini",
    searchChecks: "Cari semakan anda…",
    noChecksMatch: "Tiada semakan sepadan",
    emptyHistory:
      "Semakan anda akan muncul di sini — peribadi pada peranti ini, tanpa akaun.",
    trendingNow: "Sedang hangat sekarang",
    askedCount: "orang tanya",

    footerTagline:
      "Vitaura — semak mesej kesihatan sebelum anda percaya, bertindak atau kongsi.",

    faqTitle: "Soalan Lazim Kesihatan",
    faqSubtitle: "Dakwaan yang kerap disemak, kami jadikan jawapan ringkas.",
    faqSearch: "Cari topik…",
    faqAll: "Semua",
    faqEmpty: "Belum ada soalan lazim — sila kembali nanti.",
    faqNoMatch: "Tiada yang sepadan. Cuba carian atau topik lain.",
    clearFilters: "Kosongkan penapis",
    sourceLink: "Sumber",
    youAsked: "Apa yang anda tanya",
    yourExactWords: "Mesej anda, tepat seperti yang anda hantar",
  },

  zh: {
    healthFaqs: "健康常见问题",
    admin: "管理员",
    checkAClaim: "查证说法",
    backToVitaura: "返回 Vitaura",
    interfaceLanguage: "语言",

    heroTitle: "这条健康消息是真的吗？",
    heroSubtitle: "有人发给你一条健康消息。在相信或转发之前，先在这里查一查。",

    scanLabel: "拍照或截图",
    scanTitle: "扫描截图或文件",
    scanHelp: "上传截图、海报或 PDF —— 我们会读出其中的说法。",
    scanReading: "正在读取…",

    askLabel: "直接说话",
    askHelpIdle: "把消息念出来",
    askHelpListening: "正在聆听… 点击停止",
    askHelpUnsupported: "语音需要 Chrome、Edge 或 Safari",

    pasteLabel: "输入或粘贴",
    pasteHelp: "粘贴你收到的消息",

    composerTitle: "在这里粘贴消息",
    answerLanguage: "回答语言",
    clear: "清除",
    checking: "查证中…",
    disclaimerShort:
      "Vitaura 会对照可信来源查证说法。这不是医疗建议 —— 有关你自身健康的问题，请咨询医生。",

    riskPortfolio: "你的查证记录",
    recentChecks: "最近查证",
    searchChecks: "搜索你的查证…",
    noChecksMatch: "没有匹配的查证",
    emptyHistory: "你的查证会显示在这里 —— 仅存于本设备，无需账号。",
    trendingNow: "当前热门",
    askedCount: "人问过",

    footerTagline: "Vitaura —— 在相信、照做或转发之前，先查证健康消息。",

    faqTitle: "健康常见问题",
    faqSubtitle: "被查证得最多的说法，我们整理成了简短答案。",
    faqSearch: "搜索主题…",
    faqAll: "全部",
    faqEmpty: "暂无条目 —— 请稍后再来。",
    faqNoMatch: "没有匹配的内容。换个搜索词或主题试试。",
    clearFilters: "清除筛选",
    sourceLink: "来源",
    youAsked: "你问的内容",
    yourExactWords: "你发送的原文，一字未改",
  },

  ta: {
    healthFaqs: "சுகாதாரக் கேள்வி பதில்",
    admin: "நிர்வாகம்",
    checkAClaim: "கூற்றைச் சரிபார்",
    backToVitaura: "Vitaura க்குத் திரும்பு",
    interfaceLanguage: "மொழி",

    heroTitle: "இந்த சுகாதாரச் செய்தி உண்மையா?",
    heroSubtitle:
      "யாரோ உங்களுக்கு உடல்நலம் பற்றி ஒரு செய்தி அனுப்பியுள்ளார்கள். நம்புவதற்கு அல்லது பகிர்வதற்கு முன் இங்கே சரிபாருங்கள்.",

    scanLabel: "புகைப்படம் அல்லது திரைப்பிடிப்பு",
    scanTitle: "திரைப்பிடிப்பு அல்லது ஆவணத்தை ஸ்கேன் செய்",
    scanHelp: "திரைப்பிடிப்பு, சுவரொட்டி அல்லது PDF ஐ பதிவேற்றவும் — கூற்றை நாங்கள் படிப்போம்.",
    scanReading: "படிக்கிறது…",

    askLabel: "பேசுங்கள்",
    askHelpIdle: "செய்தியை சத்தமாகச் சொல்லுங்கள்",
    askHelpListening: "கேட்கிறது… நிறுத்த தட்டவும்",
    askHelpUnsupported: "குரலுக்கு Chrome, Edge அல்லது Safari தேவை",

    pasteLabel: "தட்டச்சு அல்லது ஒட்டு",
    pasteHelp: "நீங்கள் பெற்ற செய்தியை ஒட்டவும்",

    composerTitle: "செய்தியை இங்கே ஒட்டவும்",
    answerLanguage: "பதில் மொழி",
    clear: "அழி",
    checking: "சரிபார்க்கிறது…",
    disclaimerShort:
      "Vitaura நம்பகமான ஆதாரங்களுடன் கூற்றுகளைச் சரிபார்க்கிறது. இது மருத்துவ ஆலோசனை அல்ல — உங்கள் உடல்நலம் குறித்து மருத்துவரை அணுகவும்.",

    riskPortfolio: "இதுவரை உங்கள் சரிபார்ப்புகள்",
    recentChecks: "சமீபத்திய சரிபார்ப்புகள்",
    searchChecks: "உங்கள் சரிபார்ப்புகளைத் தேடு…",
    noChecksMatch: "பொருந்தும் சரிபார்ப்பு இல்லை",
    emptyHistory:
      "உங்கள் சரிபார்ப்புகள் இங்கே தோன்றும் — இந்த சாதனத்தில் மட்டும், கணக்கு தேவையில்லை.",
    trendingNow: "இப்போது அதிகம் பேசப்படுவது",
    askedCount: "பேர் கேட்டனர்",

    footerTagline:
      "Vitaura — நம்புவதற்கு, செயல்படுவதற்கு அல்லது பகிர்வதற்கு முன் சுகாதாரச் செய்திகளைச் சரிபாருங்கள்.",

    faqTitle: "சுகாதாரக் கேள்வி பதில்கள்",
    faqSubtitle: "அடிக்கடி சரிபார்க்கப்படும் கூற்றுகளை சுருக்கமான பதில்களாக்கியுள்ளோம்.",
    faqSearch: "தலைப்புகளைத் தேடு…",
    faqAll: "அனைத்தும்",
    faqEmpty: "இதுவரை பதிவுகள் இல்லை — பிறகு பாருங்கள்.",
    faqNoMatch: "பொருந்தும் பதிவு இல்லை. வேறு தேடல் அல்லது தலைப்பை முயற்சிக்கவும்.",
    clearFilters: "வடிகட்டிகளை அழி",
    sourceLink: "ஆதாரம்",
    youAsked: "நீங்கள் கேட்டது",
    yourExactWords: "நீங்கள் அனுப்பிய செய்தி, அப்படியே",
  },
};

/** Interface strings for a language, falling back to English per-key. */
export function ui(language) {
  return { ...UI.en, ...(UI[language] || {}) };
}

// ---------------------------------------------------------------------------
// Verdict and risk labels
//
// These are the words a user actually reads on a badge, so they follow the
// INTERFACE language like every other label. Leaving them in English while the
// rest of the page is Malay was the single most jarring thing on the screen:
// a fully translated card with "HIGH RISK" stamped on it.
//
// Kept short. They sit inside pill badges at small sizes, and a long
// translation wraps and breaks the layout.
// ---------------------------------------------------------------------------

const VERDICT_LABELS = {
  en: { true: "TRUE", false: "FALSE", misleading: "MISLEADING", unverified: "UNVERIFIED" },
  ms: { true: "BENAR", false: "PALSU", misleading: "MENGELIRUKAN", unverified: "TIDAK PASTI" },
  zh: { true: "属实", false: "虚假", misleading: "误导", unverified: "无法核实" },
  ta: { true: "உண்மை", false: "பொய்", misleading: "தவறாக வழிநடத்தும்", unverified: "உறுதிசெய்யப்படவில்லை" },
};

const RISK_LABELS = {
  en: { safe: "SAFE", caution: "CAUTION", high_risk: "HIGH RISK" },
  ms: { safe: "SELAMAT", caution: "BERHATI-HATI", high_risk: "RISIKO TINGGI" },
  zh: { safe: "安全", caution: "注意", high_risk: "高风险" },
  ta: { safe: "பாதுகாப்பு", caution: "எச்சரிக்கை", high_risk: "அதிக ஆபத்து" },
};

/** Localised verdict label, e.g. "PALSU" for false in Malay. */
export function verdictLabel(verdict, language) {
  const table = VERDICT_LABELS[language] || VERDICT_LABELS.en;
  return table[verdict] || VERDICT_LABELS.en.unverified;
}

/** Localised risk label, e.g. "RISIKO TINGGI" for high_risk in Malay. */
export function riskLabel(riskLevel, language) {
  const table = RISK_LABELS[language] || RISK_LABELS.en;
  return table[riskLevel] || RISK_LABELS.en.caution;
}
