import { useState, useCallback, useEffect } from 'react';

export interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: string;
    unlocked: boolean;
    xpValue: number;
}

export const useGamification = () => {
    const [xp, setXp] = useState<number>(() => {
        const saved = localStorage.getItem('doctor_xp');
        return saved ? parseInt(saved, 10) : 0;
    });

    const [level, setLevel] = useState<number>(1);
    const [streak, setStreak] = useState<number>(5); // Mocked for now
    const [nextLevelXp, setNextLevelXp] = useState<number>(1000);

    // Calculate level based on XP
    useEffect(() => {
        const calculatedLevel = Math.floor(xp / 1000) + 1;
        setLevel(calculatedLevel);
        setNextLevelXp(calculatedLevel * 1000);
        localStorage.setItem('doctor_xp', xp.toString());
    }, [xp]);

    const addXp = useCallback((amount: number) => {
        setXp(prev => prev + amount);
        // Potential for "Level Up" toast/animation trigger here
    }, []);

    const [achievements] = useState<Achievement[]>([
        {
            id: 'early_bird',
            title: 'The Early Bird',
            description: 'Start your first appointment on time',
            icon: '🌅',
            unlocked: true,
            xpValue: 100
        },
        {
            id: 'volume_master',
            title: 'Volume Master',
            description: 'Complete 50 appointments in a week',
            icon: '🔥',
            unlocked: false,
            xpValue: 500
        },
        {
            id: 'perfect_week',
            title: 'Perfect Week',
            description: '100% schedule attendance',
            icon: '⭐',
            unlocked: false,
            xpValue: 1000
        }
    ]);

    const currentLevelProgress = ((xp % 1000) / 1000) * 100;

    return {
        xp,
        level,
        streak,
        nextLevelXp,
        currentLevelProgress,
        addXp,
        achievements
    };
};
