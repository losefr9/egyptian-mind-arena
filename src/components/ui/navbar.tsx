import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from './button';
import { 
  User, 
  Home, 
  Gamepad2, 
  Wallet, 
  CreditCard,
  LogOut,
  Trash2,
  Mail
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";

interface NavbarProps {
  isLoggedIn?: boolean;
  username?: string;
  balance?: number;
}

export const Navbar = ({ isLoggedIn = false, username = "محمد أحمد", balance = 1250.50 }: NavbarProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handlePageChange = (page: string) => {
    navigate(page === 'home' ? '/' : `/${page}`);
  };

  return (
    <nav className="bg-card border-b border-border shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* الشعار */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                العقل المصري
              </h1>
            </div>
          </div>

          {/* روابط التنقل */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4 space-x-reverse">
              <Button
                variant={location.pathname === '/' ? 'golden' : 'ghost'}
                size="sm"
                onClick={() => handlePageChange('home')}
                className="flex items-center gap-2"
              >
                <Home size={16} />
                الرئيسية
              </Button>
              
              <Button
                variant={location.pathname === '/games' ? 'golden' : 'ghost'}
                size="sm"
                onClick={() => handlePageChange('games')}
                className="flex items-center gap-2"
              >
                <Gamepad2 size={16} />
                الألعاب
              </Button>
              
              <Button
                variant={location.pathname === '/deposit' ? 'golden' : 'ghost'}
                size="sm"
                onClick={() => handlePageChange('deposit')}
                className="flex items-center gap-2"
              >
                <Wallet size={16} />
                الإيداع
              </Button>
              
              <Button
                variant={location.pathname === '/withdraw' ? 'golden' : 'ghost'}
                size="sm"
                onClick={() => handlePageChange('withdraw')}
                className="flex items-center gap-2"
              >
                <CreditCard size={16} />
                السحب
              </Button>
            </div>
          </div>

          {/* منطقة المستخدم */}
          <div className="flex items-center space-x-4 space-x-reverse">
            {!isLoggedIn ? (
              <div className="flex space-x-2 space-x-reverse">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handlePageChange('login')}
                >
                  تسجيل الدخول
                </Button>
                <Button 
                  variant="golden" 
                  size="sm"
                  onClick={() => handlePageChange('signup')}
                >
                  إنشاء حساب
                </Button>
              </div>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 h-10">
                    <User size={16} />
                    <span>{username}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{username}</p>
                      <p className="text-xs text-muted-foreground">
                        الرصيد: {balance.toFixed(2)} ج.م
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-sm">
                    <Mail className="mr-2 h-4 w-4" />
                    <span>التواصل: support@egyptianmind.com</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-destructive cursor-pointer"
                    onClick={() => console.log('تسجيل خروج')}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>تسجيل الخروج</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-destructive cursor-pointer"
                    onClick={() => console.log('حذف الحساب')}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>حذف الحساب</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};