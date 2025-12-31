import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Sparkles, Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const PatientsPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <Card className="w-full max-w-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-0 shadow-2xl overflow-hidden relative group">

        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all duration-700"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all duration-700"></div>

        <CardContent className="flex flex-col items-center justify-center p-16 text-center relative z-10">
          <div className="mb-8 relative">
            <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full scale-150 animate-pulse"></div>
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-6 rounded-2xl shadow-lg relative transform group-hover:scale-110 transition-transform duration-500">
              <Users className="h-12 w-12 text-white" />
            </div>

            {/* Floating particles */}
            <Activity className="absolute -top-4 -right-6 h-6 w-6 text-blue-400 animate-bounce delay-100" />
            <Sparkles className="absolute -bottom-2 -left-6 h-5 w-5 text-purple-400 animate-pulse delay-700" />
          </div>

          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 mb-4 tracking-tight">
            Patient 360
          </h1>

          <div className="h-1 w-24 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mb-6"></div>

          <p className="text-xl text-gray-600 dark:text-gray-300 font-medium mb-2">
            A Comprehensive View is Coming Soon
          </p>

          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
            We are crafting a unified experience to visualize patient history, vitals, and appointments all in one place.
          </p>

          <div className="mt-10 flex gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 ring-1 ring-inset ring-blue-700/10">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              In Development
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};