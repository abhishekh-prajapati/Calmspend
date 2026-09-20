import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, Home } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="not-found-page">
      <PageHeader
        title="Page Not Found"
        onBack={() => navigate('/home')}
      />

      <div className="page-container">
        <EmptyState
          icon={<HelpCircle size={32} />}
          title="Route Not Found"
          description="The page you are looking for does not exist or has been moved."
          action={
            <Button
              variant="primary"
              size="md"
              leftIcon={<Home size={18} />}
              onClick={() => navigate('/home')}
            >
              Return to Home
            </Button>
          }
        />
      </div>
    </div>
  );
};
