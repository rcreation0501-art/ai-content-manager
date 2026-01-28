import { useState } from "react";
import {
    Calendar,
    Edit,
    Gift,
    Library,
    Home,
    LogOut,
    Shield,
    Sparkles,
    Clock,
    AlertTriangle,
    Crown,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { MilitaryLogo } from "./ui/ghost-logo";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarHeader,
    SidebarFooter,
} from "@/components/ui/sidebar";
import PricingModal from "./PricingModal";
// ✅ IMPORTED AT THE TOP TO PREVENT CRASHES
import { useSubscriptionStatus, getTrialDaysLeft } from "@/hooks/useSubscription";

const items = [
    { title: "Home", url: "/", icon: Home },
    { title: "Create Post", url: "/create-post", icon: Edit },
    { title: "Lead Magnet AI", url: "/lead-magnet", icon: Gift },
    { title: "Post Library", url: "/post-library", icon: Library },
    { title: "Content Calendar", url: "/content-calendar", icon: Calendar },
];

export function AppSidebar() {
    const location = useLocation();
    const navigate = useNavigate();
    const { tenant, user, userRole, loading, signOut } = useAuth();

    // 1. Hooks (Source of Truth)
    const subscriptionStatus = useSubscriptionStatus(user as any);
    const trialDays = getTrialDaysLeft(user as any);

    const [showPricing, setShowPricing] = useState(false);
    const [pricingMode, setPricingMode] = useState<'subscription' | 'credits'>('subscription');

    // 2. Logic (Derived)
    const isAdmin = userRole === 'admin' || user?.email === 'info@aiforfuture.tech';
    const isExpired = subscriptionStatus === 'expired';
    const isPro = subscriptionStatus === 'pro';
    const isTrial = subscriptionStatus === 'trial';

    const currentCredits = (user as any)?.credits || 0;

    // 3. Helper for Opening Modal
    const handleOpenPricing = (mode: 'subscription' | 'credits') => {
        setPricingMode(mode);
        setShowPricing(true);
    };

    const handleRestrictedClick = (e: any) => {
        if (!isAdmin && isExpired) {
            e.preventDefault();
            handleOpenPricing('subscription');
        }
    };

    const handleSignOut = async () => {
        await signOut();
        navigate("/login");
    };

    if (loading) return null;

    return (
        <>
            <Sidebar className="w-64 border-r border-border flex flex-col">
                <SidebarHeader className="p-6 border-b border-border">
                    <div className="flex items-center space-x-2">
                        <MilitaryLogo size="md" />
                        <div>
                            <h1 className="font-mono font-bold text-lg text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600">
                                Sasa AI
                            </h1>
                            <div className="flex items-center gap-2">
                                <p className="text-sm text-muted-foreground">CONTENT MANAGER</p>
                                {isAdmin && (
                                    <span className="bg-red-600/20 text-red-500 text-[10px] font-bold px-1.5 py-0.5 rounded border border-red-600/30">
                                        ADMIN
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </SidebarHeader>

                <SidebarContent className="flex-1">
                    <SidebarGroup>
                        <SidebarGroupLabel>NAVIGATION MATRIX</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {items.map((item) => (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={location.pathname === item.url}
                                            onClick={handleRestrictedClick}
                                            className={(!isAdmin && isExpired) ? "opacity-50 cursor-not-allowed" : ""}
                                        >
                                            <NavLink to={item.url} onClick={handleRestrictedClick}>
                                                <item.icon className="h-5 w-5" />
                                                <span>{item.title}</span>
                                            </NavLink>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}

                                {isAdmin && (
                                    <SidebarMenuItem>
                                        <SidebarMenuButton asChild className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 mt-4">
                                            <NavLink to="/admin">
                                                <Shield className="h-5 w-5" />
                                                <span className="font-bold">Admin Panel</span>
                                            </NavLink>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                )}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                </SidebarContent>

                <SidebarFooter className="p-4 space-y-4">
                    {/* ✨ STATUS WIDGET ✨ */}
                    {user && (
                        <div className={`px-4 py-3 rounded-xl border ${isAdmin ? 'bg-gradient-to-r from-red-900/40 to-black border-red-500/50' :
                            isExpired ? 'bg-red-500/10 border-red-500/50' :
                                'bg-gray-800 border-gray-700'
                            }`}>
                            {/* Header Row: Status Label & Icon */}
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    {isAdmin && <Crown size={14} className="text-yellow-500" />}
                                    {!isAdmin && isExpired && <AlertTriangle size={14} className="text-red-500" />}
                                    {!isAdmin && isPro && !isExpired && <Crown size={14} className="text-white" />}
                                    {!isAdmin && isTrial && !isExpired && <Clock size={14} className="text-green-400" />}

                                    <span className={`text-sm font-bold ${isExpired ? 'text-red-400' : 'text-white'}`}>
                                        {isAdmin ? 'Super Admin' :
                                            isExpired ? 'Expired' :
                                                isPro ? 'PRO MEMBER' :
                                                    'Free Trial'}
                                    </span>
                                </div>

                                {/* Trial Badge */}
                                {isTrial && !isExpired && !isAdmin && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                                        {trialDays} days left
                                    </span>
                                )}
                            </div>

                            {/* Credits Row (Hidden for Admin) */}
                            {!isAdmin && (
                                <div className="mt-2 pt-2 border-t border-gray-700/50">
                                    <div className="flex items-center justify-between text-xs mb-1.5">
                                        <span className="text-gray-400">Available Credits</span>
                                        <span className={`font-mono font-bold ${currentCredits === 0 ? 'text-red-400' : 'text-white'}`}>
                                            {currentCredits}
                                        </span>
                                    </div>

                                    <div className="w-full bg-gray-900/50 rounded-full h-1.5 overflow-hidden border border-gray-700/30">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${currentCredits === 0 ? 'bg-red-500' : 'bg-gradient-to-r from-blue-500 to-cyan-400'}`}
                                            style={{
                                                width: `${Math.min((currentCredits / 100) * 100, 100)}%`
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ACTION BUTTON */}
                    {!isAdmin && (
                        <>
                            {isExpired && (
                                <Button
                                    onClick={() => handleOpenPricing('subscription')}
                                    className="w-full text-white border-0 shadow-lg bg-red-600 hover:bg-red-700 animate-pulse"
                                >
                                    <Sparkles className="h-4 w-4 mr-2" />
                                    Reactivate Now
                                </Button>
                            )}
                            {!isExpired && isPro && (
                                <Button
                                    onClick={() => handleOpenPricing('credits')}
                                    className="w-full text-white border-0 shadow-lg bg-orange-500 hover:bg-orange-600"
                                >
                                    <Sparkles className="h-4 w-4 mr-2" />
                                    Add Credits
                                </Button>
                            )}
                            {!isExpired && isTrial && (
                                <Button
                                    onClick={() => handleOpenPricing('subscription')}
                                    className="w-full text-white border-0 shadow-lg bg-gradient-to-r from-blue-600 to-indigo-600"
                                >
                                    <Sparkles className="h-4 w-4 mr-2" />
                                    Upgrade to Pro
                                </Button>
                            )}
                        </>
                    )}

                    {tenant && (
                        <div>
                            <p className="text-xs text-muted-foreground">Workspace</p>
                            <p className="text-sm">{tenant.name}</p>
                        </div>
                    )}

                    {user && (
                        <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground truncate flex-1">{user.email}</p>
                            {isAdmin && <Shield size={12} className="text-red-500 ml-2" />}
                        </div>
                    )}

                    <Button onClick={handleSignOut} variant="outline" className="w-full justify-start">
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                    </Button>
                </SidebarFooter>
            </Sidebar>

            {showPricing && (
                <PricingModal
                    user={user}
                    initialMode={pricingMode} // ✅ Ensures the button opens the correct tab
                    onClose={() => !isExpired && setShowPricing(false)}
                />
            )}
        </>
    );
}