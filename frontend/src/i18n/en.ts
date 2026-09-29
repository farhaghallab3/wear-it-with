import type { Exclusion, Reason } from '../lib/rules'
import type { Category, ColorName, Occasion } from '../lib/types'

/**
 * All UI copy lives here so an Arabic file (dir: 'rtl') can be added later.
 * Layout uses logical properties (ms/me/ps/pe, start/end) to support RTL.
 */
export const locale = { lang: 'en', dir: 'ltr' as 'ltr' | 'rtl', currency: 'USD' }

const list = (items: string[]) => new Intl.ListFormat(locale.lang, { type: 'conjunction' }).format(items)
export const money = (n: number) =>
  new Intl.NumberFormat(locale.lang, { style: 'currency', currency: locale.currency, maximumFractionDigits: n % 1 ? 2 : 0 }).format(n)

const category: Record<Category, string> = { top: 'Top', bottom: 'Bottom', outerwear: 'Outerwear', dress: 'Dress', shoes: 'Shoes' }
const categoryPlural: Record<Category, string> = { top: 'tops', bottom: 'bottoms', outerwear: 'outerwear', dress: 'dresses', shoes: 'shoes' }
const occasion: Record<Occasion, string> = { casual: 'Casual', work: 'Work', evening: 'Evening', active: 'Active' }

