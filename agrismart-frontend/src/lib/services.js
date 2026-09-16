// Shared source of truth for the six "AgriSmart connects you with providers"
// service categories, used by the Services page and the dashboard quick panel.
// These are provider *types* (what the pilot facilitator can match you with), not
// specific companies — AgriSmart connects, partners deliver.
export const SERVICE_CATEGORIES = [
  {
    id: 'loans',
    emoji: '💰',
    label: 'Loans',
    title: 'Loans & financing',
    copy:
      'Working capital to plant, input credit before the season, and harvest-bridge finance — arranged through registered financial institutions, not by AgriSmart itself.',
    providers: ['Microfinance banks', 'Savings & loan companies', 'Input-credit schemes'],
  },
  {
    id: 'fertilizer',
    emoji: '🌱',
    label: 'Inputs',
    title: 'Fertilizer & farm inputs',
    copy:
      'Certified suppliers for seed, fertilizer, and crop protection, so you get genuine inputs close to home.',
    providers: ['Certified agro-dealers', 'Cooperative input shops', 'Fertilizer distributors'],
  },
  {
    id: 'equipment',
    emoji: '🚜',
    label: 'Equipment',
    title: 'Equipment & land prep',
    copy:
      'Machinery hire and service providers for ploughing, land preparation, irrigation installation, and harvesting.',
    providers: ['Tractor & ploughing services', 'Harvesting contractors', 'Irrigation installers'],
  },
  {
    id: 'transport',
    emoji: '🚚',
    label: 'Transport',
    title: 'Transportation',
    copy:
      'Haulage between farm, market, and buyer — matched to the weight and distance of your produce.',
    providers: ['Farm-haulage operators', 'Pickup & truck owners'],
  },
  {
    id: 'storage',
    emoji: '📦',
    label: 'Storage',
    title: 'Storage',
    copy:
      'Secure warehousing, including cold stores for perishable produce, so you can sell when the price is right.',
    providers: ['Cold stores', 'Secure warehouse operators'],
  },
  {
    id: 'farm-services',
    emoji: '👨🏾‍🌾',
    label: 'Farm services',
    title: 'Farm services',
    copy:
      'Hired labour, water and irrigation support, and agronomy advice to carry you through the season.',
    providers: ['Hired-labour groups', 'Aggregation & grading services', 'Agronomy advisors'],
  },
]

export const SERVICE_STEPS = [
  { title: 'Identify a need', copy: 'Seed, credit, transport, storage, equipment, or labour ahead of the season.' },
  { title: 'Tell us on this page', copy: 'Tap “Request service” on the category you need.' },
  { title: 'We match you', copy: 'A field facilitator pairs you with a verified provider in your area.' },
  { title: 'Agree & receive', copy: 'You arrange terms directly and the service gets delivered.' },
]