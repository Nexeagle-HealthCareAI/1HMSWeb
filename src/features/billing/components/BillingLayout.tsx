import React, { useState } from 'react';
import {
    Monitor, Save, RefreshCw, FileText, Upload, Trash2, Layout, Check, Image as ImageIcon, Ruler, Type
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';

export const BillingLayout: React.FC = () => {

    const [logo, setLogo] = useState<string | null>(null);
    const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
    const [backgroundType, setBackgroundType] = useState<'image' | 'pdf'>('image');

    // Layout Controls State
    const [margins, setMargins] = useState({ top: 23, bottom: 13, left: 13, right: 20 });
    const [overflowStrategy, setOverflowStrategy] = useState('reuse'); // 'reuse' | 'blank'
    const [typography, setTypography] = useState({
        family: 'Times New Roman',
        size: 9,
        weight: 'normal',
        color: '#5c4905'
    });

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const isPdf = file.type === 'application/pdf';
            setBackgroundType(isPdf ? 'pdf' : 'image');

            const reader = new FileReader();
            reader.onloadend = () => {
                setBackgroundImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };



    return (
        <div className="flex flex-col lg:flex-row gap-6 p-6 h-[calc(100vh-8rem)] overflow-hidden">

            {/* Editor Sidebar */}
            <div className="w-full lg:w-80 flex flex-col gap-6 overflow-y-auto pr-2">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                        <Layout className="h-6 w-6 text-brand-600" />
                        Invoice Layout
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Customize your invoice appearance.</p>
                </div>

                <Tabs defaultValue="style" className="w-full">
                    <TabsList className="w-full grid grid-cols-2">
                        <TabsTrigger value="style">Style</TabsTrigger>
                        <TabsTrigger value="layout">Layout</TabsTrigger>
                    </TabsList>

                    {/* Style Tab */}
                    <TabsContent value="style" className="space-y-6 mt-4">
                        <div className="space-y-3">
                            <Label>Background Template</Label>
                            {backgroundImage ? (
                                <div className="relative rounded-lg border overflow-hidden group">
                                    {backgroundType === 'pdf' ? (
                                        <div className="w-full h-32 bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                                            PDF Preview (See Live)
                                        </div>
                                    ) : (
                                        <img src={backgroundImage} alt="Background" className="w-full h-32 object-cover opacity-50" />
                                    )}
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="destructive" size="sm" onClick={() => setBackgroundImage(null)}>
                                            <Trash2 className="h-4 w-4 mr-2" /> Remove
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-brand-200 bg-brand-50/50 p-6 text-center cursor-pointer hover:bg-brand-50 transition-colors">
                                    <div className="p-2 bg-brand-100 rounded-full">
                                        <Upload className="h-5 w-5 text-brand-600" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-brand-900">Upload Design PDF/Image</p>
                                        <p className="text-xs text-brand-600/80">Use your hospital letterhead</p>
                                    </div>
                                    <Input
                                        type="file"
                                        accept="image/png, image/jpeg, application/pdf"
                                        className="hidden"
                                        onChange={handleFileUpload}
                                    />
                                </label>
                            )}
                        </div>


                    </TabsContent>

                    {/* Layout Tab */}
                    <TabsContent value="layout" className="space-y-6 mt-4 pr-1">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 pb-2 border-b">
                                <Ruler className="h-4 w-4 text-gray-500" />
                                <span className="font-semibold text-sm">Margin Settings (mm)</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Header Height</Label>
                                    <Input
                                        type="number"
                                        value={margins.top}
                                        onChange={(e) => setMargins({ ...margins, top: Number(e.target.value) })}
                                        className="h-8"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Footer Height</Label>
                                    <Input
                                        type="number"
                                        value={margins.bottom}
                                        onChange={(e) => setMargins({ ...margins, bottom: Number(e.target.value) })}
                                        className="h-8"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Left Margin</Label>
                                    <Input
                                        type="number"
                                        value={margins.left}
                                        onChange={(e) => setMargins({ ...margins, left: Number(e.target.value) })}
                                        className="h-8"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Right Margin</Label>
                                    <Input
                                        type="number"
                                        value={margins.right}
                                        onChange={(e) => setMargins({ ...margins, right: Number(e.target.value) })}
                                        className="h-8"
                                    />
                                </div>
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                            <div className="flex items-center gap-2 pb-2 border-b">
                                <Layout className="h-4 w-4 text-gray-500" />
                                <span className="font-semibold text-sm">Overflow Pages</span>
                            </div>
                            <RadioGroup value={overflowStrategy} onValueChange={setOverflowStrategy} className="space-y-3">
                                <div className="flex items-start space-x-2">
                                    <RadioGroupItem value="reuse" id="reuse" className="mt-1" />
                                    <Label htmlFor="reuse" className="font-normal cursor-pointer">
                                        <span className="font-medium block text-sm">Reuse uploaded layout</span>
                                        <span className="text-xs text-gray-500">Reuses imported background</span>
                                    </Label>
                                </div>
                                <div className="flex items-start space-x-2">
                                    <RadioGroupItem value="blank" id="blank" className="mt-1" />
                                    <Label htmlFor="blank" className="font-normal cursor-pointer">
                                        <span className="font-medium block text-sm">Use blank page</span>
                                        <span className="text-xs text-gray-500">Keep overflow sheets plain</span>
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                            <div className="flex items-center gap-2 pb-2 border-b">
                                <Type className="h-4 w-4 text-gray-500" />
                                <span className="font-semibold text-sm">Typography</span>
                            </div>

                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Font Family</Label>
                                    <Select
                                        value={typography.family}
                                        onValueChange={(val) => setTypography({ ...typography, family: val })}
                                    >
                                        <SelectTrigger className="h-8">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                                            <SelectItem value="Helvetica">Helvetica</SelectItem>
                                            <SelectItem value="Arial">Arial</SelectItem>
                                            <SelectItem value="Georgia">Georgia</SelectItem>
                                            <SelectItem value="Inter">Inter</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex justify-between">
                                        <Label className="text-xs">Font Size</Label>
                                        <span className="text-xs text-gray-500">{typography.size} pt</span>
                                    </div>
                                    <Slider
                                        value={[typography.size]}
                                        min={8} max={16} step={1}
                                        onValueChange={(vals) => setTypography({ ...typography, size: vals[0] })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Weight</Label>
                                        <Select
                                            value={typography.weight}
                                            onValueChange={(val) => setTypography({ ...typography, weight: val })}
                                        >
                                            <SelectTrigger className="h-8">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="normal">Regular</SelectItem>
                                                <SelectItem value="bold">Bold</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Text Color</Label>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="color"
                                                className="h-8 w-8 p-0 border-0"
                                                value={typography.color}
                                                onChange={(e) => setTypography({ ...typography, color: e.target.value })}
                                            />
                                            <span className="text-xs text-gray-500 font-mono">{typography.color}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TabsContent>



                </Tabs>

                <div className="mt-auto pt-4 border-t flex flex-col gap-2">
                    <Button className="w-full bg-brand-600 hover:bg-brand-700">
                        <Save className="h-4 w-4 mr-2" /> Save Layout
                    </Button>
                </div>


            </div>

            {/* Live Preview Area */}
            <div className="flex-1 bg-gray-100 dark:bg-gray-900/50 rounded-xl overflow-hidden flex flex-col border shadow-inner">
                <div className="p-3 bg-white dark:bg-gray-800 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Monitor className="h-4 w-4" />
                        <span>Live Preview</span>
                    </div>

                </div>

                <div className="flex-1 overflow-auto p-8 flex justify-center items-start">
                    {/* Invoice Mockup Page */}
                    <div
                        className="w-full max-w-[210mm] min-h-[297mm] bg-white shadow-2xl transition-all duration-300 flex flex-col relative overflow-hidden"
                        style={{
                            fontFamily: `"${typography.family}", serif`,
                            fontSize: `${typography.size}pt`,
                            fontWeight: typography.weight === 'bold' ? 'bold' : 'normal',
                            color: typography.color,
                            paddingTop: `${margins.top}mm`,
                            paddingBottom: `${margins.bottom}mm`,
                            paddingLeft: `${margins.left}mm`,
                            paddingRight: `${margins.right}mm`,
                        }}
                    >
                        {backgroundImage && (
                            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                                {backgroundType === 'pdf' ? (
                                    <iframe
                                        src={`${backgroundImage}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                                        className="w-full h-full border-0"
                                        title="Background PDF"
                                    />
                                ) : (
                                    <img src={backgroundImage} alt="Background" className="w-full h-full object-cover opacity-100" />
                                )}
                            </div>
                        )}

                        <div className="relative z-10 flex flex-col h-full pointer-events-none">
                            {/* Overlay removed as requested */}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
