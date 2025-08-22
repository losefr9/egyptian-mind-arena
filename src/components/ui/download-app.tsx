import React from 'react';
import { Button } from './button';
import { Card, CardContent } from './card';
import { Download, Smartphone } from 'lucide-react';

export const DownloadApp = () => {
  const handleDownload = () => {
    // سيتم تنفيذ تحميل التطبيق هنا
    console.log('بدء تحميل التطبيق...');
    // يمكن إضافة منطق PWA هنا لاحقاً
  };

  return (
    <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20 mb-6">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-primary/20 rounded-lg flex items-center justify-center">
              <Smartphone className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">تحميل التطبيق</h3>
              <p className="text-sm text-muted-foreground">
                احصل على تجربة أفضل مع تطبيق الهاتف المحمول
              </p>
            </div>
          </div>
          <Button 
            variant="golden" 
            onClick={handleDownload}
            className="flex items-center gap-2"
          >
            <Download size={16} />
            تحميل للأندرويد
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};