export const t = {
  app: {
    name: 'Wear It With',
    tagline: 'Before you buy a new piece, see where it fits in your closet.',
    nav: { closet: 'Closet', consider: 'New piece', looks: 'Looks', tryOn: 'Try on' },
    skip: 'Skip to content',
  },
  category,
  categoryPlural,
  occasion,
  color: (c: ColorName) => c.charAt(0).toUpperCase() + c.slice(1),
  home: {
    eyebrow: 'A second opinion for your shopping cart',
    title: 'Will it work with',
    titleEm: 'what you already own?',
    body: 'Add a few pieces from your closet and the item you’re eyeing. We’ll show the outfits it makes, explain every pairing, and let you preview it on yourself with YouCam virtual try-on.',
    ctaDemo: 'Explore with a sample closet',
    ctaOwn: 'Start my own closet',
    stepsTitle: 'How it works',
    steps: [
      { title: 'Build your closet', body: 'Photograph 6–12 pieces you wear often. Tag type, color and occasion.' },
      { title: 'Add the piece you’re considering', body: 'Upload a product photo, its price and your budget.' },
      { title: 'See the looks it makes', body: 'Clear, declared rules — no mystery match scores.' },
      { title: 'Preview it on you', body: 'A real YouCam try-on of the new piece, generated on request.' },
    ],
    privacy: 'Your closet stays in this browser. Photos of you are only sent to YouCam when you ask for a preview.',
  },
  closet: {
    title: 'Your closet',
    subtitle: 'The pieces you already own. The more you add, the better the looks.',
    add: 'Add a piece',
    empty: 'Your closet is empty',
    emptyBody: 'Add a few pieces you wear often, or explore with a sample closet first.',
    loadDemo: 'Load sample closet',
    clearDemo: 'Remove sample pieces',
    demoNotice: 'Sample pieces are illustrations for demo purposes, not real products.',
    all: 'All',
    count: (n: number) => `${n} ${n === 1 ? 'piece' : 'pieces'}`,
    next: 'Next: the piece you’re considering',
    full: 'Your closet is full for this demo.',
  },
  piece: {
    addTitle: 'Add to closet',
    editTitle: 'Edit piece',
    photo: 'Photo',
    photoHint: 'A clear photo on a plain background works best.',
    choosePhoto: 'Choose photo',
    replacePhoto: 'Replace photo',
    name: 'Name',
    namePlaceholder: 'e.g. Black wide-leg trousers',
    category: 'Type',
    color: 'Main color',
    colorHelp: 'Neutrals pair freely; one statement color per look.',
    neutrals: 'Neutrals',
    accents: 'Statement colors',
    occasions: 'Where you’d wear it',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    confirmDelete: 'Delete this piece?',
    demo: 'Sample',
    required: (missing: string[]) => `Please add ${list(missing)}.`,
    missing: { name: 'a name', photo: 'a photo', occasion: 'at least one occasion', price: 'a price' },
    photoError: 'We couldn’t read that image. Try a JPEG or PNG.',
  },
  consider: {
    title: 'The piece you’re considering',
    subtitle: 'Add what you’re thinking of buying. Compare up to two options.',
    add: 'Add a piece to consider',
    addAnother: 'Add a second option',
    price: 'Price',
    budget: 'Budget (optional)',
    budgetHint: 'The most you’d like to spend on this piece.',
    empty: 'Nothing to consider yet',
    emptyBody: 'Upload a product photo of the piece you’re eyeing, with its price.',
    seeLooks: 'See the looks',
    active: 'Showing looks for this',
    select: 'Show looks',
    remove: 'Remove',
    limit: 'You can compare two options at a time. Remove one to add another.',
    needsCloset: 'Add a few closet pieces first so we have something to pair it with.',
    tryOnPhotoNote: 'For try-on, use a front-facing photo of the garment alone, at least 512px tall.',
  },
  looks: {
    title: (name: string) => `Looks with your ${name.toLowerCase()}`,
    noCandidate: 'Pick a piece to consider first',
    noCandidateBody: 'Add the item you’re thinking of buying, and we’ll pair it with your closet.',
    combinationsLabel: 'Outfit combinations',
    combinationsHelp: 'Complete looks from your closet that pass all three rules below.',
    pairsWithLabel: 'Closet pieces it pairs with',
    pairsWithHelp: 'Relevant pieces that appear in at least one passing look.',
    pricePerLook: 'Price per combination',
    pricePerLookHelp: 'Price divided by the number of combinations.',
    withinBudget: (d: string) => `${d} under budget`,
    overBudget: (d: string) => `${d} over budget`,
    onBudget: 'Exactly on budget',
    noBudget: 'No budget set',
    look: (i: number) => `Look ${i}`,
    why: 'Why it works',
    preview: 'Preview the new piece on me',
    noLooks: 'No complete looks yet',
    missing: (cats: Category[]) => `Your closet has no ${list(cats.map((c) => categoryPlural[c]))} to complete a look with it.`,
    noLooksBody: 'None of your pieces pass the rules with this item. That’s useful to know before buying.',
    notMatched: 'Doesn’t pair with',
    rulesTitle: 'The rules we use',
    rules: [
      'A complete look is a top with a bottom, or a dress. Outerwear layers over a complete look; shoes are added when they fit the rules.',
      'Every piece must share at least one occasion — nothing that’s only for the gym next to evening wear.',
      'At most one statement color per look. Neutrals (black, white, cream, beige, camel, brown, grey, navy, denim, olive) go with anything. Repeating the same color counts as one.',
    ],
    rulesNote: 'These are simple styling conventions, not a guarantee of taste. Looks are ordered by shared occasions, then by color balance.',
    compare: 'Compare options',
    newPiece: 'New',
  },
  reason: (r: Reason): string => {
    switch (r.kind) {
      case 'occasion': return `All pieces work for ${list(r.occasions.map((o) => occasion[o].toLowerCase()))}.`
      case 'neutralBase': return 'An all-neutral palette, so every piece works together.'
      case 'accent': return `${t.color(r.color)} is the only statement color; everything else is neutral.`
      case 'tonal': return `Tonal ${r.color}: repeating one color reads as intentional.`
      case 'layer': return 'Layers over a complete outfit you already own.'
    }
  },
  exclusion: (e: Exclusion): string => {
    switch (e.kind) {
      case 'occasion': return 'No shared occasion'
      case 'accentClash': return `Two statement colors (${e.color})`
      case 'noCompleteLook': return 'No complete look passes the rules'
    }
  },
  compare: {
    title: 'Compare your options',
    subtitle: 'Side by side, using the same closet and the same declared rules.',
    needTwo: 'Add a second option to compare',
    needTwoBody: 'Comparing works best with two pieces you’re deciding between.',
    price: 'Price',
    budget: 'Budget',
    combinations: 'Outfit combinations',
    perLook: 'Price per combination',
    pairsWith: 'Closet pieces it pairs with',
    verdictMore: (name: string, n: number) => `${name} makes ${n} more ${n === 1 ? 'combination' : 'combinations'} with your closet.`,
    verdictCheaper: (name: string, d: string) => `${name} costs ${d} less.`,
    verdictBudget: (name: string) => `${name} is the only one within your budget.`,
    verdictTie: 'Both make the same number of combinations.',
    note: 'This is a summary of the rules above, not a recommendation to buy either one.',
  },
  tryOn: {
    title: 'Preview it on you',
    subtitle: 'See the new piece on you, or try the whole look together.',
    honesty: 'Pieces are put on one at a time, so later layers can slightly change earlier ones.',
    pickPiece: 'Piece to put on',
    layerHint: 'The full look is put on from the bottom up: bottoms, then tops, then outerwear.',
    bottomHint: 'works best with a photo of it being worn',
    notSupportedShort: 'not supported yet',
    needsPhotoShort: 'needs a real photo',
    on: 'On',
    wearing: 'Wearing:',
    layer: 'Add another piece on top',
    resultAlt: (names: string[]) => `Generated preview wearing ${names.join(' and ')}`,
    disclaimer: 'The preview is an AI approximation. It doesn’t guarantee size, fit, or exact fabric and color.',
    personPhoto: 'Your photo',
    personHint: 'One adult, standing and facing the camera, face and shoulders visible, good light. JPEG or PNG, at least 512px tall.',
    choosePerson: 'Choose a photo of you',
    replacePerson: 'Use a different photo',
    personMemory: 'Kept in memory only — not saved in this browser.',
    garment: 'The new piece',
    consent:
      'I have the right to use these photos, and I agree to send them to YouCam (Perfect Corp.) to create my preview. YouCam may keep the files for up to 30 days.',
    privacyLink: 'YouCam API privacy policy',
    retentionLink: 'File retention',
    limitReached: 'You’ve reached the try-on limit for now. Please come back later.',
    generateOne: (name: string) => `Try on only: ${name}`,
    fullLook: (n: number) => `Try the full look (${n} pieces)`,
    progress: (step: number, total: number, name: string) => (total > 1 ? `Layer ${step} of ${total}: ${name}` : name),
    partial: 'Stopped before the last layer. The photo shows the layers that finished.',
    generating: 'Generating your preview…',
    generatingBody: 'This usually takes under a minute. Keep this tab open.',
    uploading: 'Sending photos securely…',
    resultLabel: 'AI try-on · Powered by YouCam',
    board: 'The full look',
    forget: 'Clear this preview',
    download: 'Save image',
    tryAgain: 'Try a different photo',
    notConfigured: 'Try-on isn’t set up on this server yet',
    notConfiguredBody: 'The server needs a YouCam API key. Outfit suggestions still work without it.',
    noPhoto: 'This piece needs a real product photo for try-on. Sample illustrations can’t be previewed.',
    unsupported: (c: string) => `Try-on for ${c.toLowerCase()} isn’t available in this version. It supports tops, bottoms, outerwear and dresses.`,
    photoProblem: {
      size: 'That photo is over 10 MB. Try a smaller one.',
      dimensions: 'That photo is too small or too large. Use one with a short side of at least 384px and a long side between 512 and 4096px.',
      unreadable: 'We couldn’t read that image. Try a JPEG or PNG.',
    },
    garmentProblem: 'The garment photo is too small for try-on, even after enlarging it. Replace it with a larger photo on the “New piece” page.',
    pickLook: 'Choose a look to show beside the preview',
    expired: 'This preview expired. Results are available for about 2 hours.',
    serverOffline: 'The app server isn’t reachable. Start the backend and try again.',
  },
  states: {
    loading: 'Loading…',
    storageError: 'This browser blocked local storage, so your closet won’t be saved after you close the tab.',
    back: 'Back',
  },
}

export const optionOrder: Category[] = ['top', 'bottom', 'outerwear', 'dress', 'shoes']
