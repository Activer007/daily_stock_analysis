import type React from 'react';
import type { ReportStrategy as ReportStrategyType } from '../../types/analysis';
import { Card } from '../common';

interface ReportStrategyProps {
  strategy?: ReportStrategyType;
}

interface StrategyItemProps {
  label: string;
  value?: string;
  tone: string;
}

const StrategyItem: React.FC<StrategyItemProps> = ({
  label,
  value,
  tone,
}) => (
  <div className="home-subpanel p-3">
    <div className="flex flex-col">
      <span className="text-xs text-muted-text mb-0.5">{label}</span>
      <span
        className="text-lg font-bold font-mono"
        style={{ color: value ? `var(${tone})` : 'var(--text-muted-text)' }}
      >
        {value || '—'}
      </span>
    </div>
    <div
      className="absolute bottom-0 left-0 right-0 h-0.5"
      style={{ background: `linear-gradient(90deg, transparent, var(${tone}), transparent)` }}
    />
  </div>
);

/**
 * 策略点位区组件 - 终端风格
 */
export const ReportStrategy: React.FC<ReportStrategyProps> = ({ strategy }) => {
  if (!strategy) {
    return null;
  }

  const strategyItems = [
    {
      label: '理想买入',
      value: strategy.idealBuy,
      tone: '--home-strategy-buy',
    },
    {
      label: '二次买入',
      value: strategy.secondaryBuy,
      tone: '--home-strategy-secondary',
    },
    {
      label: '止损价位',
      value: strategy.stopLoss,
      tone: '--home-strategy-stop',
    },
    {
      label: '止盈目标',
      value: strategy.takeProfit,
      tone: '--home-strategy-take',
    },
  ];

  return (
    <Card variant="bordered" padding="md" className="home-panel-card">
      <div className="mb-3 flex items-baseline gap-2">
        <span className="label-uppercase">STRATEGY POINTS</span>
        <h3 className="text-base font-semibold text-foreground">狙击点位</h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {strategyItems.map((item) => (
          <StrategyItem key={item.label} {...item} />
        ))}
      </div>
    </Card>
  );
};
