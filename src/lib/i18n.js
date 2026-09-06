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
