import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';

interface ExitConfirmationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmExit: () => void;
  gameName: string;
}

export const ExitConfirmationDialog: React.FC<ExitConfirmationDialogProps> = ({
  isOpen,
  onOpenChange,
  onConfirmExit,
  gameName
}) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-destructive/10 rounded-full">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-xl">
              تأكيد الخروج من المباراة
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3 pt-2">
            <p className="text-base font-semibold text-foreground">
              هل أنت متأكد من الخروج من مباراة {gameName}؟
            </p>

            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg space-y-2">
              <p className="text-sm font-medium text-destructive flex items-center gap-2">
                <span className="text-lg">⚠️</span>
                تحذير مهم:
              </p>
              <ul className="text-sm space-y-1 mr-6 text-foreground/90">
                <li className="flex items-start gap-2">
                  <span className="text-destructive">•</span>
                  <span>الخروج يعني <strong>الاستسلام</strong> وخسارة المباراة</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive">•</span>
                  <span>الجائزة ستذهب بالكامل للاعب الآخر</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive">•</span>
                  <span>سيتم خصم مبلغ الرهان من رصيدك</span>
                </li>
              </ul>
            </div>

            <p className="text-sm text-muted-foreground pt-2">
              إذا كنت تريد الاستمرار في اللعب، اضغط على "البقاء في المباراة"
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary-glow text-primary-foreground hover:opacity-90 border-0">
            البقاء في المباراة
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirmExit}
            className="w-full sm:w-auto bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            نعم، الخروج والاستسلام
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
