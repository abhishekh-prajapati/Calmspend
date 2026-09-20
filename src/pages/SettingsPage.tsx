import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sliders,
  FolderTree,
  CreditCard,
  Download,
  Upload,
  Shield,
  ChevronRight,
  HelpCircle,
  Landmark,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Badge } from '../components/ui/Badge';
import { LinkedBankAccountsSection } from '../components/accounts/LinkedBankAccountsSection';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const settingSections = [
    {
      title: 'Configuration',
      items: [
        {
          id: 'networth',
          icon: <Landmark size={20} />,
          title: 'Net Worth & Balance Sheet',
          subtitle: 'Track manual assets, liabilities, and snapshot history',
          onClick: () => navigate('/net-worth'),
        },
        {
          id: 'preferences',
          icon: <Sliders size={20} />,
          title: 'General Preferences',
          subtitle: 'Currency format, theme, date display',
        },
        {
          id: 'categories',
          icon: <FolderTree size={20} />,
          title: 'Income & Expense Categories',
          subtitle: 'Manage custom categories, icons, and tags',
        },
        {
          id: 'accounts',
          icon: <CreditCard size={20} />,
          title: 'Financial Accounts',
          subtitle: 'Cash, bank accounts, credit cards, savings',
        },
      ],
    },
    {
      title: 'Data & Security',
      items: [
        {
          id: 'backup',
          icon: <Download size={20} />,
          title: 'Backup & Export',
          subtitle: 'Export data to JSON, restore from backup',
          onClick: () => navigate('/data-management'),
        },
        {
          id: 'restore',
          icon: <Upload size={20} />,
          title: 'Import & Restore',
          subtitle: 'Restore financial records from backup file',
          onClick: () => navigate('/data-management'),
        },
        {
          id: 'security',
          icon: <Shield size={20} />,
          title: 'Privacy & Security',
          subtitle: 'Local storage, data retention, encryption',
        },
      ],
    },
  ];

  return (
    <div className="settings-page">
      <PageHeader
        title="Settings"
        subtitle="App Configuration & Data"
      />

      <div className="page-container">
        {/* Stage 1 Info Banner */}
        <Card variant="subtle" padding="md" radius="lg">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span className="heading-3" style={{ fontSize: '14px' }}>Settings Framework</span>
            <Badge variant="neutral" size="sm">Structure</Badge>
          </div>
          <p className="body-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Settings modules are organized into functional groups. Data persistence and custom options will be hooked into the state layer in upcoming stages.
          </p>
        </Card>

        {/* Account Aggregator Linked Bank Accounts */}
        <LinkedBankAccountsSection />

        {/* Setting Groups */}
        {settingSections.map((section) => (
          <div key={section.title} className="settings-section">
            <SectionHeader title={section.title} />
            <Card variant="default" padding="none" radius="lg" style={{ overflow: 'hidden' }}>
              {section.items.map((item, index) => (
                <div
                  key={item.id}
                  onClick={item.onClick}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderBottom: index < section.items.length - 1 ? '1px solid var(--color-divider)' : 'none',
                    cursor: item.onClick ? 'pointer' : 'default',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--color-primary-light)',
                        color: 'var(--color-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {item.icon}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span className="body-medium" style={{ fontSize: '14px' }}>{item.title}</span>
                      <span className="caption" style={{ color: 'var(--color-text-muted)' }}>{item.subtitle}</span>
                    </div>
                  </div>
                  <ChevronRight size={18} style={{ color: 'var(--color-text-muted)' }} />
                </div>
              ))}
            </Card>
          </div>
        ))}

        {/* About App Footer */}
        <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--color-text-muted)' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            <HelpCircle size={14} />
            <span>Personal Budget Planner &bull; v1.0.0 (Stage 11)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
