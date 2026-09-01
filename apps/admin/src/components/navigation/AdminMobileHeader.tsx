"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { ADMIN_NAV_ITEMS } from "./sidebarConfig";
import { SignOutButton } from "./SignOutButton";

export function AdminMobileHeader({
  userEmail,
}: {
  userEmail?: string | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  // Tracks which route the menu was opened on, so navigating away closes it
  // without an effect that would set state as a side effect of the pathname
  // simply changing.
  const [openAtPathname, setOpenAtPathname] = useState(pathname);
  const effectiveIsOpen = isOpen && openAtPathname === pathname;
  const menuRef = useRef<HTMLDivElement>(null);

  function toggleOpen() {
    setIsOpen((v) => !v);
    setOpenAtPathname(pathname);
  }

  function close() {
    setIsOpen(false);
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        close();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    document.body.style.overflow = effectiveIsOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [effectiveIsOpen]);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between border-b border-white/5 bg-[#121212] px-4 lg:hidden">
        <Link href="/analytics" className="flex items-center">
          <Image
            src="/Neko.svg"
            alt="Neko"
            width={32}
            height={32}
            className="h-7 w-auto"
          />
        </Link>
        <button
          type="button"
          onClick={toggleOpen}
          aria-label="Toggle menu"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-white transition-colors hover:bg-white/10"
        >
          {effectiveIsOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </header>

      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          effectiveIsOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        aria-hidden="true"
        onClick={close}
      />

      <div
        ref={menuRef}
        className={`fixed top-16 right-0 left-0 z-50 overflow-hidden border-b border-white/5 bg-[#121212] transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] lg:hidden ${
          effectiveIsOpen
            ? "translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-2 opacity-0"
        }`}
      >
        <div className="flex flex-col gap-2 px-4 py-6">
          {ADMIN_NAV_ITEMS.map(({ label, href, icon: Icon }) => {
            const active =
              pathname === href || pathname?.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-4 rounded-2xl px-4 py-4 text-base font-medium transition-colors duration-150 ${
                  active ? "text-white" : "text-white/35 hover:text-white/65"
                }`}
                style={active ? { background: "#222222" } : undefined}
              >
                <Icon
                  className={`h-5 w-5 shrink-0 ${
                    active ? "text-white" : "text-white/35"
                  }`}
                />
                {label}
              </Link>
            );
          })}
          <div className="mt-2 flex items-center justify-between gap-2 border-t border-white/5 pt-4">
            <span className="min-w-0 truncate text-sm text-white/50">
              {userEmail}
            </span>
            <SignOutButton />
          </div>
        </div>
      </div>
    </>
  );
}
