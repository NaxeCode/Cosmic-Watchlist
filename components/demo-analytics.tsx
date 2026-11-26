"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

function refreshAnalytics() {
  window.dispatchEvent(new Event("portfolio:navigation"));
}

export function DemoAnalytics() {
  const [production, setProduction] = useState(false);
  useEffect(() => {
    setProduction(location.origin === "https://watchlist.naxe.dev");
    return () => { window.dispatchEvent(new Event("portfolio:leave")); };
  }, []);
  if (!production || !process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) return null;
  return (
    <>
      <label hidden data-public-project="stargazers-cosmic-watchlist" data-analytics-preference="">
        <input type="checkbox" /> Allow Google Analytics
      </label>
      <Script src="https://naxe.dev/analytics/portfolio.js" referrerPolicy="no-referrer"
        strategy="afterInteractive" onReady={refreshAnalytics} />
    </>
  );
}
