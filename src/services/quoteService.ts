export interface FinancialQuote {
  id: string;
  quote: string;
  author: string;
  category: 'mindset' | 'investing' | 'budgeting' | 'discipline' | 'saving' | 'peace';
}

export const FINANCIAL_QUOTES: readonly FinancialQuote[] = [
  {
    id: 'q1',
    quote: 'Do not save what is left after spending, but spend what is left after saving.',
    author: 'Warren Buffett',
    category: 'saving',
  },
  {
    id: 'q2',
    quote: 'True wealth is the ability to fully experience life on your own terms.',
    author: 'Henry David Thoreau',
    category: 'mindset',
  },
  {
    id: 'q3',
    quote: 'Wealth is what you do not see. It is the money not spent, the cars not bought.',
    author: 'Morgan Housel',
    category: 'discipline',
  },
  {
    id: 'q4',
    quote: 'Beware of little expenses; a small leak will sink a great ship.',
    author: 'Benjamin Franklin',
    category: 'budgeting',
  },
  {
    id: 'q5',
    quote: 'Financial peace isn’t the acquisition of stuff. It’s learning to live on less than you make.',
    author: 'Dave Ramsey',
    category: 'peace',
  },
  {
    id: 'q6',
    quote: 'Spend money on things you love, and cut costs mercilessly on things you don’t.',
    author: 'Ramit Sethi',
    category: 'mindset',
  },
  {
    id: 'q7',
    quote: 'A budget is telling your money where to go instead of wondering where it went.',
    author: 'John C. Maxwell',
    category: 'budgeting',
  },
  {
    id: 'q8',
    quote: 'Simplicity is the key to financial freedom. Less noise, more clarity.',
    author: 'Naval Ravikant',
    category: 'peace',
  },
  {
    id: 'q9',
    quote: 'The goal isn’t more money. The goal is living life on your own terms.',
    author: 'Chris Brogan',
    category: 'mindset',
  },
  {
    id: 'q10',
    quote: 'Every rupee you direct today builds the calmness of your tomorrow.',
    author: 'CalmSpend Wisdom',
    category: 'peace',
  },
  {
    id: 'q11',
    quote: 'The secret to wealth is simple: Find out what almost everyone is doing wrong and do the opposite.',
    author: 'Charlie Munger',
    category: 'investing',
  },
  {
    id: 'q12',
    quote: 'It is not the man who has too little, but the man who craves more, that is poor.',
    author: 'Seneca',
    category: 'discipline',
  },
  {
    id: 'q13',
    quote: 'Compounding is the eighth wonder of the world. He who understands it, earns it; he who doesn’t, pays it.',
    author: 'Albert Einstein',
    category: 'investing',
  },
  {
    id: 'q14',
    quote: 'Freedom is the only real wealth. Being able to wake up and say, I can do whatever I want today.',
    author: 'Morgan Housel',
    category: 'peace',
  },
  {
    id: 'q15',
    quote: 'Money is a terrible master but an excellent servant.',
    author: 'P.T. Barnum',
    category: 'mindset',
  },
  {
    id: 'q16',
    quote: 'Peace of mind comes from knowing you have enough, not from acquiring more.',
    author: 'Marcus Aurelius',
    category: 'peace',
  },
  {
    id: 'q17',
    quote: 'The stock market is a device for transferring money from the impatient to the patient.',
    author: 'Warren Buffett',
    category: 'investing',
  },
  {
    id: 'q18',
    quote: 'Small daily disciplines repeated consistently lead to great financial outcomes.',
    author: 'John C. Maxwell',
    category: 'discipline',
  },
  {
    id: 'q19',
    quote: 'If you buy things you do not need, soon you will have to sell things you need.',
    author: 'Warren Buffett',
    category: 'saving',
  },
  {
    id: 'q20',
    quote: 'Spend less than you make, invest the difference, and avoid debt. The rest is details.',
    author: 'JL Collins',
    category: 'saving',
  },
  {
    id: 'q21',
    quote: 'The greatest reward in saving money is freedom over your future time.',
    author: 'Naval Ravikant',
    category: 'mindset',
  },
  {
    id: 'q22',
    quote: 'Financial security doesn’t come from how much you earn, but how much you keep.',
    author: 'CalmSpend Wisdom',
    category: 'saving',
  },
  {
    id: 'q23',
    quote: 'He who buys what he does not need steals from himself.',
    author: 'Swedish Proverb',
    category: 'budgeting',
  },
  {
    id: 'q24',
    quote: 'Contentment with little is the greatest wealth of all.',
    author: 'Epictetus',
    category: 'peace',
  },
  {
    id: 'q25',
    quote: 'An investment in knowledge pays the best interest.',
    author: 'Benjamin Franklin',
    category: 'investing',
  },
  {
    id: 'q26',
    quote: 'Never depend on a single income. Make investment to create a second source.',
    author: 'Warren Buffett',
    category: 'investing',
  },
  {
    id: 'q27',
    quote: 'A budget isn’t a restriction; it is permission to spend on what truly matters.',
    author: 'CalmSpend Wisdom',
    category: 'budgeting',
  },
  {
    id: 'q28',
    quote: 'The ability to delay gratification is the ultimate financial superpower.',
    author: 'Morgan Housel',
    category: 'discipline',
  },
  {
    id: 'q29',
    quote: 'Rich people stay rich by acting poor. Poor people stay poor by acting rich.',
    author: 'Thomas J. Stanley',
    category: 'discipline',
  },
  {
    id: 'q30',
    quote: 'Calmness is mastery. When you track with intention, money stress evaporates.',
    author: 'CalmSpend Wisdom',
    category: 'peace',
  },
  {
    id: 'q31',
    quote: 'A penny saved is a penny earned, but a penny invested is a penny multiplied.',
    author: 'Financial Proverb',
    category: 'investing',
  },
  {
    id: 'q32',
    quote: 'Focus on building sustainable habits rather than seeking quick financial shortcuts.',
    author: 'James Clear',
    category: 'discipline',
  },
  {
    id: 'q33',
    quote: 'The simplest way to be rich is to reduce what you desire.',
    author: 'Seneca',
    category: 'peace',
  },
  {
    id: 'q34',
    quote: 'Protect your downside, and the upside will take care of itself.',
    author: 'Charlie Munger',
    category: 'investing',
  },
  {
    id: 'q35',
    quote: 'Clarity creates confidence. When you know your numbers, decisions become easy.',
    author: 'CalmSpend Wisdom',
    category: 'budgeting',
  },
] as const;

/**
 * Returns a deterministic financial quote based on the current calendar day.
 */
export function getDailyFinancialQuote(dateObj = new Date()): FinancialQuote {
  const startOfYear = new Date(dateObj.getFullYear(), 0, 0);
  const diff = dateObj.getTime() - startOfYear.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  const index = Math.abs(dayOfYear) % FINANCIAL_QUOTES.length;
  return FINANCIAL_QUOTES[index];
}

/**
 * Get random quote optionally filtered by category
 */
export function getRandomFinancialQuote(
  category?: FinancialQuote['category'],
): FinancialQuote {
  const list = category
    ? FINANCIAL_QUOTES.filter((q) => q.category === category)
    : FINANCIAL_QUOTES;
  const index = Math.floor(Math.random() * list.length);
  return list[index] || FINANCIAL_QUOTES[0];
}
