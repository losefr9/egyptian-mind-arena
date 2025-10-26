import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'ar' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  dir: 'rtl' | 'ltr';
}

const translations = {
  ar: {
    // Navigation
    home: 'الرئيسية',
    games: 'الألعاب',
    deposit: 'الإيداع',
    withdraw: 'السحب',
    referral: 'الإحالة',
    login: 'تسجيل الدخول',
    signup: 'إنشاء حساب',
    logout: 'تسجيل الخروج',

    // User Menu
    balance: 'الرصيد',
    adminPanel: 'لوحة التحكم',
    contact: 'التواصل',
    deleteAccount: 'حذف الحساب',
    lightMode: 'المظهر الفاتح',
    darkMode: 'المظهر الداكن',
    language: 'اللغة',

    // Games
    playNow: 'العب الآن',
    onlinePlayers: 'متصل الآن',
    comingSoon: 'قريباً',

    // Common
    loading: 'جاري التحميل',
    error: 'خطأ',
    success: 'نجاح',
    cancel: 'إلغاء',
    confirm: 'تأكيد',
    save: 'حفظ',
    back: 'رجوع',
    next: 'التالي',

    // Betting
    selectBet: 'اختر مبلغ الرهان',
    minimumBet: 'الحد الأدنى',
    maximumBet: 'الحد الأقصى',

    // Match
    waiting: 'في الانتظار',
    searching: 'جاري البحث عن خصم',
    matchFound: 'تم العثور على خصم',
    yourTurn: 'دورك',
    opponentTurn: 'دور الخصم',

    // Results
    youWon: 'فزت',
    youLost: 'خسرت',
    draw: 'تعادل',
    prize: 'الجائزة',

    // Disconnect
    disconnected: 'انقطع الاتصال',
    reconnecting: 'جاري إعادة الاتصال',
    timeLeft: 'الوقت المتبقي',

    // Exit Dialog
    exitMatch: 'الخروج من المباراة',
    exitWarning: 'الخروج يعني الاستسلام وخسارة المباراة',
    stayInMatch: 'البقاء في المباراة',
    confirmExit: 'نعم، الخروج والاستسلام'
  },
  en: {
    // Navigation
    home: 'Home',
    games: 'Games',
    deposit: 'Deposit',
    withdraw: 'Withdraw',
    referral: 'Referral',
    login: 'Login',
    signup: 'Sign Up',
    logout: 'Logout',

    // User Menu
    balance: 'Balance',
    adminPanel: 'Admin Panel',
    contact: 'Contact',
    deleteAccount: 'Delete Account',
    lightMode: 'Light Mode',
    darkMode: 'Dark Mode',
    language: 'Language',

    // Games
    playNow: 'Play Now',
    onlinePlayers: 'Online Now',
    comingSoon: 'Coming Soon',

    // Common
    loading: 'Loading',
    error: 'Error',
    success: 'Success',
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    back: 'Back',
    next: 'Next',

    // Betting
    selectBet: 'Select Bet Amount',
    minimumBet: 'Minimum',
    maximumBet: 'Maximum',

    // Match
    waiting: 'Waiting',
    searching: 'Searching for opponent',
    matchFound: 'Match Found',
    yourTurn: 'Your Turn',
    opponentTurn: 'Opponent Turn',

    // Results
    youWon: 'You Won',
    youLost: 'You Lost',
    draw: 'Draw',
    prize: 'Prize',

    // Disconnect
    disconnected: 'Disconnected',
    reconnecting: 'Reconnecting',
    timeLeft: 'Time Left',

    // Exit Dialog
    exitMatch: 'Exit Match',
    exitWarning: 'Exiting means surrender and losing the match',
    stayInMatch: 'Stay in Match',
    confirmExit: 'Yes, Exit and Surrender'
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved === 'en' || saved === 'ar') ? saved : 'ar';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['ar']] || key;
  };

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const dir = language === 'ar' ? 'rtl' : 'ltr';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
