import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthSettingsCard } from '../AuthSettingsCard';

const { refreshStatus, updateSettings } = vi.hoisted(() => ({
  refreshStatus: vi.fn(),
  updateSettings: vi.fn(),
}));

vi.mock('../../../hooks', () => ({
  useAuth: () => ({
    authEnabled: false,
    refreshStatus,
  }),
}));

vi.mock('../../../api/auth', () => ({
  authApi: {
    updateSettings,
  },
}));

describe('AuthSettingsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('enables auth with a new password and refreshes status', async () => {
    updateSettings.mockResolvedValue(undefined);
    refreshStatus.mockResolvedValue(undefined);

    render(<AuthSettingsCard />);

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.change(screen.getByLabelText('新密码'), { target: { value: 'passwd6' } });
    fireEvent.change(screen.getByLabelText('确认新密码'), { target: { value: 'passwd6' } });
    fireEvent.click(screen.getByRole('button', { name: '开启认证' }));

    await waitFor(() => {
      expect(updateSettings).toHaveBeenCalledWith(true, 'passwd6', 'passwd6', undefined);
    });
    expect(refreshStatus).toHaveBeenCalled();
    expect(await screen.findByText('认证设置已更新')).toBeInTheDocument();
  });
});
