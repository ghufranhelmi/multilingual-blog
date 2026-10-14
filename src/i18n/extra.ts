// Extra UI strings used by the redesigned layout.
// Kept separate from ui.ts so nothing existing is touched.
type Key = 'disclosure' | 'reviews' | 'skip';

const dict: Record<string, Record<Key, string>> = {
  en: {
    disclosure: 'Some links on this site are affiliate links. We may earn a commission at no extra cost to you.',
    reviews: 'Reviews & guides',
    skip: 'Skip to content',
  },
  zh: {
    disclosure: '本网站的部分链接为联盟推广链接。通过这些链接购买，我们可能获得佣金，您无需额外付费。',
    reviews: '评测与指南',
    skip: '跳到主要内容',
  },
  es: {
    disclosure: 'Algunos enlaces de este sitio son de afiliados. Podemos recibir una comisión sin coste adicional para ti.',
    reviews: 'Reseñas y guías',
    skip: 'Saltar al contenido',
  },
  ar: {
    disclosure: 'بعض الروابط في هذا الموقع هي روابط تابعة. قد نحصل على عمولة دون أي تكلفة إضافية عليك.',
    reviews: 'المراجعات والأدلة',
    skip: 'انتقل إلى المحتوى',
  },
  id: {
    disclosure: 'Beberapa tautan di situs ini adalah tautan afiliasi. Kami dapat menerima komisi tanpa biaya tambahan bagi Anda.',
    reviews: 'Ulasan & panduan',
    skip: 'Langsung ke konten',
  },
  pt: {
    disclosure: 'Alguns links deste site são de afiliados. Podemos receber uma comissão sem custo adicional para você.',
    reviews: 'Análises e guias',
    skip: 'Ir para o conteúdo',
  },
  fr: {
    disclosure: "Certains liens de ce site sont des liens d'affiliation. Nous pouvons percevoir une commission sans frais supplémentaires pour vous.",
    reviews: 'Avis et guides',
    skip: 'Aller au contenu',
  },
  ja: {
    disclosure: '当サイトの一部のリンクはアフィリエイトリンクです。お客様に追加費用はかからず、当サイトが報酬を受け取る場合があります。',
    reviews: 'レビューとガイド',
    skip: '本文へスキップ',
  },
  ru: {
    disclosure: 'Некоторые ссылки на этом сайте — партнёрские. Мы можем получать комиссию, и для вас это не повлечёт дополнительных расходов.',
    reviews: 'Обзоры и руководства',
    skip: 'Перейти к содержимому',
  },
};

export function tx(lang: string, key: Key): string {
  return (dict[lang] ?? dict.en)[key];
}
