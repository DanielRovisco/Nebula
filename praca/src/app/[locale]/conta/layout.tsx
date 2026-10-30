import { AccountTabs } from "@/components/account/account-tabs";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AccountTabs />
      {children}
    </>
  );
}
