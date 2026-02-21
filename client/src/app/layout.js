import './globals.css';

export const metadata = {
    title: 'Server Dashboard | Proxmox Infrastructure Management',
    description: 'Enterprise infrastructure management dashboard for Proxmox VE clustering with real-time monitoring, VM management, and security controls.',
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
