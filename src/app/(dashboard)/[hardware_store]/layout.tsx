import { NavbarDashboard } from "../(components)/navbar/navbar"


export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <main className="relative">
            <NavbarDashboard></NavbarDashboard>
            {children}
        </main>
    )
}