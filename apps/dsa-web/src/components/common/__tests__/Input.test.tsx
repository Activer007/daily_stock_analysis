import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Input } from '../Input';

describe('Input', () => {
  it('wires label and hint text to the input', () => {
    render(<Input label="API Key" hint="Stored locally" name="api_key" />);

    const input = screen.getByLabelText('API Key');
    expect(input).toHaveAttribute('id', 'api_key');
    expect(input).toHaveAttribute('aria-describedby', 'api_key-hint');
    expect(screen.getByText('Stored locally')).toBeInTheDocument();
  });

  it('marks the input invalid and shows the error message', () => {
    render(<Input label="Code" error="Required" name="stock_code" />);

    const input = screen.getByLabelText('Code');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'stock_code-error');
    expect(screen.getByRole('alert')).toHaveTextContent('Required');
  });

  it('renders a trailing action when provided', () => {
    render(
      <Input
        label="Password"
        name="password"
        trailingAction={<button type="button">显示</button>}
      />
    );

    expect(screen.getByRole('button', { name: '显示' })).toBeInTheDocument();
  });
});
