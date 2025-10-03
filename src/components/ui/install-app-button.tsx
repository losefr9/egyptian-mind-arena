import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, Check } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';
import { toast } from 'sonner';

export const InstallAppButton: React.FC = () => {
  const { isInstallable, isInstalled, installApp } = usePWA();

  const handleInstall = async () => {
    const success = await installApp();
    if (success) {
      toast.success('🎉 تم تثبيت التطبيق بنجاح! يمكنك الآن فتحه من الشاشة الرئيسية');
    } else {
      toast.error('فشل تثبيت التطبيق. حاول مرة أخرى لاحقاً');
    }
  };

  if (isInstalled) {
    return (
      <Button variant="outline" disabled className="gap-2">
        <Check className="h-4 w-4" />
        التطبيق مثبت
      </Button>
    );
  }

  if (!isInstallable) {
    return null;
  }

  return (
    <Button 
      onClick={handleInstall}
      variant="default"
      className="gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90"
    >
      <Download className="h-4 w-4" />
      تثبيت التطبيق
    </Button>
  );
};