import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms & Conditions" };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-xs font-bold uppercase tracking-wide text-brand">Legal</p>
      <h1 className="mt-1 text-3xl font-extrabold text-stone-900">Terms & Conditions</h1>
      <p className="mt-2 text-sm text-stone-400">Last updated: September 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-stone-600">
        <div>
          <h2 className="text-base font-bold text-stone-900">1. About Car Connect</h2>
          <p className="mt-1">
            Car Connect is a marketplace that helps customers discover used cars listed by dealers and
            lets customers offer their own car for sale to nearby verified dealers. It is not a
            dealer-to-dealer marketplace and does not host auctions or bidding.
          </p>
        </div>
        <div>
          <h2 className="text-base font-bold text-stone-900">2. Roles</h2>
          <p className="mt-1">
            Car listings, their prices and condition are the responsibility of the listing dealer.
            Sell-your-car listings and offers are agreed directly between the customer and the dealer.
            Car Connect facilitates the connection; the actual sale is between the buyer and dealer.
          </p>
        </div>
        <div>
          <h2 className="text-base font-bold text-stone-900">3. Verification</h2>
          <p className="mt-1">
            A &quot;Verified Dealer&quot; badge means verification documents were reviewed and approved
            at the time of review. Vehicle condition, history or mechanical state are not guaranteed by
            Car Connect — always inspect the car and negotiate directly.
          </p>
        </div>
        <div>
          <h2 className="text-base font-bold text-stone-900">4. Acceptable use</h2>
          <p className="mt-1">
            You may not scrape the platform, submit false information, impersonate others, or use the
            service for any unlawful purpose. Dealers may not misrepresent vehicle details or
            verification status.
          </p>
        </div>
        <div>
          <h2 className="text-base font-bold text-stone-900">5. Liability</h2>
          <p className="mt-1">
            Car Connect is provided &quot;as is&quot;. To the maximum extent permitted by law, we are
            not liable for losses arising from transactions between users, vehicle condition, or
            reliance on AI recommendations.
          </p>
        </div>
      </div>
    </div>
  );
}