import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

import { SharedMobileVerification } from '@/components/shared/SharedMobileVerification';
import { clearDevOtp, devOtpFor, rememberDevOtp, useDevOtp } from './devOtp';

const noop = () => {};

function renderStep(props: Partial<React.ComponentProps<typeof SharedMobileVerification>> = {}) {
  const onOtpChange = vi.fn();
  render(
    <SharedMobileVerification
      mobile="9000000001"
      otp=""
      otpSent
      resendTimer={0}
      isLoading={false}
      onMobileChange={noop}
      onOtpChange={onOtpChange}
      onSendOTP={noop}
      onResendOTP={noop}
      onVerifyOTP={noop}
      autoVerify={false}
      {...props}
    />,
  );
  return { onOtpChange };
}

describe('tester code on the Dev server (devOtp)', () => {
  beforeEach(() => clearDevOtp());

  it('remembers a code for the number it was issued to, whatever the formatting', () => {
    rememberDevOtp('9000000001', '482913');
    expect(devOtpFor(useDevOtp.getState(), '+91 90000 00001')).toBe('482913');
    expect(devOtpFor(useDevOtp.getState(), '9876543210')).toBeNull();
  });

  it('forgets the code when the next answer carries none (a real number, or production)', () => {
    rememberDevOtp('9000000001', '482913');
    rememberDevOtp('9876543210', undefined);
    expect(devOtpFor(useDevOtp.getState(), '9000000001')).toBeNull();
  });

  it('shows the code on the code-entry step and fills it in on "Use it"', () => {
    rememberDevOtp('9000000001', '482913');
    const { onOtpChange } = renderStep();

    expect(screen.getByTestId('dev-otp-code')).toHaveTextContent('482913');
    fireEvent.click(screen.getByRole('button', { name: 'Use it' }));
    expect(onOtpChange).toHaveBeenCalledWith('482913');
  });

  it('shows nothing when no code came back (every real number, and all of production)', () => {
    renderStep();
    expect(screen.queryByTestId('dev-otp')).toBeNull();
  });

  it('shows nothing before the code step, or for a different number', () => {
    rememberDevOtp('9000000001', '482913');
    renderStep({ otpSent: false });
    expect(screen.queryByTestId('dev-otp')).toBeNull();

    renderStep({ mobile: '9876543210' });
    expect(screen.queryByTestId('dev-otp')).toBeNull();
  });
});
