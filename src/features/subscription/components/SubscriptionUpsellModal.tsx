import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useSubscriptionUpsellStore } from '@/store/subscriptionUpsellStore';

interface Props {
    isAdminRole: boolean;
}

/**
 * The one popup every write-gated action in the app opens once the subscription has expired —
 * triggered via useSubscriptionReadOnly().blockAction(...), never this component directly.
 * Mounted once in MainLayout.tsx, driven by useSubscriptionUpsellStore so any component anywhere
 * can pop it without prop-drilling.
 */
export const SubscriptionUpsellModal: React.FC<Props> = ({ isAdminRole }) => {
    const navigate = useNavigate();
    const { isOpen, featureLabel, close } = useSubscriptionUpsellStore();

    const handleRenew = () => {
        close();
        navigate('/subscription');
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
            <DialogContent className="max-w-sm text-center sm:text-center">
                <DialogHeader className="items-center sm:items-center">
                    <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-500/30">
                        <Sparkles className="h-7 w-7" />
                    </div>
                    <DialogTitle className="text-lg font-bold">
                        {featureLabel ? `${featureLabel} needs an active plan` : 'This needs an active plan'}
                    </DialogTitle>
                    <DialogDescription className="pt-1 text-sm leading-relaxed">
                        {isAdminRole
                            ? "You're all set to keep viewing everything — booking, editing, and billing just need your subscription renewed first. It only takes a minute."
                            : "Your hospital's subscription has lapsed. Ask your administrator to renew it to keep booking, editing, and billing patients."}
                    </DialogDescription>
                </DialogHeader>

                {isAdminRole ? (
                    <Button
                        onClick={handleRenew}
                        className="mt-2 w-full bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 gap-2 shadow-lg shadow-brand-500/30"
                    >
                        Renew Subscription
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                ) : (
                    <Button variant="outline" onClick={close} className="mt-2 w-full">
                        Got it
                    </Button>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default SubscriptionUpsellModal;
