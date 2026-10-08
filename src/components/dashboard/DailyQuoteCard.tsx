import React from 'react';
import { getDailyFinancialQuote } from '../../services/quoteService';

export interface DailyQuoteCardProps {
  customQuote?: string;
  customAuthor?: string;
}

export const DailyQuoteCard: React.FC<DailyQuoteCardProps> = ({
  customQuote,
  customAuthor,
}) => {
  const dailyQuote = getDailyFinancialQuote();
  const quoteText = customQuote || dailyQuote.quote;
  const authorText = customAuthor || dailyQuote.author;

  return (
    <section className="calm-wisdom-card" aria-label="Daily Wisdom Quote">
      <div className="calm-wisdom-card__top">
        <div className="calm-wisdom-quote-icon">
          <span className="material-symbols-outlined text-[18px]">format_quote</span>
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <p className="calm-wisdom-quote-text">
            “{quoteText}”
          </p>
          <div className="calm-wisdom-card__footer">
            <span className="calm-wisdom-author">— {authorText || 'Stoic Ledger'}</span>
          </div>
        </div>
      </div>
    </section>
  );
};
