import React, { useState } from 'react';
import { Template } from '../types';
import { LoyaltyCard } from './LoyaltyCard';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { ArrowLeft, Check as CheckIcon, Smartphone, Image as ImageIcon, Type, Palette, Grid } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ICON_OPTIONS } from '../lib/iconRegistry';

interface CardEditorProps {
  initialTemplate: Template;
  onSave: (template: Template) => Promise<void>;
}

export const CardEditor: React.FC<CardEditorProps> = ({ initialTemplate, onSave }) => {
  const navigate = useNavigate();
  const [template, setTemplate] = useState<Template>(initialTemplate);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveError, setSaveError] = useState("");
  
  const [bgHex, setBgHex] = useState(template.colors.background || '#ffffff');
  const [bgIntensity, setBgIntensity] = useState(template.backgroundOpacity ?? 100);
  const [textHex, setTextHex] = useState(template.colors.text || '#000000');
  
  const [stampInactiveBgHex, setStampInactiveBgHex] = useState(template.colors.stampInactive || '#cccccc');
  const [stampInactiveIconHex, setStampInactiveIconHex] = useState(template.colors.iconInactive || '#888888');

  const [stampActiveBgHex, setStampActiveBgHex] = useState(template.colors.stampActive || '#000000');
  const [stampActiveIconHex, setStampActiveIconHex] = useState(template.colors.iconActive || '#ffffff');
  
  const handleChange = <K extends keyof Template>(field: K, value: Template[K]) => {
    setTemplate(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSocialChange = (field: 'instagram' | 'facebook' | 'tiktok' | 'x' | 'youtube' | 'website', value: string) => {
    const trimmed = value.trim();
    setTemplate(prev => ({
      ...prev,
      social: {
        ...prev.social,
        [field]: trimmed.length === 0 ? undefined : value
      }
    }));
  };

  const handleStampsChange = (value: number) => {
    if (!Number.isNaN(value)) {
        setTemplate(prev => ({
            ...prev,
            totalStamps: Math.min(Math.max(value, 3), 16)
        }));
    }
  };

  const updateColors = (
    type: 'background' | 'text' | 'stampInactiveBg' | 'stampInactiveIcon' | 'stampActiveBg' | 'stampActiveIcon', 
    hex: string, 
    intensity?: number
  ) => {
    setTemplate(prev => {
        const newColors = { ...prev.colors };
        let nextOpacity = prev.backgroundOpacity ?? 100;
        
        if (type === 'background') {
            const opacity = intensity !== undefined ? intensity : bgIntensity;
            newColors.background = hex;
            newColors.cardBackground = hex; 
            setBgHex(hex);
            nextOpacity = opacity;
            if(intensity !== undefined) setBgIntensity(intensity);
        } else if (type === 'text') {
            newColors.text = hex;
            newColors.muted = hex;
            setTextHex(hex);
        } else if (type === 'stampInactiveBg') {
            newColors.stampInactive = hex; 
            setStampInactiveBgHex(hex);
        } else if (type === 'stampInactiveIcon') {
            newColors.iconInactive = hex;
            setStampInactiveIconHex(hex);
        } else if (type === 'stampActiveBg') {
            newColors.stampActive = hex; 
            newColors.button = hex; 
            setStampActiveBgHex(hex);
        } else if (type === 'stampActiveIcon') {
            newColors.iconActive = hex;
            setStampActiveIconHex(hex);
        }
        return { ...prev, backgroundOpacity: nextOpacity, colors: newColors };
    });
  };

  const handleSave = async () => {
    setSaveError("");
    setSaveBusy(true);
    try {
      await onSave(template);
      navigate('/campaigns');
    } catch {
      setSaveError('Unable to save this campaign right now. Please try again.');
    } finally {
      setSaveBusy(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row font-sans">
      <div className="w-full lg:w-1/3 p-6 lg:p-10 border-r bg-white flex flex-col gap-6 h-screen overflow-hidden z-20 shadow-xl lg:shadow-none">
        <div className="flex items-center gap-2 mb-2 shrink-0">
            <Button variant="ghost" size="icon" onClick={handleCancel} className="rounded-full">
                <ArrowLeft size={20} />
            </Button>
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Customize</h1>
                <p className="text-sm text-muted-foreground">Design your perfect loyalty card.</p>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 no-scrollbar">
            <Accordion type="single" collapsible defaultValue="design" className="w-full">
                <AccordionItem value="general">
                    <AccordionTrigger>
                        <span className="flex items-center gap-2"><Type size={16}/> General Info</span>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2">
                        <div className="space-y-2">
                            <Label htmlFor="businessName">Name</Label>
                            <Input 
                                id="businessName" 
                                value={template.name} 
                                onChange={(e) => handleChange('name', e.target.value)} 
                                placeholder="e.g. Joe's Coffee"
                            />
                        </div>
                        
                        <div className="space-y-4 pt-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="showLogo" className="text-sm font-medium">Show Main Logo</Label>
                                <Switch 
                                    id="showLogo"
                                    checked={template.showLogo !== false}
                                    onCheckedChange={(checked) => handleChange('showLogo', checked)}
                                />
                            </div>
                        </div>

                        {template.showLogo !== false && (
                             <div className="space-y-2">
                                <Label htmlFor="logoImage">Brand Logo URL</Label>
                                <Input 
                                    id="logoImage" 
                                    value={template.logoImage || ''} 
                                    onChange={(e) => handleChange('logoImage', e.target.value)} 
                                    placeholder="https://example.com/logo.png"
                                />
                                <p className="text-xs text-muted-foreground">Replaces the default icon in the header.</p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="rewardName">Reward Name</Label>
                            <Input 
                                id="rewardName" 
                                value={template.rewardName} 
                                onChange={(e) => handleChange('rewardName', e.target.value)} 
                                placeholder="e.g. Free Coffee"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tagline">Tagline / Instruction</Label>
                            <Input 
                                id="tagline" 
                                value={template.tagline || ''} 
                                onChange={(e) => handleChange('tagline', e.target.value)} 
                                placeholder={`Collect ${template.totalStamps} stamps for a...`}
                            />
                            <p className="text-xs text-muted-foreground">Override the default "Collect X stamps..." text.</p>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between gap-3">
                                <Label htmlFor="totalStamps">Number of Stamps</Label>
                                <span className="inline-flex min-w-12 items-center justify-center rounded-full bg-secondary px-3 py-1 text-sm font-semibold">
                                    {template.totalStamps}
                                </span>
                            </div>
                            <input
                                id="totalStamps"
                                type="range"
                                min={3}
                                max={16}
                                step={1}
                                value={template.totalStamps}
                                onChange={(e) => handleStampsChange(parseInt(e.target.value, 10))}
                                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>3</span>
                                <span>16</span>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="design">
                    <AccordionTrigger>
                        <span className="flex items-center gap-2"><Palette size={16}/> Design & Colors</span>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-6 pt-2">
                        <div className="space-y-3">
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Background</Label>
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full overflow-hidden border shadow-sm shrink-0 relative">
                                    <input 
                                        type="color" 
                                        value={bgHex}
                                        onChange={(e) => updateColors('background', e.target.value)}
                                        className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer"
                                    />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <Label className="text-xs">
                                      {template.backgroundImage ? "Overlay Opacity" : "Color Intensity"} ({bgIntensity}%)
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-muted-foreground">
                                          {template.backgroundImage ? "Clear" : "Transparent"}
                                        </span>
                                        <input 
                                            type="range" 
                                            min="0" 
                                            max="100" 
                                            value={bgIntensity} 
                                            onChange={(e) => updateColors('background', bgHex, parseInt(e.target.value))}
                                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                        />
                                        <span className="text-[10px] text-muted-foreground">Solid</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-1 mt-2">
                                <Label htmlFor="bgImage" className="text-xs">Background Image URL</Label>
                                <div className="flex gap-2">
                                    <Input 
                                        id="bgImage" 
                                        value={template.backgroundImage || ''} 
                                        onChange={(e) => handleChange('backgroundImage', e.target.value)} 
                                        placeholder="https://..."
                                        className="text-xs"
                                    />
                                    <Button variant="outline" size="icon" onClick={() => handleChange('backgroundImage', '')} title="Clear Image">
                                        <ImageIcon size={14} />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-3">
                                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Empty Slot</Label>
                                
                                <div className="space-y-1">
                                    <p className="text-[10px] text-muted-foreground">Background</p>
                                    <div className="flex items-center gap-2">
                                        <div className="h-8 w-8 rounded-md overflow-hidden border shadow-sm shrink-0 relative">
                                            <input 
                                                type="color" 
                                                value={stampInactiveBgHex}
                                                onChange={(e) => updateColors('stampInactiveBg', e.target.value)}
                                                className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer"
                                            />
                                        </div>
                                        <span className="text-[10px] font-mono text-muted-foreground">{stampInactiveBgHex}</span>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-[10px] text-muted-foreground">Icon Color</p>
                                    <div className="flex items-center gap-2">
                                        <div className="h-8 w-8 rounded-md overflow-hidden border shadow-sm shrink-0 relative">
                                            <input 
                                                type="color" 
                                                value={stampInactiveIconHex}
                                                onChange={(e) => updateColors('stampInactiveIcon', e.target.value)}
                                                className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer"
                                            />
                                        </div>
                                        <span className="text-[10px] font-mono text-muted-foreground">{stampInactiveIconHex}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Filled Slot</Label>
                                
                                <div className="space-y-1">
                                    <p className="text-[10px] text-muted-foreground">Background</p>
                                    <div className="flex items-center gap-2">
                                        <div className="h-8 w-8 rounded-md overflow-hidden border shadow-sm shrink-0 relative">
                                            <input 
                                                type="color" 
                                                value={stampActiveBgHex}
                                                onChange={(e) => updateColors('stampActiveBg', e.target.value)}
                                                className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer"
                                            />
                                        </div>
                                        <span className="text-[10px] font-mono text-muted-foreground">{stampActiveBgHex}</span>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-[10px] text-muted-foreground">Icon Color</p>
                                    <div className="flex items-center gap-2">
                                        <div className="h-8 w-8 rounded-md overflow-hidden border shadow-sm shrink-0 relative">
                                            <input 
                                                type="color" 
                                                value={stampActiveIconHex}
                                                onChange={(e) => updateColors('stampActiveIcon', e.target.value)}
                                                className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer"
                                            />
                                        </div>
                                        <span className="text-[10px] font-mono text-muted-foreground">{stampActiveIconHex}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2 pt-2 border-t">
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Main Text Color</Label>
                            <div className="flex items-center gap-2">
                                <div className="h-10 w-10 rounded-md overflow-hidden border shadow-sm shrink-0 relative">
                                    <input 
                                        type="color" 
                                        value={textHex}
                                        onChange={(e) => updateColors('text', e.target.value)}
                                        className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer"
                                    />
                                </div>
                                <span className="text-xs text-muted-foreground font-mono">{textHex}</span>
                            </div>
                        </div>

                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="icons">
                    <AccordionTrigger>
                        <span className="flex items-center gap-2"><Grid size={16}/> Icon</span>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2">
                        <div className="grid grid-cols-4 gap-2">
                            {ICON_OPTIONS.map((item, idx) => {
                                const IsSelected = template.icon === item.icon;
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => handleChange('icon', item.icon)}
                                        className={`
                                            flex flex-col items-center justify-center gap-1 p-3 rounded-lg border transition-all
                                            ${IsSelected 
                                                ? 'bg-primary text-primary-foreground border-primary ring-2 ring-primary ring-offset-2' 
                                                : 'hover:bg-secondary hover:border-secondary-foreground/20 bg-white'
                                            }
                                        `}
                                    >
                                        <item.icon size={24} />
                                        <span className="text-[10px] font-medium truncate w-full text-center">{item.label}</span>
                                    </button>
                                )
                            })}
                        </div>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="social">
                    <AccordionTrigger>
                        <span className="flex items-center gap-2"><Smartphone size={16}/> Social</span>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2">
                        <div className="space-y-2">
                            <Label htmlFor="social-instagram">Instagram</Label>
                            <Input
                                id="social-instagram"
                                value={template.social?.instagram || ''}
                                onChange={(e) => handleSocialChange('instagram', e.target.value)}
                                placeholder="@yourbrand or https://instagram.com/yourbrand"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="social-facebook">Facebook</Label>
                            <Input
                                id="social-facebook"
                                value={template.social?.facebook || ''}
                                onChange={(e) => handleSocialChange('facebook', e.target.value)}
                                placeholder="yourbrand or https://facebook.com/yourbrand"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="social-tiktok">TikTok</Label>
                            <Input
                                id="social-tiktok"
                                value={template.social?.tiktok || ''}
                                onChange={(e) => handleSocialChange('tiktok', e.target.value)}
                                placeholder="@yourbrand or https://tiktok.com/@yourbrand"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="social-x">X</Label>
                            <Input
                                id="social-x"
                                value={template.social?.x || ''}
                                onChange={(e) => handleSocialChange('x', e.target.value)}
                                placeholder="@yourbrand or https://x.com/yourbrand"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="social-youtube">YouTube</Label>
                            <Input
                                id="social-youtube"
                                value={template.social?.youtube || ''}
                                onChange={(e) => handleSocialChange('youtube', e.target.value)}
                                placeholder="@yourbrand or https://youtube.com/@yourbrand"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="social-website">Website</Label>
                            <Input
                                id="social-website"
                                value={template.social?.website || ''}
                                onChange={(e) => handleSocialChange('website', e.target.value)}
                                placeholder="https://yourbrand.com"
                            />
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>

        <div className="pt-6 border-t mt-auto shrink-0">
            {saveError && (
                <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {saveError}
                </div>
            )}
            <Button size="lg" className="w-full gap-2 text-lg font-semibold h-14" onClick={handleSave} disabled={saveBusy}>
                {saveBusy ? 'Saving...' : 'Save'} <CheckIcon size={20} />
            </Button>
        </div>
      </div>

      <div className="flex-1 bg-gray-100 p-6 lg:p-12 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="relative w-full h-full max-w-none overflow-hidden lg:max-w-[380px] lg:h-[750px] lg:rounded-[3rem]">
          <div className="w-full h-full overflow-hidden">
            <LoyaltyCard 
              template={template} 
              mode="preview" 
              className="h-full w-full"
            />
          </div>
        </div>
        <p className="mt-8 text-muted-foreground text-sm font-medium uppercase tracking-widest">Live Preview</p>
      </div>
    </div>
  );
};
