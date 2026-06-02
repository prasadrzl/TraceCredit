'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';

import { StepLanding }    from '@/components/onboarding/step-landing';
import { StepWallet }     from '@/components/onboarding/step-wallet';
import { StepSbtIntro }   from '@/components/onboarding/step-sbt-intro';
import { StepSbtStake }   from '@/components/onboarding/step-sbt-stake';
import { StepSbtSuccess } from '@/components/onboarding/step-sbt-success';

type Step = 0 | 1 | 2 | 3 | 4;

export default function OnboardingPage() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const [step, setStep] = useState<Step>(0);

  // Skip wallet step if already connected when advancing from landing
  const handleGetStarted = () => {
    setStep(isConnected ? 2 : 1);
  };

  const handleWalletConnected = () => setStep(2);
  const handleSbtIntroNext    = () => setStep(3);
  const handleSbtStakeNext    = () => setStep(4);

  const handleDone = () => router.push('/');

  // If user navigates here while on sbt steps and disconnects, bring back to wallet
  useEffect(() => {
    if (!isConnected && step >= 2) setStep(1);
  }, [isConnected, step]);

  if (step === 0) return <StepLanding    onGetStarted={handleGetStarted} />;
  if (step === 1) return <StepWallet     onConnected={handleWalletConnected} onBack={() => setStep(0)} />;
  if (step === 2) return <StepSbtIntro   onNext={handleSbtIntroNext} onBack={() => setStep(isConnected ? 0 : 1)} />;
  if (step === 3) return <StepSbtStake   onNext={handleSbtStakeNext} onBack={() => setStep(2)} />;
  return               <StepSbtSuccess onDone={handleDone} />;
}
