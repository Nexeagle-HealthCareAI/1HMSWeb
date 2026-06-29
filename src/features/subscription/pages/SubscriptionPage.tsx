import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import { apiClient } from '@/services/axiosClient';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/use-toast';

export const SubscriptionPage = () => {
    const { toast } = useToast();
    const hospitalId = useAuthStore(state => state.hospitalId);
    const [status, setStatus] = useState<any>(null);
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentReference, setPaymentReference] = useState('');
    const [submittingPayment, setSubmittingPayment] = useState(false);

    useEffect(() => {
        const fetchStatus = async () => {
            if (!hospitalId) return;
            try {
                const res = await apiClient.get(`/api/v1/Subscription/${hospitalId}`);
                setStatus(res);
            } catch (err) {
                console.error('Failed to get status', err);
            }
        };

        const fetchPlans = async () => {
            try {
                const response = await axios.get('http://151.185.45.77:5002/api/v1/SubscriptionPlans');
                const mappedPlans = response.data.map((p: any) => ({
                    id: p.planId,
                    name: p.name,
                    basePrice: p.basePrice,
                    discountedPrice: p.discountPrice,
                    billingCycle: p.billingCycle,
                    features: ['Appointment', 'Auto billing', 'IPD', 'Prescription writing', 'Advance analytics', 'Training', '24*7 Support']
                }));
                setPlans(mappedPlans);
            } catch (err) {
                console.error(err);
            }
        };

        Promise.all([fetchStatus(), fetchPlans()]).finally(() => setLoading(false));
    }, [hospitalId]);

    const handleSelectPlan = async (planId: string) => {
        try {
            await apiClient.post(`/api/v1/Subscription/${hospitalId}/select-plan`, { planId });
            toast({
                title: 'Plan Selected',
                description: 'Your plan has been selected. Please submit your payment details.',
            });
            // Refresh status
            const res = await apiClient.get(`/api/v1/Subscription/${hospitalId}`);
            setStatus(res);
        } catch (err: any) {
            toast({
                title: 'Error',
                description: err.response?.data?.message || 'Failed to select plan',
                variant: 'destructive'
            });
        }
    };

    const handleSubmitPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!paymentAmount || !paymentReference) {
            toast({ title: 'Validation Error', description: 'Please enter amount and reference.', variant: 'destructive' });
            return;
        }

        setSubmittingPayment(true);
        try {
            await apiClient.post(`/api/v1/Subscription/${hospitalId}/submit-payment`, { 
                amount: Number(paymentAmount), 
                reference: paymentReference 
            });
            toast({
                title: 'Payment Submitted',
                description: 'Your payment details have been submitted and are pending approval by CMS.',
            });
            // Refresh status
            const res = await apiClient.get(`/api/v1/Subscription/${hospitalId}`);
            setStatus(res);
            setPaymentAmount('');
            setPaymentReference('');
        } catch (err: any) {
            toast({
                title: 'Error',
                description: err.response?.data?.message || 'Failed to submit payment',
                variant: 'destructive'
            });
        } finally {
            setSubmittingPayment(false);
        }
    };

    if (loading) return <div className="p-10 text-center">Loading subscription details...</div>;

    const isBlocked = status?.status === 'Expired' || status?.status === 'Blocked';
    const isPending = status?.status === 'Pending';
    const isPendingApproval = status?.status === 'PendingApproval';

    return (
        <div className="container mx-auto py-10 max-w-5xl">
            <h1 className="text-3xl font-bold mb-6">Manage Subscription</h1>

            {status ? (
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle>Current Subscription Info</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Status</p>
                                <p className="font-semibold">{status.status}</p>
                            </div>
                            {status.daysLeft !== undefined && status.daysLeft >= 0 && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Time Remaining</p>
                                    <p className="font-semibold text-brand-600">{status.daysLeft} days</p>
                                </div>
                            )}
                            {status.paymentAmount !== undefined && status.paymentAmount !== null && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Last Payment</p>
                                    <p className="font-semibold">₹{status.paymentAmount}</p>
                                </div>
                            )}
                            {status.paymentDate && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Payment Date</p>
                                    <p className="font-semibold">{new Date(status.paymentDate).toLocaleDateString()}</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 mb-8 rounded-md flex items-start">
                    <div>
                        <h3 className="text-blue-800 dark:text-blue-300 font-semibold text-lg">No Active Subscription</h3>
                        <p className="text-blue-700 dark:text-blue-400 mt-1">
                            You currently do not have an active subscription plan. Please select a plan below to get started.
                        </p>
                    </div>
                </div>
            )}

            {isBlocked && (
                <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 mb-8 rounded-md flex items-start">
                    <AlertTriangle className="text-red-500 mr-3 mt-0.5" />
                    <div>
                        <h3 className="text-red-800 dark:text-red-300 font-semibold text-lg">Subscription Inactive</h3>
                        <p className="text-red-700 dark:text-red-400 mt-1">
                            Your trial or subscription has expired. Please select a plan to continue using EasyHMS.
                        </p>
                    </div>
                </div>
            )}

            {isPendingApproval && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-4 mb-8 rounded-md flex items-start">
                    <AlertTriangle className="text-yellow-600 mr-3 mt-0.5" />
                    <div>
                        <h3 className="text-yellow-800 dark:text-yellow-300 font-semibold text-lg">Payment Verification Pending</h3>
                        <p className="text-yellow-700 dark:text-yellow-400 mt-1">
                            We are verifying your payment. Your account will be activated shortly.
                        </p>
                    </div>
                </div>
            )}

            {isPending && (
                <Card className="mb-8 border-brand-500 border-2">
                    <CardHeader>
                        <CardTitle>Submit Payment Details</CardTitle>
                        <CardDescription>
                            You have selected a plan. Please transfer the amount and provide the transaction reference below.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmitPayment} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="amount">Amount Paid (₹)</Label>
                                <Input 
                                    id="amount" 
                                    type="number" 
                                    placeholder="Enter amount" 
                                    value={paymentAmount}
                                    onChange={e => setPaymentAmount(e.target.value)}
                                    required 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="reference">Transaction Reference / UTR Number</Label>
                                <Input 
                                    id="reference" 
                                    type="text" 
                                    placeholder="Enter reference number" 
                                    value={paymentReference}
                                    onChange={e => setPaymentReference(e.target.value)}
                                    required 
                                />
                            </div>
                            <Button type="submit" disabled={submittingPayment}>
                                {submittingPayment ? 'Submitting...' : 'Submit Payment Info'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            )}

            <div className="grid md:grid-cols-2 gap-8 mt-8">
                {plans.map(plan => (
                    <Card key={plan.id} className={`border-2 ${plan.billingCycle === 'Yearly' ? 'border-brand-500 shadow-lg' : 'border-gray-200'} relative`}>
                        {plan.billingCycle === 'Yearly' && (
                            <div className="absolute top-0 right-0 bg-brand-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-md">
                                BEST VALUE
                            </div>
                        )}
                        <CardHeader>
                            <CardTitle className="text-2xl">{plan.name}</CardTitle>
                            <CardDescription>Billed {plan.billingCycle.toLowerCase()}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="mb-6">
                                <div className="flex items-center gap-3">
                                    <span className="text-4xl font-extrabold text-gray-900 dark:text-white">₹{plan.discountedPrice}</span>
                                    <span className="text-muted-foreground">/ month</span>
                                </div>
                                <div className="mt-2 flex items-center gap-3">
                                    <div className="text-sm text-muted-foreground line-through decoration-gray-400">₹{plan.basePrice} / month</div>
                                    <div className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-extrabold px-2 py-1 rounded-md shadow-sm border border-green-200 dark:border-green-800">
                                        SAVE {Math.round(((plan.basePrice - plan.discountedPrice) / plan.basePrice) * 100)}%
                                    </div>
                                </div>
                            </div>
                            <ul className="space-y-3">
                                {plan.features.map((feature: string, idx: number) => (
                                    <li key={idx} className="flex items-center">
                                        <CheckCircle className="text-green-500 w-5 h-5 mr-3 flex-shrink-0" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                        <CardFooter>
                            <Button 
                                className="w-full" 
                                size="lg" 
                                variant={plan.billingCycle === 'Yearly' ? 'default' : 'outline'}
                                onClick={() => handleSelectPlan(plan.id)}
                                disabled={isPending}
                            >
                                {isPending ? 'Pending Approval' : 'Select Plan'}
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default SubscriptionPage;
