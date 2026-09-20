import React from 'react';
import { AddExpensePage } from './AddExpensePage';

export const AddTransferPage: React.FC = () => {
  return <AddExpensePage initialMode="transfer" />;
};

export default AddTransferPage;
