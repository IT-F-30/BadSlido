import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Montserrat } from 'next/font/google';
import './globals.css';

const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat' });

export const metadata: Metadata = {
    title: 'Network Word Cloud',
    description: 'Server-rendered word cloud backed by MongoDB',
};

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="ja">
            <body className={montserrat.className}>{children}</body>
        </html>
    );
}
